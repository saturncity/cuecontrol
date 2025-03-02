// js/annotationManager.js

const allowedTypes = new Set(["DIALOGUE", "ACTION", "LYRIC", "PARENTHETICAL"]);

export function ensureAnnotationsForAll(container) {
    const paragraphs = container.querySelectorAll("p[data-index]");
    paragraphs.forEach(p => {
        if (!allowedTypes.has(p.dataset.type)) return;
        if (!p.nextElementSibling || !p.nextElementSibling.classList.contains("annotation-boneyard")) {
            const pre = document.createElement("pre");
            pre.classList.add("annotation-boneyard");
            pre.style.display = "none";
            pre.textContent = "/*{}*/";
            p.insertAdjacentElement("afterend", pre);
        }
    });
}

export function readLineAnnotation(container, lineIndex) {
    const p = container.querySelector(`p[data-index="${lineIndex}"]`);
    if (p && p.nextElementSibling && p.nextElementSibling.classList.contains("annotation-boneyard")) {
        let text = p.nextElementSibling.textContent.trim();
        if (text.startsWith("/*") && text.endsWith("*/")) {
            text = text.slice(2, -2).trim();
        }
        try {
            const parsed = text ? JSON.parse(text) : {};
            console.log(`Read annotation for line ${lineIndex}:`, parsed);
            return parsed;
        } catch (e) {
            console.error("Error parsing annotation for line", lineIndex, e);
            return {};
        }
    }
    return {};
}

/**
 * Merges newData into the existing annotation for a line.
 * - For interval data: if newData.interval is provided, it's appended.
 * - For cue data: if newData.cue is provided, it is merged into the cues array (updating an existing cue at that location if present).
 * Existing data is preserved.
 */
export function updateLineAnnotation(container, lineIndex, newData) {
    const p = container.querySelector(`p[data-index="${lineIndex}"]`);
    if (!p) return newData;
    if (!allowedTypes.has(p.dataset.type)) return newData;

    let pre;
    if (p.nextElementSibling && p.nextElementSibling.classList.contains("annotation-boneyard")) {
        pre = p.nextElementSibling;
    } else {
        pre = document.createElement("pre");
        pre.classList.add("annotation-boneyard");
        pre.style.display = "none";
        p.insertAdjacentElement("afterend", pre);
    }

    const current = readLineAnnotation(container, lineIndex) || {};
    const { cue: newCue, interval: newInterval, ...nonCueData } = newData;
    const merged = { ...current };

    // Merge non-cue keys.
    for (const key in nonCueData) {
        if (nonCueData.hasOwnProperty(key)) {
            merged[key] = nonCueData[key];
        }
    }

    // Handle interval data.
    if (newInterval != null) {
        let intervals = Array.isArray(current.intervals) ? current.intervals.slice() : [];
        intervals.push(newInterval);
        merged.intervals = intervals;
        merged.duration = intervals.reduce((sum, t) => sum + t, 0);
    } else if (current.intervals !== undefined) {
        merged.intervals = current.intervals;
        merged.duration = current.duration;
    }

    // Handle cue data.
    if (newCue != null) {
        let cues = Array.isArray(current.cues) ? current.cues.slice() : [];
        const existingIndex = cues.findIndex(c => c.location === newCue.location);
        if (existingIndex !== -1) {
            cues[existingIndex].label = newCue.label;
        } else {
            cues.push(newCue);
        }
        merged.cues = cues;
    } else if (current.cues !== undefined) {
        merged.cues = current.cues;
    }

    console.log(`Updated annotation for line ${lineIndex}:`, merged);
    pre.textContent = "/*" + JSON.stringify(merged) + "*/";
    return merged;
}
