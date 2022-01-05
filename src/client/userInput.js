import { canvas, ctx, RenderConstants } from "./render";
import { mutateInternalState } from "./state";

export let dragging = false;
let dragLastPosition = null;
let dragStart = null;
let realDrag = false;
let currentDragHandler = null;
let nextMouseUp = [];
let nextUnhandledClick = [];

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

  window.addEventListener("keydown", handleKeyDown);

}

function handleKeyDown(evt) {

  let { key } = evt;

  if (key == "Escape") {
    stopAllPlacing();
  }

}

export function stopAllPlacing() {
  mutateInternalState(state => {
    state.draggingUnit = null;
    state.buyingUnit = null;
    state.selectedUnit = null;
    state.buyingBuilding = null;
    state.buyingCity = false;
    state.buyingStructure = null;
    state.deletingObject = null;

    forceStopDrag();
  });
}

function handleMouseDown(evt) {
  dragging = true;
  realDrag = false;
  dragLastPosition = { x: evt.offsetX, y: evt.offsetY };
  dragStart = { x: evt.offsetX, y: evt.offsetY };
  currentDragHandler = dragHandler || (() => {});

  mouseDown = true;
}

function handleMouseMove(evt) {
  if (dragging) {
    let deltaX = evt.offsetX - dragLastPosition.x;
    let deltaY = evt.offsetY - dragLastPosition.y;

    let lastRealDrag = realDrag;

    if (!realDrag) {
      let distanceFromStart = Math.sqrt(Math.pow(dragStart.x - evt.offsetX, 2) + Math.pow(dragStart.y - evt.offsetY, 2));
      if (distanceFromStart > 5) {
        realDrag = true;
      }
    }
    
    if (realDrag) currentDragHandler(deltaX, deltaY, lastRealDrag!=realDrag);

    dragLastPosition = { x: evt.offsetX, y: evt.offsetY };
  }

  mouseX = evt.offsetX;
  mouseY = evt.offsetY;
  gameMouseX = ctx.canvasCoordsToGameX(mouseX);
  gameMouseY = ctx.canvasCoordsToGameY(mouseY);
}

function forceStopDrag() {

  dragging = false;
  realDrag = false;

}

function handleMouseUp() {
  if (!realDrag) {
    mouseClicked = true;
  }

  dragging = false;
  realDrag = false;

  mouseDown = false;

  nextMouseUp.forEach(handler => handler());
  nextMouseUp = [];
}

function handleWheel(evt) {

  evt.preventDefault();

  let dy = evt.deltaY;

  let decdy = dy - parseInt(dy);

  if (dy > 100) dy /= 2;
  if (decdy.toString().length > 5) dy *= 5;

  scrollHandler(dy);

}

let clickHandler = null;
let dragHandler = null;
let scrollHandler = null;

export function registerNextMouseUpHandler(handler) {
  nextMouseUp.push(handler);
}

export function registerNextUnhandledClickHandler(handler) {
  nextUnhandledClick.push(handler);
}

export function registerDraggableSurface(handler) {
  dragHandler = handler;
}

export function registerScrollableSurface(handler) {
  scrollHandler = handler;
}

export function registerNonDraggableSurface() {
  dragHandler = (dx, dy) => { };
}

export function registerNonScrollableSurface() {
  scrollHandler = (dx, dy) => { };
}

export function registerClick(handler) {
  clickHandler = handler;
}

export function tickStart() {
  clickHandler = null;
  dragHandler = null;
  scrollHandler = null;

  if (mouseClicked) {
    registerClick(() => {
      nextUnhandledClick.forEach(handler => handler());
      nextUnhandledClick = [];
    });
  }
}

export function tickEnd() {
  if (clickHandler) {
    clickHandler();
  }
  
  mouseClicked = false;
}

export function tileMouseX() {
  return Math.floor(gameMouseX / RenderConstants.CELL_WIDTH);
}

export function tileMouseY() {
  return Math.floor(gameMouseY / RenderConstants.CELL_WIDTH);
}
