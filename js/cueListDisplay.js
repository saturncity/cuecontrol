import { readLineAnnotation } from "./annotationManager.js";
import { formatDuration } from "./totalTime.js"; // assumes formatDuration is exported

export function cueListDisplay(moduleEl) {
    console.log("Cue List Display initialized:", moduleEl.id);

    // Clear any existing content.
    moduleEl.innerHTML = "";

    // Create a container for the cue list.
    const listContainer = document.createElement("div");
    listContainer.classList.add("cue-list-container");
    moduleEl.appendChild(listContainer);

    // Locate the global script container.
    // (ScriptFollow now creates a container with id="script-container")
    const scriptContainer = document.querySelector("#script-container");
    if (!scriptContainer) {
        listContainer.textContent = "Error: Script container not found.";
        return;
    }

    // Gather cues along with their cumulative time stamp.
    const paragraphs = scriptContainer.querySelectorAll("p[data-index]");
    let cumulativeTime = 0;
    const cueEntries = [];

    paragraphs.forEach(p => {
        const index = p.dataset.index;
        const annotation = readLineAnnotation(scriptContainer, index);
        // Add duration if available.
        if (annotation && annotation.duration != null) {
            cumulativeTime += Number(annotation.duration);
        }
        // Check for cues (stored as an array under "cues").
        if (annotation && Array.isArray(annotation.cues)) {
            annotation.cues.forEach(cue => {
                cueEntries.push({
                    time: cumulativeTime,
                    label: cue.label
                });
            });
        }
    });

    // If no cues were found, show a message.
    if (cueEntries.length === 0) {
        listContainer.textContent = "No cues found.";
        return;
    }

    // Create an unordered list to display cues.
    const ul = document.createElement("ul");
    ul.classList.add("cue-list");

    cueEntries.forEach(entry => {
        const li = document.createElement("li");
        // Show the time stamp to the left of the cue label.
        li.innerHTML = `<span class="cue-time">${formatDuration(entry.time)}</span> - <span class="cue-label">${entry.label}</span>`;
        ul.appendChild(li);
    });

    listContainer.appendChild(ul);
}
