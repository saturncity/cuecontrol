# CueControl v2 specification

Status: agreed design, nothing implemented. Written 2026-09-14 after a full read
of the 2025-03-02 HackLondon prototype.

Scope decision that drives everything else: this has to be usable by a working
stage manager calling a real show, not demoable for a portfolio.

---

## 1. What it is

A digital prompt book. You load a screenplay or script in Fountain format, mark
cues on the words they're called on, and call the show from it. Cues fire out
over MIDI Show Control and OSC, so a lighting desk or QLab receives the GO at
the moment the stage manager presses it.

It is both a book and a sender. The book works standalone in any browser. The
sender needs the local bridge for OSC and a MIDI-capable browser for MSC.

---

## 2. Architecture

Two pieces, one download.

**`bridge.js`** is a single Node file with no dependencies. It uses `node:http`
to serve the static app on `http://localhost:8765`, and `node:dgram` to relay
OSC out over UDP. Node 18 is the floor, since nothing in it needs anything
newer.

**The app** is static HTML, CSS and ES modules. No build step, no bundler, no
dependencies.

Serving the app from the bridge's own origin solves three problems at once:

- `localhost` is a secure context, so Web MIDI works
- No mixed content, because there's no HTTPS page reaching an HTTP port
- No Private Network Access preflight, which Chrome has shipped and unshipped
  more than once and is not worth building against

The app detects the bridge by origin rather than being configured for it. Served
from `localhost:8765`, OSC is available. Served from anywhere else, OSC is
disabled with a line saying it needs the bridge.

### Browser support

| Browser | Prompt book | Web MIDI (MSC) | OSC (via bridge) |
|---|---|---|---|
| Chrome, Edge | Yes | Yes | Yes |
| Firefox 108+ | Yes | Yes, with site permission | Yes |
| Safari | Yes | No, no Web MIDI support | Yes |

Safari gets the book with the MIDI path disabled and an explicit message. It
never silently no-ops.

### macOS setup note

MIDI from a browser reaches QLab on the same machine only through a virtual
port. Audio MIDI Setup, IAC Driver, tick Device is online. Without it the app
looks broken when it isn't, so this goes in the README as a prerequisite rather
than a footnote.

---

## 3. Project file format

A project is one `.fountain` file. Everything the app knows lives inside it as
boneyard comments, which are part of the Fountain spec and are ignored by every
other Fountain tool. The script stays a valid script.

The data is **split**, deliberately:

- **One header block** at the top of the file: project name, format version,
  tile layout, department table, standby and warning depths, act boundaries.
- **Per-line blocks** immediately after the line they annotate: that line's
  cues and recorded timings.

The reason for the split is what happens when the director cuts a page. A
per-line block physically travels with its line through an edit in any editor.
A header that referenced cues by line index would silently point at the wrong
lines after one cut, which is the worst failure mode available: it looks fine
and it's wrong.

### Header block

```
/*CUECONTROL
{
  "version": 1,
  "name": "Twelfth Night",
  "standbyDepth": 1,
  "warningDepth": 0,
  "layout": [
    { "type": "ScriptFollow", "row": 0, "col": 0, "w": 2, "h": 3 },
    { "type": "PromptDisplay", "row": 0, "col": 2, "w": 2, "h": 1 },
    { "type": "TimerDisplay",  "row": 1, "col": 2, "w": 1, "h": 1 },
    { "type": "CueLog",        "row": 1, "col": 3, "w": 1, "h": 2 }
  ],
  "departments": [
    { "prefix": "LX", "transport": "osc",
      "host": "192.168.1.40", "port": 53000,
      "address": "/cue/{number}/go" },
    { "prefix": "SQ", "transport": "midi",
      "portName": "IAC Driver Bus 1", "deviceId": 3 }
  ],
  "acts": [ { "name": "Act One", "startIndex": 0 } ]
}
*/
```

### Per-line block

```
JOHN
The rest is silence.

/*{"cues":[{"word":3,"label":"LX 12"}],"intervals":[1840,2210],"duration":4050}*/
```

`version` exists for migration. There are no v0 files in the wild: the old app
posted to a server that never existed, so nothing was ever written. The field is
there because this shape will change.

---

## 4. Cue model

### Placement is word-level

A cue stores a **word index**, not a character offset. Click a word, the cue
attaches to that word.

The prototype stored a character offset and located it by measuring
`measureText("M")` from the paragraph's left edge. That is wrong for every
indented type, because `.dialogue` and `.parenthetical` carry a `margin-left`;
wrong for every line that wraps, because only the X coordinate is considered;
and it goes stale the moment a tile is resized.

