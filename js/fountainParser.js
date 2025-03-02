export function parseFountain(script) {
    const lines = script.split(/\r?\n/);
    let tokens = [];
    let inBoneyard = false;
    let boneyardBuffer = [];
    let coverPageBuffer = [];
    let encounteredSceneHeading = false;

    const titleKeys = ["title:", "credit:", "author:", "authors:", "source:", "notes:", "draft date:", "date:", "contact:", "copyright:"];
    const isTitlePageLine = (line) => titleKeys.some(key => line.toLowerCase().startsWith(key));

    for (let i = 0; i < lines.length; i++) {
        let line = lines[i];
        let trimmed = line.trim();
        if (trimmed === "") continue;

        // Boneyard handling.
        if (!inBoneyard && trimmed.startsWith("/*")) {
            inBoneyard = true;
            boneyardBuffer = [];
            if (trimmed.endsWith("*/")) {
                const content = trimmed.slice(2, -2).trim();
                tokens.push({ type: "BONEYARD", text: content });
                inBoneyard = false;
            }
            continue;
        }
        if (inBoneyard) {
            if (trimmed.endsWith("*/")) {
                boneyardBuffer.push(trimmed.slice(0, -2).trim());
                tokens.push({ type: "BONEYARD", text: boneyardBuffer.join(" ") });
                inBoneyard = false;
            } else {
                boneyardBuffer.push(trimmed);
            }
            continue;
        }

        if (isTitlePageLine(trimmed)) {
            continue;
        }

        if (!encounteredSceneHeading) {
            if (/^\.[A-Za-z0-9]/.test(trimmed)) {
                encounteredSceneHeading = true;
                coverPageBuffer = [];
                tokens.push({ type: "SCENE_HEADING", text: trimmed.slice(1).trim() });
                continue;
            }
            if (/^(INT\.|EXT\.|EST\.|INT\/EXT|I\/E)/i.test(trimmed)) {
                encounteredSceneHeading = true;
                coverPageBuffer = [];
                tokens.push({ type: "SCENE_HEADING", text: trimmed });
                continue;
            }
            coverPageBuffer.push(trimmed);
            continue;
        }

        if (/^#{1,}\s/.test(trimmed)) {
            const depth = trimmed.match(/^(#+)/)[0].length;
            const text = trimmed.replace(/^#+\s*/, "");
            tokens.push({ type: "SECTION", depth, text });
            continue;
        }
        if (/^\(.*\)$/.test(trimmed)) {
            tokens.push({ type: "PARENTHETICAL", text: trimmed });
            continue;
        }
        if (/^>.*<$/i.test(trimmed)) {
            tokens.push({ type: "CENTERED", text: trimmed.slice(1, -1).trim() });
            continue;
        }
        if (/\sTO:\s*$/i.test(trimmed)) {
            tokens.push({ type: "TRANSITION", text: trimmed });
            continue;
        }
        if (/^~/.test(trimmed)) {
            tokens.push({ type: "LYRIC", text: trimmed.slice(1).trim() });
            continue;
        }
        if (trimmed.startsWith("!")) {
            tokens.push({ type: "ACTION", text: trimmed.substring(1).trim() });
            continue;
        }
        if (trimmed.startsWith("@")) {
            tokens.push({ type: "CHARACTER", text: trimmed.substring(1).trim() });
            continue;
        }
        if (trimmed === trimmed.toUpperCase() && /[A-Z]/.test(trimmed)) {
            if (trimmed.endsWith("^")) {
                tokens.push({ type: "DUAL_CHARACTER", text: trimmed.slice(0, -1).trim() });
                continue;
            } else {
                tokens.push({ type: "CHARACTER", text: trimmed });
                continue;
            }
        }
        tokens.push({ type: "DIALOGUE", text: trimmed });
    }

    const mergedTokens = [];
    for (let i = 0; i < tokens.length; i++) {
        let token = tokens[i];
        if (token.type === "DUAL_CHARACTER") {
            if (i + 1 < tokens.length && tokens[i + 1].type === "DIALOGUE") {
                mergedTokens.push({
                    type: "DUAL_DIALOGUE",
                    text: token.text + " / " + tokens[i + 1].text
                });
                i++;
            } else {
                mergedTokens.push({ type: "DUAL_DIALOGUE", text: token.text });
            }
        } else {
            if (token.type === "BONEYARD") continue;
            mergedTokens.push(token);
        }
    }
    return mergedTokens;
}
