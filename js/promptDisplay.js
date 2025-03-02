// js/promptDisplay.js

import { readLineAnnotation, updateLineAnnotation } from "./annotationManager.js";

/**
 * promptDisplay(moduleEl)
 *
 * This module displays cue prompts for the currently selected script line.
 * For the current line (retrieved from the global script container), it:
 *   - Reads its annotation for cue data.
 *   - Rebuilds the line text by inserting a green “GO” at each cue location.
 *   - Displays an overlay prompt (e.g. in the top right) for each cue with the text:
 *         "{LABEL}, ready"
 *
 * This approach does not rely on timing; it uses the annotation cue positions.
 */
export function promptDisplay(moduleEl) {
    console.log("Prompt Display initialized:", moduleEl.id);

    // Clear any existing content in the prompt display module.
    moduleEl.innerHTML = "";

    // Create an overlay for the prompt messages.
    const promptOverlay = document.createElement("div");
    promptOverlay.style.position = "absolute";
    promptOverlay.style.top = "5px";
    promptOverlay.style.right = "5px";
    promptOverlay.style.fontFamily = "JetBrains Mono, monospace";
    promptOverlay.style.fontSize = "16px";
    promptOverlay.style.color = "black";
    promptOverlay.style.backgroundColor = "rgba(255,255,255,0.8)";
    promptOverlay.style.padding = "5px 10px";
    promptOverlay.style.borderRadius = "4px";
    moduleEl.appendChild(promptOverlay);

    // Get the script container and currently selected line.
    const scriptContainer = document.getElementById("script-container");
    if (!scriptContainer) {
        moduleEl.textContent = "Error: Script container not found.";
        return;
    }
    // Assume window.currentSelectIndex is maintained by scriptFollow.
    const currentIndex = window.currentSelectIndex;
    const currentLineEl = scriptContainer.querySelector(`p[data-index="${currentIndex}"]`);
    if (!currentLineEl) {
        moduleEl.textContent = "Error: No current script line found.";
        return;
    }

    // Retrieve the annotation for the current line.
    const annotation = readLineAnnotation(scriptContainer, currentIndex) || {};
    if (!annotation.cues || !Array.isArray(annotation.cues) || annotation.cues.length === 0) {
        promptOverlay.textContent = "No cues on this line.";
        return;
    }

    // Retrieve the original text (assumes it was stored when rendering).
    const originalText = currentLineEl.dataset.originalText || currentLineEl.textContent;
    const textLength = originalText.length;

    // Build new HTML for the line: insert a green "GO" at each cue location.
    // We sort cues by their location.
    const sortedCues = annotation.cues.slice().sort((a, b) => a.location - b.location);
    let newHTML = "";
    let lastIdx = 0;
    // Also build prompt messages.
    let promptMessages = [];

    sortedCues.forEach(cue => {
        // Clamp cue.location in the text.
        const pos = Math.min(cue.location, textLength - 1);
        newHTML += originalText.substring(lastIdx, pos);
        // Instead of the original character, insert the green "GO" (with a span for click editing).
        let ch = originalText.charAt(pos);
        if (ch === " ") ch = "_";
        newHTML += `<span class="cue-highlight" data-location="${pos}" style="color:green; cursor:pointer;" title="Cue: ${cue.label}">GO</span>`;
        // Add a prompt message for this cue.
        promptMessages.push(`${cue.label}, ready`);
        lastIdx = pos + 1;
    });
    newHTML += originalText.substring(lastIdx);
    // Update the current line's display with the new HTML.
    currentLineEl.innerHTML = newHTML;

    // Update the overlay with all prompt messages (joined by line breaks).
    promptOverlay.innerHTML = promptMessages.join("<br>");

    // Attach click listeners to cue-highlight spans for editing cues.
    currentLineEl.querySelectorAll(".cue-highlight").forEach(el => {
        el.addEventListener("click", (evt) => {
            evt.stopPropagation();
            const pos = Number(el.dataset.location);
            const currentAnnotation = readLineAnnotation(scriptContainer, currentIndex) || {};
            let cues = Array.isArray(currentAnnotation.cues) ? currentAnnotation.cues : [];
            const existingCue = cues.find(c => c.location === pos) || { location: pos, label: "" };
            const newLabel = prompt("Edit cue label:", existingCue.label);
            if (newLabel && newLabel !== existingCue.label) {
                updateLineAnnotation(scriptContainer, currentIndex, { cue: { location: pos, label: newLabel } });
                // Re-run promptDisplay to refresh the cues.
                promptDisplay(moduleEl);
            }
        });
    });
}