Word indices survive reflow, resize and indentation. Precision within a word is
not something a stage manager needs. Precision to the word is exactly what they
need, and it's how a book is marked by hand: GO on "silence".

Rendering wraps each word in a span at render time, which also removes the
prototype's habit of overwriting the character at the cue position, and its
display of a cue on a space as an underscore.

### Labels parse liberally

A department table entry defines a prefix. Whatever follows is the cue number.

Accepted: `LX 12`, `LX Q12`, `LX12.5`, `Sound 3`, `SQ Q7.5`

**Decimals are mandatory, not a nicety.** When a cue has to be inserted between
12 and 13 during tech, nobody renumbers the show. It's called 12.5. A parser
that can't read a decimal fails on a real prompt book inside the first week.

One implementation trap worth naming here: cue numbers sort numerically, never
as strings. Under a string compare `12.5` sorts before `12` and the cue list
comes out in the wrong order with no error.

A label that matches no department prefix stays a visual-only cue. It's called
verbally, fires nothing, and renders differently so the stage manager can see at
a glance which of their marks will actually send.

---

## 5. Calling the show

### Warning, standby, go

Three steps, with warning off by default.

US practice commonly runs all three: a warning about a minute out, a standby
fifteen to thirty seconds out, then the go. UK practice more commonly runs
standby and go only. Two configurable depths cover both traditions without the
app being opinionated about either, and the default of standby-only means a UK
DSM never has to turn anything off.

Both are lookahead depths measured in lines. `warningDepth: 0` disables
warnings.

### The word GO

GO always comes last, and it is never spoken in any other context on headset.
This is a rule with no exceptions and it constrains UI copy.

- Correct: `LX 12, standby` then `LX 12, GO`
- Wrong: `Go on LX 12`, `Ready to go`, `Go when ready`

A button labeled Go is fine, because nobody speaks a button.

### Space is GO

Each press of Space fires the next pending cue on the current line. When the
line's cues are exhausted, the next press advances to the next line. That's the
model the prototype already implied with its `cueCount + 1` press count, and it's
the muscle memory the whole design was built around.

The pending count must be **visible**. In the prototype it existed only in a
`console.log`, which means the one piece of state the operator needs most was
invisible to them.

---

## 6. Theatre conventions, normative

These are not style preferences. Getting them wrong makes the tool wrong.

| Convention | Rule |
|---|---|
| Cue light colors | Red is standby. Green is go. Amber is warning. |
| The word GO | Last in the phrase, never used otherwise |
| Point cues | `12.5` is standard practice, not an edge case |
| Department prefixes | Configurable. UK writes LX and SQ, US writes Lights and Sound |
| Cue written form | `LX 12` and `LX Q12` both occur |
| Running time | Recorded per act, not as one continuous clock |

The color convention matters more than it looks. Cue lights are physical
hardware hanging over a fly rail, and red-means-standby is burned in for anyone
who has worked backstage. Red meaning "recording" in this app would collide with
the strongest color association in the building.

Record mode therefore drops its red dot and becomes a word. It's a
rehearsal-only state and nobody watches it in peripheral vision.

---

## 7. Clock

Act-based running time. The clock splits at each interval and keeps a per-act
figure alongside the total. Act running times are what a stage manager writes on
the show report every night, and a single continuous stopwatch cannot produce
them.

Pre-show call countdowns are out of scope. The half, the quarter, the five and
beginners are given from a clock on the wall. Building a second timer mode for
the twenty minutes before curtain is scope that doesn't touch the two hours that
matter.

The prototype's clock drifts: it runs `setInterval(fn, 10)` and adds exactly 10ms
each tick, and browsers do not honor a 10ms interval. Time comes from
`performance.now()` deltas instead.

---

## 8. Keyboard

All bindings live in one `js/keymap.js`. Modules subscribe. There is exactly one
`window` keydown listener in the app.

The prototype bound keys on `window` in two modules that fought each other:
`r` was handled in both `scriptFollow.js:268` and `timerDisplay.js:25`, and which
one won depended on the order the tiles were placed. Every additional ScriptFollow
tile stacked another listener, so two tiles meant every keypress fired twice.

Handlers no-op when focus is in an input, a textarea, or anything contenteditable.

| Key | Action |
|---|---|
| Space | GO |
| Up, Down | Previous line, next line |
| S | Start or stop the act clock |
| P | Pause or resume the act clock |
| N | Next act, splits the running time |
| R | Toggle record mode |
| Cmd/Ctrl + Shift + R | Reset the show, with confirmation |

