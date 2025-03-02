// js/grid.js

import { scriptFollow } from "./scriptFollow.js";
import { liveFeed } from "./liveFeed.js";
import { audioLevelMonitor } from "./audioLevelMonitor.js";
import { timerDisplay } from "./timerDisplay.js";
import { promptDisplay } from "./promptDisplay.js";
// Removed: promptScript import.

export function initApp() {
    const gridWrapper = document.getElementById("grid-wrapper");
    const gridContainer = document.getElementById("grid-container");
    const moduleLayer = document.getElementById("module-layer");
    const tooltip = document.getElementById("tooltip");

    // Show grid wrapper.
    gridWrapper.style.display = "block";

    const gridColumns = parseInt(getComputedStyle(document.documentElement).getPropertyValue("--grid-columns"));
    const gridRows = parseInt(getComputedStyle(document.documentElement).getPropertyValue("--grid-rows"));

    // Initialize grid state as a 2D array.
    let gridState = [];
    for (let r = 0; r < gridRows; r++) {
        gridState[r] = [];
        for (let c = 0; c < gridColumns; c++) {
            gridState[r][c] = null;
        }
    }

    // Create grid cells.
    for (let r = 0; r < gridRows; r++) {
        for (let c = 0; c < gridColumns; c++) {
            const cell = document.createElement("div");
            cell.classList.add("grid-cell");
            cell.dataset.row = r;
            cell.dataset.col = c;
            const plus = document.createElement("span");
            plus.classList.add("plus");
            plus.textContent = "+";
            cell.appendChild(plus);
            cell.addEventListener("contextmenu", (e) => {
                e.preventDefault();
                showTooltipForCell(e, cell);
            });
            gridContainer.appendChild(cell);
        }
    }

    let tileCounter = 1;
    let selectedCell = null;

    // Tooltip options for grid cells.
    // Removed UpcomingCueDisplay and 2x1 Prompt Script.
    const cellTooltipOptions = [
        { label: "2x2 Script Follow", width: 2, height: 2, type: "ScriptFollow" },
        { label: "2x3 Script Follow", width: 2, height: 3, type: "ScriptFollow2x3" },
        { label: "1x1 Live Feed", width: 1, height: 1, type: "LiveFeed" },
        { label: "2x1 Live Feed", width: 2, height: 1, type: "LiveFeed2x1" },
        { label: "1x1 Audio Level Monitor", width: 1, height: 1, type: "AudioLevelMonitor" },
        { label: "2x1 Audio Level Monitor", width: 2, height: 1, type: "AudioLevelMonitor2x1" },
        { label: "1x1 Timer Display", width: 1, height: 1, type: "TimerDisplay" },
        { label: "2x1 Prompt Display", width: 2, height: 1, type: "PromptDisplay" },
        { label: "Delete Tile", action: "delete" }
    ];

    function filterTooltipOptions(options) {
        return options.filter(option => {
            if (option.action === "delete") return true;
            return !document.querySelector(`[data-module-type="${option.type}"]`);
        });
    }

    const moduleTooltipOptions = [
        { label: "Delete Tile", action: "delete" }
    ];

    function showTooltipForCell(e, cell) {
        selectedCell = cell;
        const filtered = filterTooltipOptions(cellTooltipOptions);
        generateTooltip(e, filtered, cell, false);
    }
    function showTooltipForModule(e, moduleEl) {
        selectedCell = moduleEl;
        generateTooltip(e, moduleTooltipOptions, moduleEl, true);
    }
    function generateTooltip(e, options, targetEl, fromModule) {
        tooltip.innerHTML = "";
        options.forEach(option => {
            const div = document.createElement("div");
            div.classList.add("tooltip-option");
            div.textContent = option.label;
            div.addEventListener("click", () => {
                if (option.action === "delete") {
                    if (fromModule) {
                        const row = targetEl.dataset.row;
                        const col = targetEl.dataset.col;
                        const cell = getCell(row, col);
                        deleteTile(cell);
                    } else {
                        deleteTile(targetEl);
                    }
                    hideTooltip();
                } else {
                    addTile(targetEl, option.width, option.height, option.type);
                    hideTooltip();
                }
            });
            tooltip.appendChild(div);
        });
        const dismissDiv = document.createElement("div");
        dismissDiv.classList.add("tooltip-option");
        dismissDiv.textContent = "Dismiss";
        dismissDiv.addEventListener("click", hideTooltip);
        tooltip.appendChild(dismissDiv);
        tooltip.style.minWidth = "150px";
        tooltip.style.display = "block";
        adjustTooltipPosition(e);
    }
    function adjustTooltipPosition(e) {
        tooltip.style.left = e.pageX + "px";
        tooltip.style.top = e.pageY + "px";
        setTimeout(() => {
            const rect = tooltip.getBoundingClientRect();
            let left = e.pageX;
            let top = e.pageY;
            if (left + rect.width > window.innerWidth) left = window.innerWidth - rect.width - 10;
            if (top + rect.height > window.innerHeight) top = window.innerHeight - rect.height - 10;
            tooltip.style.left = left + "px";
            tooltip.style.top = top + "px";
        }, 0);
    }
    function hideTooltip() {
        tooltip.style.display = "none";
    }
    document.addEventListener("click", (e) => {
        if (!tooltip.contains(e.target)) hideTooltip();
    });
    function getCell(row, col) {
        return document.querySelector(`.grid-cell[data-row='${row}'][data-col='${col}']`);
    }

    function addTile(cell, tileWidth, tileHeight, moduleType) {
        const startRow = parseInt(cell.dataset.row);
        const startCol = parseInt(cell.dataset.col);
        if (startCol + tileWidth > gridColumns || startRow + tileHeight > gridRows) {
            alert("Tile does not fit in the grid.");
            return;
        }
        for (let r = startRow; r < startRow + tileHeight; r++) {
            for (let c = startCol; c < startCol + tileWidth; c++) {
                if (gridState[r][c] !== null) {
                    alert("Space is already occupied.");
                    return;
                }
            }
        }
        const tileId = "tile" + tileCounter++;
        for (let r = startRow; r < startRow + tileHeight; r++) {
            for (let c = startCol; c < startCol + tileWidth; c++) {
                gridState[r][c] = { id: tileId };
            }
        }
        for (let r = startRow; r < startRow + tileHeight; r++) {
            for (let c = startCol; c < startCol + tileWidth; c++) {
                const cellEl = getCell(r, c);
                cellEl.innerHTML = "";
            }
        }
        const containerWidth = gridContainer.clientWidth;
        const containerHeight = gridContainer.clientHeight;
        const cellWidth = containerWidth / gridColumns;
        const cellHeight = containerHeight / gridRows;
        const left = startCol * cellWidth;
        const top = startRow * cellHeight;
        const width = tileWidth * cellWidth;
        const height = tileHeight * cellHeight;
        const moduleEl = document.createElement("div");
        moduleEl.classList.add("module");
        moduleEl.style.left = left + "px";
        moduleEl.style.top = top + "px";
        moduleEl.style.width = width + "px";
        moduleEl.style.height = height + "px";
        const contentEl = document.createElement("div");
        contentEl.classList.add("module-content");
        if (moduleType === "TimerDisplay") {
            contentEl.innerHTML = "00:00:00";
        } else {
            contentEl.textContent = `${tileId} (${tileWidth}x${tileHeight})`;
        }
        moduleEl.appendChild(contentEl);
        moduleEl.dataset.row = startRow;
        moduleEl.dataset.col = startCol;
        moduleEl.dataset.tileWidth = tileWidth;
        moduleEl.dataset.tileHeight = tileHeight;
        moduleEl.dataset.moduleType = moduleType;
        // Initialize module based on type.
        switch (moduleType) {
            case "ScriptFollow":
                scriptFollow(moduleEl);
                break;
            case "ScriptFollow2x3":
                scriptFollow(moduleEl);
                break;
            case "LiveFeed":
                liveFeed(moduleEl);
                break;
            case "LiveFeed2x1":
                liveFeed(moduleEl);
                break;
            case "AudioLevelMonitor":
                audioLevelMonitor(moduleEl);
                break;
            case "AudioLevelMonitor2x1":
                audioLevelMonitor(moduleEl);
                break;
            case "TimerDisplay":
                timerDisplay(moduleEl);
                break;
            case "PromptDisplay":
                promptDisplay(moduleEl);
                break;
            default:
                break;
        }
        moduleEl.addEventListener("contextmenu", (e) => {
            e.preventDefault();
            showTooltipForModule(e, moduleEl);
        });
        moduleEl.id = tileId;
        moduleEl.dataset.moduleType = moduleType;
        moduleLayer.appendChild(moduleEl);
    }

    function deleteTile(cell) {
        const row = parseInt(cell.dataset.row);
        const col = parseInt(cell.dataset.col);
        const cellState = gridState[row][col];
        if (!cellState) {
            alert("No tile to delete here.");
            return;
        }
        const tileId = cellState.id;
        let minRow = gridRows, maxRow = -1, minCol = gridColumns, maxCol = -1;
        for (let r = 0; r < gridRows; r++) {
            for (let c = 0; c < gridColumns; c++) {
                if (gridState[r][c] && gridState[r][c].id === tileId) {
                    minRow = Math.min(minRow, r);
                    maxRow = Math.max(maxRow, r);
                    minCol = Math.min(minCol, c);
                    maxCol = Math.max(maxCol, c);
                }
            }
        }
        for (let r = minRow; r <= maxRow; r++) {
            for (let c = minCol; c <= maxCol; c++) {
                if (gridState[r][c] && gridState[r][c].id === tileId) {
                    gridState[r][c] = null;
                    const cellEl = getCell(r, c);
                    cellEl.innerHTML = "";
                    const plus = document.createElement("span");
                    plus.classList.add("plus");
                    plus.textContent = "+";
                    cellEl.appendChild(plus);
                }
            }
        }
        const moduleEl = document.getElementById(tileId);
        if (moduleEl) {
            moduleEl.remove();
        }
    }

    function recalcModules() {
        const containerWidth = gridContainer.clientWidth;
        const containerHeight = gridContainer.clientHeight;
        const cellWidth = containerWidth / gridColumns;
        const cellHeight = containerHeight / gridRows;
        document.querySelectorAll(".module").forEach(moduleEl => {
            const startRow = parseInt(moduleEl.dataset.row);
            const startCol = parseInt(moduleEl.dataset.col);
            const tileWidth = parseInt(moduleEl.dataset.tileWidth);
            const tileHeight = parseInt(moduleEl.dataset.tileHeight);
            moduleEl.style.left = (startCol * cellWidth) + "px";
            moduleEl.style.top = (startRow * cellHeight) + "px";
            moduleEl.style.width = (tileWidth * cellWidth) + "px";
            moduleEl.style.height = (tileHeight * cellHeight) + "px";
            if (moduleEl.dataset.moduleType === "TimerDisplay") {
                const contentEl = moduleEl.querySelector(".module-content");
                if (contentEl) {
                    contentEl.innerHTML = window.formatTime ? window.formatTime(window.showTimer) : "00:00:00";
                }
            }
        });
    }
    window.addEventListener("resize", recalcModules);

    // Expose the script container for debugging.
    window.scriptContainer = document.getElementById("script-container");
}
