// js/fileManager.js

/**
 * Waits for the reader to choose a Fountain file, then hands back its text.
 * Resolves to { content: "..." }, the shape script.js already expects.
 */
export function getFountainFile() {
    return new Promise((resolve, reject) => {
        const input = document.getElementById("file-input");
        const loader = document.getElementById("loader");
        input.addEventListener("change", async () => {
            const file = input.files[0];
            if (!file) {
                reject(new Error("No file chosen."));
                return;
            }
            try {
                const content = await file.text();
                loader.remove();
                resolve({ content });
            } catch (err) {
                reject(new Error("Could not read " + file.name + ": " + err.message));
            }
        }, { once: true });
    });
}

/**
 * Updates the Fountain file on the server via REST API.
 */
export async function updateFountainFile(content) {
    try {
        console.log("FileManager: Initiating POST request to /fountain...");
        const response = await fetch("http://localhost:3000/fountain", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ content })
        });
        console.log("FileManager: POST response received:", response);
        if (!response.ok) {
            throw new Error(`Failed to update fountain file: ${response.status} ${response.statusText}`);
        }
        const data = await response.json();
        console.log("FileManager: Update response JSON:", data);
        return data;
    } catch (error) {
        console.error("FileManager: Error in updateFountainFile:", error);
        throw error;
    }
}

/**
 * Triggers a download of the given content as a file.
 */
export function downloadFountainFile(content, filename = "modified.fountain") {
    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}