Reset moves off a bare letter deliberately. In the prototype a single `r`
silently wiped the show timer. Brushing the keyboard forty minutes into act one
would have destroyed the running time with no confirmation and no undo.

---

## 9. Persistence

Auto-save to `localStorage` on every change, keyed by project id. Export and
import as `.fountain` for portability and backup.

A stage manager who spends two hours marking a book and loses it to an
accidental Cmd-R does not open the tool again. Auto-save is what prevents that.
Export is what lets them carry the book to another machine or hand it to the ASM.

Tile layout persists the same way, so the panel built on Monday is there on
Tuesday.

Sizing: a full-length play is roughly 150KB of text, so a handful of shows sits
well inside the 5MB `localStorage` quota. It is not unlimited. A company with
thirty archived shows would hit the wall, and that is not the failure mode worth
building for yet.

### Export must not corrupt the script

The prototype's exporter rebuilt the file from `p.textContent`
(`scriptFollow.js:286`), which drops every Fountain syntax marker: the `.` on
forced scene headings, the `~` on lyrics, the `@` on forced characters, the
`> <` on centered text, and the entire title page. Exporting once corrupted the
script.

The exporter re-emits from the parsed token type, not from rendered text. This
is the difference between a backup and a shredder, and it has to be right
regardless of anything else in this document.

---

## 10. Launcher

A startup window in the shape of QLab's: recent projects, New, Open. QLab-likeness
is scoped to the launcher and does not propagate into the grid.

Each row shows project name, last opened, and cue count. Actions are New, Open
and Delete.

One constraint shapes this: **a web page cannot reopen a file by path.** There is
no way to store `/Users/you/show.fountain` and load it next launch without the
user picking it again. So projects live in browser storage. A `.fountain` file is
imported once and is a project from then on, opening instantly. Export writes it
back out.

---

## 11. Tiles

| Tile | Sizes | Status |
|---|---|---|
| ScriptFollow | 2x2, 2x3 | Keep. The book. |
| PromptDisplay | 2x1 | Keep, rebuild. Warning, standby and go strip. |
| TimerDisplay | 1x1 | Keep, rebuild as act clock. |
| LiveFeed | 1x1, 2x1 | Keep as stage view. Must stop tracks on delete. |
| CueLog | 1x1, 2x1 | New. Append-only record of fired cues. |
| Status strip | fixed | New. MIDI state, bridge state, pending cue count. |
| AudioLevelMonitor | n/a | **Delete.** A mic spectrum analyzer pointed at the SM's own laptop has no use in this workflow. Removes 100 lines and one of the two resource leaks. |
| CueListDisplay | n/a | **Open, see section 14.** |

`ScriptFollow` and `ScriptFollow2x3` are currently distinct types that both
create `id="script-container"`. Placing both produces duplicate IDs. Size becomes
an attribute of one type rather than two types.

### Operator safety

UDP is fire and forget. The bridge can die. A MIDI interface can be unplugged
between the tech and the half. A stage manager who presses GO and sees nothing
happen has about four seconds to decide whether to call it again.

So: a persistent connection indicator for MIDI and for the bridge, red the
moment either drops. And an append-only cue log of `{time, label, transport,
target}`, visible in a tile and exported with the project. The log is the only
evidence anyone will have after a show where something didn't fire.

---

## 12. Visual design

Dark console. Near-black ground, panels lifted one step in grey rather than
inverted to white, hairline visible grid, monospace throughout.

The prototype is white panels on a black page. A stage manager works in a dark
booth or on a dark deck with their night vision intact, and a white panel is a
flashlight in the face.

Two concrete bugs fold in here. `css/grid.css:35` sets `border: 1px solid black`
on cells whose background is also black, so the grid is invisible and all you see
is a field of white `+` signs. And JetBrains Mono loads from the Google Fonts CDN
at `index.html:8`, so a booth machine without network silently falls back to the
system monospace and the whole layout shifts. The font gets self-hosted.

`index.html:11` loads `apis.google.com/js/api.js`, which nothing uses. It goes.

Color roles follow section 6: red standby, green go, amber warning. The selected
line highlight tones down from the current `rgba(255, 255, 0, 0.3)`.

---

## 13. Defect ledger

Carried from a full read of the prototype. Fix column means fix before release.

