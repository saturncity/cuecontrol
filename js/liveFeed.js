export function liveFeed(moduleEl) {
    console.log("Live Feed initialized:", moduleEl.id);
    const video = document.createElement("video");
    video.setAttribute("autoplay", "");
    video.setAttribute("playsinline", "");
    video.style.width = "100%";
    video.style.height = "100%";
    const contentEl = moduleEl.querySelector(".module-content");
    contentEl.innerHTML = "";
    contentEl.appendChild(video);
    navigator.mediaDevices.getUserMedia({ video: true })
        .then((stream) => {
            video.srcObject = stream;
        })
        .catch((err) => {
            console.error("Error accessing camera:", err);
            contentEl.textContent = "Camera not available.";
        });
}
