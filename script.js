import { getFountainFile } from "./js/fileManager.js";
import { initApp } from "./js/grid.js";

async function main() {
    try {
        console.log("Calling getFountainFile...");
        const data = await getFountainFile(); // Expecting: { content: "..." }
        console.log("Raw data from getFountainFile:", data);

        if (!data || typeof data.content !== "string") {
            throw new Error("Unexpected file format. Data received: " + JSON.stringify(data));
        }

        if (!data.content || data.content.trim() === "") {
            throw new Error("Fountain file is empty.");
        }

        window.fountainText = data.content;
        console.log("Fountain file loaded. Length:", data.content.length);
        initApp();
    } catch (error) {
        console.error("Error initializing app:", error);
        document.body.innerHTML = `<div style="color:red; font-family: 'JetBrains Mono', monospace; padding:20px;">Error: ${error.message}</div>`;
    }
}

main();
