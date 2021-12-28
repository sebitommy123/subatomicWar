import { canvas, ctx } from "./render";

export let dragging = false;
let dragLastPosition = null;
let dragStart = null;
let realDrag = false;

export let mouseX = 0;
export let mouseY = 0;

export let gameMouseX = 0;
export let gameMouseY = 0;

export let mouseDown = false;
export let mouseClicked = false;

export function addUserInputHandlers() {

  canvas.addEventListener('mousedown', handleMouseDown);
  canvas.addEventListener('mousemove', handleMouseMove);
  canvas.addEventListener('mouseup', handleMouseUp);

  canvas.addEventListener('wheel', handleWheel);

}

function handleMouseDown(evt) {
  dragging = true;
  realDrag = false;
  dragLastPosition = { x: evt.offsetX, y: evt.offsetY };
  dragStart = { x: evt.offsetX, y: evt.offsetY };

  mouseDown = true;
}

function handleMouseMove(evt) {
  if (dragging) {
    let deltaX = evt.offsetX - dragLastPosition.x;
    let deltaY = evt.offsetY - dragLastPosition.y;

    if (!realDrag) {
      let distanceFromStart = Math.sqrt(Math.pow(dragStart.x - evt.offsetX, 2) + Math.pow(dragStart.y - evt.offsetY, 2));
      if (distanceFromStart > 5) {
        realDrag = true;
      }
    }

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
  if (!realDrag) {
    mouseClicked = true;
  }

  dragging = false;
  realDrag = false;

  mouseDown = false;
}

function handleWheel(evt) {
  let scale = evt.deltaY * -0.003;

  console.log(scale);

  let previousZoom = ctx.zoom;
  let nextZoom = previousZoom + scale;

  nextZoom = Math.max(0.4, nextZoom);
  nextZoom = Math.min(4, nextZoom);

  ctx.zoom = nextZoom;

  ctx.offsetX = mouseX - (mouseX - ctx.offsetX) * nextZoom / previousZoom;
  ctx.offsetY = mouseY - (mouseY - ctx.offsetY) * nextZoom / previousZoom;

}

export function tickStart() {
  
}

export function tickEnd() {
  mouseClicked = false;
}
