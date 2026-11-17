const canvas = document.querySelector("#drawingCanvas");
const context = canvas.getContext("2d");
const colorInput = document.querySelector("#brushColor");
const sizeInput = document.querySelector("#brushSize");
const clearButton = document.querySelector("#clearCanvas");

let isDrawing = false;

function getCanvasPoint(event) {
  const rect = canvas.getBoundingClientRect();
  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;

  return {
    x: (event.clientX - rect.left) * scaleX,
    y: (event.clientY - rect.top) * scaleY,
  };
}

function startDrawing(event) {
  isDrawing = true;
  const point = getCanvasPoint(event);

  context.beginPath();
  context.moveTo(point.x, point.y);
}

function draw(event) {
  if (!isDrawing) {
    return;
  }

  const point = getCanvasPoint(event);

  context.lineWidth = Number(sizeInput.value);
  context.lineCap = "round";
  context.lineJoin = "round";
  context.strokeStyle = colorInput.value;
  context.lineTo(point.x, point.y);
  context.stroke();
}

function stopDrawing() {
  isDrawing = false;
  context.closePath();
}

function clearCanvas() {
  context.clearRect(0, 0, canvas.width, canvas.height);
}

canvas.addEventListener("pointerdown", startDrawing);
canvas.addEventListener("pointermove", draw);
canvas.addEventListener("pointerup", stopDrawing);
canvas.addEventListener("pointerleave", stopDrawing);
clearButton.addEventListener("click", clearCanvas);

