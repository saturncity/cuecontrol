// js/fileManager.js

/**
 * Retrieves the Fountain file from the server via REST API.
 * Expects the server to return a JSON object with a "content" property.
 */
export async function getFountainFile() {
    try {
        console.log("FileManager: Initiating GET request to /fountain...");
        const response = await fetch("http://localhost:3000/fountain");
        console.log("FileManager: GET response received:", response);
        if (!response.ok) {
            throw new Error(`Failed to fetch fountain file: ${response.status} ${response.statusText}`);
        }
        const data = await response.json();
        console.log("FileManager: Parsed JSON data:", data);
        return data; // Expected format: { content: "..." }
    } catch (error) {
        console.error("FileManager: Error in getFountainFile:", error);
        throw error;
    }
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
