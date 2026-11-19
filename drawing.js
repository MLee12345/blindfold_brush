const canvas = document.querySelector("#drawingCanvas");
const context = canvas.getContext("2d");
const sizeInput = document.querySelector("#brushSize");
const clearButton = document.querySelector("#clearCanvas");
const undoButton = document.querySelector("#undoCanvas");
const toolButtons = document.querySelectorAll("[data-tool]");
const colorButtons = document.querySelectorAll("[data-color]");

const hiddenCanvas = document.createElement("canvas");
const hiddenContext = hiddenCanvas.getContext("2d");
const undoStack = [];
const maxUndoSteps = 25;
const roundLengthMs = 30000;
const gridSize = 40;

let isDrawing = false;
let activePointerId = null;
let cursorPoint = null;
let isRoundRevealed = false;
let roundTimer = null;
let selectedTool = "pen";
let selectedColor = "#1f2937";

function resizeHiddenCanvas() {
  hiddenCanvas.width = canvas.width;
  hiddenCanvas.height = canvas.height;
}

function saveCanvasState() {
  undoStack.push(hiddenContext.getImageData(0, 0, hiddenCanvas.width, hiddenCanvas.height));

  if (undoStack.length > maxUndoSteps) {
    undoStack.shift();
  }
}

function getCanvasPoint(event) {
  const rect = canvas.getBoundingClientRect();
  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;

  return {
    x: (event.clientX - rect.left) * scaleX,
    y: (event.clientY - rect.top) * scaleY,
  };
}

function setBrushStyle(event) {
  const pressure = event.pointerType === "pen" && event.pressure > 0 ? event.pressure : 1;
  const isErasing = selectedTool === "eraser" || event.shiftKey;

  hiddenContext.lineWidth = Math.max(1, Number(sizeInput.value) * pressure);
  hiddenContext.lineCap = "round";
  hiddenContext.lineJoin = "round";
  hiddenContext.strokeStyle = selectedColor;
  hiddenContext.fillStyle = selectedColor;
  hiddenContext.globalCompositeOperation = isErasing ? "destination-out" : "source-over";
}

function clearVisibleCanvas() {
  context.clearRect(0, 0, canvas.width, canvas.height);
}

function drawGrid() {
  context.save();
  context.strokeStyle = "#d7e0ef";
  context.lineWidth = 1;
  context.globalAlpha = 0.65;

  for (let x = gridSize; x < canvas.width; x += gridSize) {
    context.beginPath();
    context.moveTo(x, 0);
    context.lineTo(x, canvas.height);
    context.stroke();
  }

  for (let y = gridSize; y < canvas.height; y += gridSize) {
    context.beginPath();
    context.moveTo(0, y);
    context.lineTo(canvas.width, y);
    context.stroke();
  }

  context.restore();
}

function drawCursor() {
  if (!cursorPoint) {
    return;
  }

  const cursorRadius = Math.max(4, Number(sizeInput.value) / 2);
  const isErasing = selectedTool === "eraser";

  context.save();
  context.globalAlpha = isErasing ? 0.9 : 0.75;
  context.fillStyle = isErasing ? "#ffffff" : selectedColor;
  context.strokeStyle = isErasing ? "#667085" : selectedColor;
  context.lineWidth = 2;
  context.beginPath();
  context.arc(cursorPoint.x, cursorPoint.y, cursorRadius, 0, Math.PI * 2);
  context.fill();
  context.stroke();
  context.restore();
}

function renderCanvasView() {
  clearVisibleCanvas();

  if (isRoundRevealed) {
    context.drawImage(hiddenCanvas, 0, 0);
  } else {
    drawGrid();
  }

  drawCursor();
}

function revealDrawing() {
  isRoundRevealed = true;
  isDrawing = false;
  hiddenContext.closePath();
  hiddenContext.globalCompositeOperation = "source-over";

  if (activePointerId !== null && canvas.hasPointerCapture(activePointerId)) {
    canvas.releasePointerCapture(activePointerId);
  }

  activePointerId = null;
  renderCanvasView();
}