| # | Defect | Location | Action |
|---|---|---|---|
| 1 | App is dead on load. Fetches `localhost:3000/fountain`, no server exists, body is replaced with a red error every time | `script.js:7`, `fileManager.js:10` | Fix. Blocker. |
| 2 | Imports `./totalTime.js`, which does not exist | `cueListDisplay.js:2` | Fix or delete, see 14 |
| 3 | `promptDisplay` treats `window.currentSelectIndex` (a pointer into `selectableIndices`) as a `data-index`, reading the wrong paragraph. Also renders once and never updates | `promptDisplay.js:43` | Fix. Rebuild. |
| 4 | Export drops Fountain syntax markers, corrupting the script | `scriptFollow.js:286` | Fix. Section 9. |
| 5 | Camera stream never stopped on delete. Webcam light stays on until the tab closes | `liveFeed.js:11` | Fix |
| 6 | `requestAnimationFrame` loop runs forever on a detached canvas; `AudioContext` never closed; canvas reallocated every frame | `audioLevelMonitor.js:45` | Moot, module deleted |
| 7 | Deleted timer tiles stay in `window.timerModuleElements` forever | `timerDisplay.js:74` | Fix |
| 8 | Key handlers collide and stack | `scriptFollow.js:206`, `timerDisplay.js:18` | Fix. Section 8. |
| 9 | Timer drifts on `setInterval(fn, 10)` | `timerDisplay.js:33` | Fix. Section 7. |
| 10 | Script rendered via `innerHTML`, so `<` or `&` in a script becomes markup | `scriptFollow.js:139` | Fix |
| 11 | Cue placement measures from the paragraph edge, ignoring indent and wrapping | `scriptFollow.js:164` | Fix. Section 4. |
| 12 | Duplicate `id="script-container"` across two tile types | `grid.js:56` | Fix |
| 13 | Unused Google API script tag | `index.html:11` | Fix |
| 14 | Reads `#script-container` before any module exists, always null | `grid.js:299` | Delete line |
| 15 | `alert()` used for user-facing errors | `grid.js:147` | Fix |
| 16 | `.idea/` tracked, no root `.gitignore` | repo | Fix |
| 17 | Title says CueCommander, repo says cuecontrol, `.iml` says CueControl | `index.html:6` | Fix. Name is CueControl. |
| 18 | `window.recordingData` written, never read | `scriptFollow.js:236` | Delete or wire into cue log |
| 19 | No move or resize of placed tiles | `grid.js` | Document. Placement plus persistence covers the need. |

---

## 14. Open item

**CueListDisplay.** It's dead code that imports a file which doesn't exist, so it
has never run. But a cue synopsis is a real theatre document, and it's different
from the CueLog: a synopsis lists cues that are *planned*, a log records cues that
*fired*.

Recommendation: keep it as the cue synopsis tile, sharing the department parser
with the send path, sorted numerically. Confirm or cut.

---

## 15. Distribution

**GitHub Release zip.** Static files plus `bridge.js`. Download, run
`node bridge.js`, open `http://localhost:8765`. Full app, both transports.
Node 18 or later.

**GitHub Pages.** The look-without-installing version. Full prompt book, Web MIDI
where the browser supports it, OSC disabled with an explanation.

Two audiences wanting different things: someone assessing the project clicks the
Pages link, someone running a show downloads the zip.

---

## 16. Repo

- Visibility: public
- Name: CueControl, repo `saturncity/cuecontrol`
- License: MIT, Copyright (c) 2025 Jason Lenz

Description, 97 characters:

> A cue-calling prompt book for stage managers that fires lighting and sound cues over MIDI and OSC

Topics: `stage-management`, `show-control`, `osc`, `javascript`

Checked against GitHub's repo counts: `stage-management` 23, `show-control` 52,
`osc` 1130, `javascript` very large. `midi-show-control` was the first proposal
and has a single repo under it, so it would have been a dead end.

```
gh repo edit --description "A cue-calling prompt book for stage managers that fires lighting and sound cues over MIDI and OSC" --add-topic theatre,stage-management,osc,midi-show-control,qlab
```

---

## 17. Out of scope

- OSC over anything but the local bridge
- Pre-show call countdowns
- Drag to move and resize handles on tiles
- Per-cue transport overrides. The department table covers it until a cue proves
  otherwise.
- File System Access API. Chrome and Edge only, and it collides with Safari
  support.
- Standby acknowledgement tracking. There is no return channel from a department
  over UDP.

---

## 18. Privacy sweep

Run over the full history as a diff, plus author identity, deleted files and
tracked filenames. Clean. One author, the repo owner's own name and address. No
keys, no tokens, no phone numbers, no social URLs, no location data, no deleted
files. Nothing to remediate before going public.
