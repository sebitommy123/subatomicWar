import { canvas, ctx } from "./render";

export let dragging = false;
let dragLastPosition = null;

export let mouseX = 0;
export let mouseY = 0;

export let gameMouseX = 0;
export let gameMouseY = 0;

export function addUserInputHandlers() {

  canvas.addEventListener('mousedown', handleMouseDown);
  canvas.addEventListener('mousemove', handleMouseMove);
  canvas.addEventListener('mouseup', handleMouseUp);

  canvas.addEventListener('wheel', handleWheel);

}

function handleMouseDown(evt) {
  dragging = true;
  dragLastPosition = { x: evt.offsetX, y: evt.offsetY };
}

function handleMouseMove(evt) {
  if (dragging) {
    let deltaX = evt.offsetX - dragLastPosition.x;
    let deltaY = evt.offsetY - dragLastPosition.y;

    ctx.offsetX += deltaX;
    ctx.offsetY += deltaY;

    dragLastPosition = { x: evt.offsetX, y: evt.offsetY };
  }

  mouseX = evt.offsetX;
  mouseY = evt.offsetY;
  gameMouseX = ctx.canvasCoordsToGameX(mouseX);
  gameMouseY = ctx.canvasCoordsToGameY(mouseY);
}

function handleMouseUp(evt) {
  dragging = false;
}

function handleWheel(evt) {
  let scale = evt.deltaY * -0.003;

  let previousZoom = ctx.zoom;
  let nextZoom = previousZoom + scale;

  nextZoom = Math.max(0.4, nextZoom);
  nextZoom = Math.min(4, nextZoom);

  ctx.zoom = nextZoom;

  ctx.offsetX = mouseX - (mouseX - ctx.offsetX) * nextZoom / previousZoom;
  ctx.offsetY = mouseY - (mouseY - ctx.offsetY) * nextZoom / previousZoom;

}
