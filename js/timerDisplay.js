export function timerDisplay(moduleEl) {
    let contentEl = moduleEl.querySelector(".module-content");
    if (!contentEl) {
        contentEl = document.createElement("div");
        contentEl.classList.add("module-content");
        moduleEl.innerHTML = "";
        moduleEl.appendChild(contentEl);
    }

    if (!window.timerInitialized) {
        window.timerInitialized = true;
        window.showTimer = 0;
        window.timerStarted = false;
        window.showTimeRunning = false;
        window.timerInterval = null;
        window.timerModuleElements = [];

        window.addEventListener("keydown", (e) => {
            if (e.code === "Space") {
                if (!window.timerStarted) {
                    startTimer();
                }
            } else if (e.key.toLowerCase() === "p") {
                togglePauseTimer();
            } else if (e.key.toLowerCase() === "r") {
                resetTimer();
            }
        });

        window.startTimer = function() {
            window.timerStarted = true;
            window.showTimeRunning = true;
            window.timerInterval = setInterval(() => {
                if (window.showTimeRunning) {
                    window.showTimer += 10;
                }
                updateTimerDisplay();
            }, 10);
        };

        window.togglePauseTimer = function() {
            window.showTimeRunning = !window.showTimeRunning;
        };

        window.resetTimer = function() {
            window.showTimer = 0;
            if (window.timerStarted) {
                clearInterval(window.timerInterval);
                window.startTimer();
            }
            updateTimerDisplay();
        };

        window.formatTime = function(ms) {
            const hours = Math.floor(ms / 3600000);
            const minutes = Math.floor((ms % 3600000) / 60000);
            const seconds = Math.floor((ms % 60000) / 1000);
            const milliseconds = ms % 1000;
            const pad = (n, width = 2) => n.toString().padStart(width, "0");
            return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}:${pad(milliseconds, 3)}`;
        };

        window.updateTimerDisplay = function() {
            const timeStr = window.formatTime(window.showTimer);
            window.timerModuleElements.forEach((el) => {
                const cnt = el.querySelector(".module-content");
                if (cnt) {
                    cnt.innerHTML = timeStr;
                }
            });
        };
    }

    window.timerModuleElements.push(moduleEl);
    window.updateTimerDisplay();
    console.log("Timer Display initialized:", moduleEl.id);
}
