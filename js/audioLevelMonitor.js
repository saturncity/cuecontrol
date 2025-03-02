export function audioLevelMonitor(moduleEl) {
    console.log("Audio Level Monitor initialized:", moduleEl.id);

    // Create a container with flex layout for two canvases.
    const container = document.createElement("div");
    container.style.display = "flex";
    container.style.width = "100%";
    container.style.height = "100%";

    // Main visualization canvas (80% width).
    const mainCanvas = document.createElement("canvas");
    mainCanvas.style.width = "80%";
    mainCanvas.style.height = "100%";

    // Peak meter canvas (20% width).
    const peakCanvas = document.createElement("canvas");
    peakCanvas.style.width = "20%";
    peakCanvas.style.height = "100%";

    container.appendChild(mainCanvas);
    container.appendChild(peakCanvas);

    const contentEl = moduleEl.querySelector(".module-content");
    contentEl.innerHTML = "";
    contentEl.appendChild(container);

    const AudioContext = window.AudioContext || window.webkitAudioContext;
    const audioContext = new AudioContext();
    const analyser = audioContext.createAnalyser();
    analyser.fftSize = 256;
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    navigator.mediaDevices.getUserMedia({ audio: true })
        .then(stream => {
            const source = audioContext.createMediaStreamSource(stream);
            source.connect(analyser);
            draw();
        })
        .catch(err => {
            console.error("Error accessing microphone:", err);
            contentEl.textContent = "Microphone not available.";
        });

    function draw() {
        requestAnimationFrame(draw);
        analyser.getByteFrequencyData(dataArray);

        const containerWidth = moduleEl.clientWidth;
        const containerHeight = moduleEl.clientHeight;
        const mainWidth = containerWidth * 0.8;
        const peakWidth = containerWidth * 0.2;
        mainCanvas.width = mainWidth;
        mainCanvas.height = containerHeight;
        peakCanvas.width = peakWidth;
        peakCanvas.height = containerHeight;

        const mainCtx = mainCanvas.getContext("2d");
        mainCtx.clearRect(0, 0, mainWidth, containerHeight);
        const barWidth = mainWidth / bufferLength;
        let x = 0;
        for (let i = 0; i < bufferLength; i++) {
            let value = dataArray[i];
            if (value < 0) value = 0;
            const barHeight = (value / 255) * containerHeight;
            // Color scale: green for quiet, orange for ideal, red for loud.
            if (value < 85) {
                mainCtx.fillStyle = "green";
            } else if (value < 170) {
                mainCtx.fillStyle = "orange";
            } else {
                mainCtx.fillStyle = "red";
            }
            mainCtx.fillRect(x, containerHeight - barHeight, barWidth - 1, barHeight);
            x += barWidth;
        }

        const peakCtx = peakCanvas.getContext("2d");
        peakCtx.clearRect(0, 0, peakWidth, containerHeight);
        let peakValue = 0;
        for (let i = 0; i < bufferLength; i++) {
            if (dataArray[i] > peakValue) {
                peakValue = dataArray[i];
            }
        }
        const peakHeight = (peakValue / 255) * containerHeight;
        let peakColor;
        if (peakValue < 85) {
            peakColor = "green";
        } else if (peakValue < 170) {
            peakColor = "orange";
        } else {
            peakColor = "red";
        }
        const meterWidth = peakWidth * 0.6;
        const meterX = (peakWidth - meterWidth) / 2;
        peakCtx.fillStyle = peakColor;
        peakCtx.fillRect(meterX, containerHeight - peakHeight, meterWidth, peakHeight);
    }
}
