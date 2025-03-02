// js/scriptFollow.js

import { parseFountain } from "./fountainParser.js";
import { ensureAnnotationsForAll, updateLineAnnotation, readLineAnnotation } from "./annotationManager.js";
import { updateFountainFile } from "./fileManager.js";

// Global recording state (initialize once)
if (window.recordingData === undefined) {
    window.recordingData = {};         // Stores total durations for selectable lines.
    window.recordingActive = false;      // Record mode flag.
    window.lineStartTime = null;         // Timestamp when the current line timing started.
    window.currentSelectIndex = 0;       // Global current selected line index.
}

let currentLinePressCount = 0;
let selectableIndices = [];
let currentSelectIndex = 0;

export function scriptFollow(moduleEl) {
    console.log("Script Follow initialized:", moduleEl.id);

    // Create the script container.
    const container = document.createElement("div");
    container.classList.add("script-container");
    container.id = "script-container";
    container.style.overflowY = "hidden"; // Disable native scroll bar.
    container.style.height = "100%";
    moduleEl.innerHTML = "";
    moduleEl.appendChild(container);

    // Create a recording indicator (red circle in the top right).
    const recIndicator = document.createElement("div");
    recIndicator.classList.add("recording-indicator");
    recIndicator.style.position = "absolute";
    recIndicator.style.top = "5px";
    recIndicator.style.right = "5px";
    recIndicator.style.width = "10px";
    recIndicator.style.height = "10px";
    recIndicator.style.borderRadius = "50%";
    recIndicator.style.backgroundColor = "red";
    recIndicator.style.display = "none";
    moduleEl.appendChild(recIndicator);

    let components = [];

    if (!window.fountainText) {
        container.textContent = "No Fountain file loaded.";
        return;
    }

    // Parse the Fountain text into components.
    components = parseFountain(window.fountainText);
    renderComponents();
    ensureAnnotationsForAll(container);
    updateSelectableIndices();
    refreshScriptDisplay();

    if (selectableIndices.length > 0) {
        currentSelectIndex = 0;
        window.currentSelectIndex = currentSelectIndex;
        updateSelection();
    }

    // Render each paragraph and store its original text.
    function renderComponents() {
        container.innerHTML = "";
        components.forEach((comp, idx) => {
            const p = document.createElement("p");
            p.dataset.index = idx;
            p.dataset.type = comp.type;
            p.dataset.originalText = comp.text; // Save original text.
            // Apply formatting based on type.
            switch (comp.type) {
                case "SCENE_HEADING":
                    p.classList.add("scene-heading");
                    break;
                case "TRANSITION":
                    p.classList.add("transition");
                    break;
                case "CENTERED":
                    p.classList.add("centered");
                    break;
                case "PARENTHETICAL":
                    p.classList.add("parenthetical");
                    break;
                case "DIALOGUE":
                    p.classList.add("dialogue");
                    break;
                case "LYRIC":
                    p.classList.add("lyric");
                    break;
                case "CHARACTER":
                    p.classList.add("character");
                    break;
                case "SECTION":
                    p.classList.add("section");
                    break;
                default:
                    p.classList.add("action");
                    p.dataset.type = "ACTION";
            }
            p.textContent = comp.text;
            container.appendChild(p);
        });
    }

    function updateSelectableIndices() {
        selectableIndices = [];
        components.forEach((comp, idx) => {
            // Only these types are selectable.
            if (["DIALOGUE", "ACTION", "LYRIC", "PARENTHETICAL"].includes(comp.type)) {
                selectableIndices.push(idx);
            }
        });
        console.log("Selectable indices:", selectableIndices);
    }

    // Refresh the display of each paragraph, inserting cue highlights if cues exist.
    function refreshScriptDisplay() {
        const paragraphs = container.querySelectorAll("p[data-index]");
        paragraphs.forEach(p => {
            const original = p.dataset.originalText;
            const annotation = readLineAnnotation(container, p.dataset.index) || {};
            let result = original;
            if (annotation.cues && Array.isArray(annotation.cues) && annotation.cues.length > 0) {
                const sortedCues = annotation.cues.slice().sort((a, b) => a.location - b.location);
                let lastIdx = 0;
                result = "";
                sortedCues.forEach(cue => {
                    let pos = Math.min(cue.location, original.length);
                    result += original.substring(lastIdx, pos);
                    let ch = original.charAt(pos);
                    if (ch === " ") ch = "_";
                    result += `<span class="cue-highlight" data-location="${pos}" style="color:green; cursor:pointer;" title="Cue: ${cue.label}">${ch}</span>`;
                    lastIdx = pos + 1;
                });
                result += original.substring(lastIdx);
            }
            p.innerHTML = result;
            // Attach click listeners to existing cue highlights for editing.
            p.querySelectorAll(".cue-highlight").forEach(el => {
                el.addEventListener("click", (evt) => {
                    evt.stopPropagation();
                    const pos = Number(el.dataset.location);
                    const currentAnnotation = readLineAnnotation(container, p.dataset.index) || {};
                    let cues = Array.isArray(currentAnnotation.cues) ? currentAnnotation.cues : [];
                    const existingCue = cues.find(c => c.location === pos) || { location: pos, label: "" };
                    const newLabel = prompt("Edit cue label:", existingCue.label);
                    if (newLabel && newLabel !== existingCue.label) {
                        updateLineAnnotation(container, p.dataset.index, { cue: { location: pos, label: newLabel } });
                        refreshScriptDisplay();
                    }
                });
            });
        });
    }

    // Add a new cue when clicking on the selected line (but not on an existing cue highlight).
    container.addEventListener("click", (e) => {
        const p = e.target.closest("p");
        if (!p || !p.classList.contains("selected")) return;
        // Avoid adding a cue if clicking on an existing cue highlight.
        if (e.target.classList.contains("cue-highlight")) return;
        const rect = p.getBoundingClientRect();
        const clickX = e.clientX - rect.left;
        // Use a temporary canvas to measure character width (assuming monospaced font).
        const style = window.getComputedStyle(p);
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");
        ctx.font = style.font;
        const charWidth = ctx.measureText("M").width;
        let index = Math.floor(clickX / charWidth);
        if (index >= p.dataset.originalText.length) {
            index = p.dataset.originalText.length - 1;
        }
        const cueLabel = prompt("Enter cue label:");
        if (!cueLabel) return;
        updateLineAnnotation(container, p.dataset.index, { cue: { location: index, label: cueLabel } });
        refreshScriptDisplay();
    });

    // Update selection: highlight the selected paragraph and scroll it to center.
    function updateSelection() {
        container.querySelectorAll("p").forEach(p => p.classList.remove("selected"));
        if (!selectableIndices.length) return;
        if (currentSelectIndex >= selectableIndices.length) {
            currentSelectIndex = selectableIndices.length - 1;
        }
        currentLinePressCount = 0;
        window.currentSelectIndex = currentSelectIndex;
        const selectedCompIndex = selectableIndices[currentSelectIndex];
        const selectedEl = container.querySelector(`p[data-index="${selectedCompIndex}"]`);
        if (selectedEl) {
            selectedEl.classList.add("selected");
            const containerHeight = container.clientHeight;
            const targetOffset = selectedEl.offsetTop - (containerHeight / 2) + (selectedEl.clientHeight / 2);
            container.scrollTop = targetOffset;
            if (window.recordingActive && window.lineStartTime === null) {
                window.lineStartTime = performance.now();
            }
            refreshScriptDisplay();
        }
    }

    // Global key handling.
    window.addEventListener("keydown", (e) => {
        // Toggle record mode with "u".
        if (e.key.toLowerCase() === "u") {
            e.preventDefault();
            window.recordingActive = !window.recordingActive;
            if (window.recordingActive) {
                window.lineStartTime = performance.now();
                recIndicator.style.display = "block";
                console.log("Record mode ON");
            } else {
                window.lineStartTime = null;
                recIndicator.style.display = "none";
                updateServerAnnotations();
                console.log("Record mode OFF");
            }
            return;
        }

        // Spacebar: record time and advance the line.
        if (e.code === "Space") {
            e.preventDefault();
            if (!selectableIndices.length) return;
            const selectedIdx = selectableIndices[currentSelectIndex];
            const annotation = readLineAnnotation(container, selectedIdx) || {};
            const cueCount = annotation.cues ? annotation.cues.length : 0;
            const requiredPresses = cueCount + 1; // One extra press per line.
            if (window.recordingActive && window.lineStartTime !== null) {
                const now = performance.now();
                const elapsed = now - window.lineStartTime;
                updateLineAnnotation(container, selectedIdx, { interval: elapsed });
                window.recordingData[selectedIdx] = (window.recordingData[selectedIdx] || 0) + elapsed;
                window.lineStartTime = performance.now();
                console.log(`Recorded interval: ${elapsed.toFixed(2)} ms for line ${selectedIdx}`);
            }
            currentLinePressCount++;
            console.log(`Line ${selectedIdx}: ${currentLinePressCount}/${requiredPresses} presses`);
            if (currentLinePressCount >= requiredPresses) {
                currentSelectIndex++;
                currentLinePressCount = 0;
                window.lineStartTime = window.recordingActive ? null : window.lineStartTime;
                updateSelection();
            }
        }
        // Arrow keys for navigation.
        else if (e.key === "ArrowDown") {
            e.preventDefault();
            if (currentSelectIndex < selectableIndices.length - 1) {
                currentSelectIndex++;
                currentLinePressCount = 0;
                window.lineStartTime = null;
                updateSelection();
            }
        } else if (e.key === "ArrowUp") {
            e.preventDefault();
            if (currentSelectIndex > 0) {
                currentSelectIndex--;
                currentLinePressCount = 0;
                window.lineStartTime = null;
                updateSelection();
            }
        }
        // Reset when "r" is pressed.
        else if (e.key.toLowerCase() === "r") {
            e.preventDefault();
            currentSelectIndex = 0;
            currentLinePressCount = 0;
            window.lineStartTime = null;
            window.recordingActive = false;
            recIndicator.style.display = "none";
            // Also reset timer if needed.
            if (window.timerStarted) {
                clearInterval(window.timerInterval);
                window.showTimer = 0;
                window.timerStarted = false;
            }
            updateSelection();
            console.log("Reset all states");
        }
    });

    function updateServerAnnotations() {
        let lines = [];
        container.querySelectorAll("p[data-index]").forEach(p => {
            lines.push(p.textContent);
            const pre = p.nextElementSibling;
            if (pre && pre.classList.contains("annotation-boneyard")) {
                lines.push(pre.textContent);
            }
        });
        const exportedText = lines.join("\n\n");
        updateFountainFile(exportedText)
            .then(() => console.log("Fountain file updated on server."))
            .catch(error => console.error("Error updating fountain file on server:", error));
    }

    // Expose the script container for debugging.
    window.scriptContainer = container;
}