function startRound() {
  window.clearTimeout(roundTimer);
  undoStack.length = 0;
  cursorPoint = null;
  isRoundRevealed = false;
  hiddenContext.clearRect(0, 0, hiddenCanvas.width, hiddenCanvas.height);
  renderCanvasView();
  roundTimer = window.setTimeout(revealDrawing, roundLengthMs);
}

function paintDot(point, event) {
  setBrushStyle(event);

  hiddenContext.beginPath();
  hiddenContext.arc(point.x, point.y, hiddenContext.lineWidth / 2, 0, Math.PI * 2);
  hiddenContext.fill();
  hiddenContext.beginPath();
  hiddenContext.moveTo(point.x, point.y);
}

function startDrawing(event) {
  event.preventDefault();

  if (activePointerId !== null || isRoundRevealed) {
    return;
  }

  saveCanvasState();
  isDrawing = true;
  activePointerId = event.pointerId;
  canvas.setPointerCapture(activePointerId);

  const point = getCanvasPoint(event);

  cursorPoint = point;
  paintDot(point, event);
  renderCanvasView();
}

function draw(event) {
  if (!isDrawing || event.pointerId !== activePointerId) {
    return;
  }

  event.preventDefault();
  const point = getCanvasPoint(event);

  setBrushStyle(event);
  cursorPoint = point;
  hiddenContext.lineTo(point.x, point.y);
  hiddenContext.stroke();
  renderCanvasView();
}

function stopDrawing(event) {
  if (!isDrawing || event.pointerId !== activePointerId) {
    return;
  }

  isDrawing = false;
  activePointerId = null;
  hiddenContext.closePath();
  hiddenContext.globalCompositeOperation = "source-over";

  if (canvas.hasPointerCapture(event.pointerId)) {
    canvas.releasePointerCapture(event.pointerId);
  }
}

function clearCanvas() {
  startRound();
}

function undoLastAction() {
  if (isRoundRevealed) {
    return;
  }

  const previousCanvasState = undoStack.pop();

  if (previousCanvasState) {
    hiddenContext.putImageData(previousCanvasState, 0, 0);
    renderCanvasView();
  }
}

function handleKeyboardShortcut(event) {
  const isUndoShortcut = (event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "z";

  if (isUndoShortcut) {
    event.preventDefault();
    undoLastAction();
  }
}

function selectTool(toolName) {
  selectedTool = toolName;

  toolButtons.forEach((button) => {
    const isSelected = button.dataset.tool === selectedTool;
    button.classList.toggle("is-active", isSelected);
    button.setAttribute("aria-pressed", String(isSelected));
  });

  renderCanvasView();
}

function selectColor(color) {
  selectedColor = color;
  selectedTool = "pen";

  colorButtons.forEach((button) => {
    button.classList.toggle("is-active", button.dataset.color === color);
  });

  selectTool("pen");
}

function moveCursor(event) {
  if (isDrawing) {
    return;
  }

  cursorPoint = getCanvasPoint(event);
  renderCanvasView();
}

function hideCursor() {
  if (isDrawing) {
    return;
  }

  cursorPoint = null;
  renderCanvasView();
}

resizeHiddenCanvas();
startRound();
canvas.addEventListener("pointerdown", startDrawing);
canvas.addEventListener("pointermove", draw);
canvas.addEventListener("pointermove", moveCursor);
canvas.addEventListener("pointerup", stopDrawing);
canvas.addEventListener("pointerleave", stopDrawing);
canvas.addEventListener("pointerleave", hideCursor);
canvas.addEventListener("pointercancel", stopDrawing);
clearButton.addEventListener("click", clearCanvas);
undoButton.addEventListener("click", undoLastAction);
sizeInput.addEventListener("input", renderCanvasView);
toolButtons.forEach((button) => {
  button.addEventListener("click", () => {
    selectTool(button.dataset.tool);
  });
});
colorButtons.forEach((button) => {
  button.addEventListener("click", () => {
    selectColor(button.dataset.color);
  });
});
document.addEventListener("keydown", handleKeyboardShortcut);

