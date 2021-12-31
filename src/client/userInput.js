import { canvas, ctx } from "./render";

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

function handleMouseUp(evt) {
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

  scrollHandler(evt.deltaY);

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
