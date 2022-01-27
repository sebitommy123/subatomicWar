import { canvas, ctx, RenderConstants } from "./render";
import { stopAllPlacing } from "./render/placing";
import { isQuantityBarOpen, setQuantityBarQuantity, shortcuts } from "./render/quantityBar";
import { mutateInternalState } from "./state";
import { stopSmoothScroll } from "./utils/game";

export let dragging = false;
let dragLastPosition = null;
let dragStart = null;
let realDrag = false;
let currentDragHandler = null;
let nextMouseUp = [];
let nextUnhandledClick = [];
let showCursor = false;
let hoveringCallback = null;

export let mouseX = 0;
export let mouseY = 0;

export let gameMouseX = 0;
export let gameMouseY = 0;

export let mouseDown = false;
export let mouseClicked = false;
export let mouseRightDown = false;
export let mouseRightClicked = false;

export function addUserInputHandlers() {

  canvas.addEventListener('mousedown', handleMouseDown);
  canvas.addEventListener('mousemove', handleMouseMove);
  canvas.addEventListener('mouseup', handleMouseUp);

  canvas.addEventListener('contextmenu', evt => evt.preventDefault());

  canvas.addEventListener('wheel', handleWheel);

  window.addEventListener("keydown", handleKeyDown);

}

function handleKeyDown(evt) {

  let { key } = evt;

  if (key == "Escape") {
    stopAllPlacing();
  }

  let lowerKey = key.toLowerCase();

  if (shortcuts[lowerKey] != null) {
    let newQuantity = shortcuts[lowerKey];

    if (isQuantityBarOpen()) {
      setQuantityBarQuantity(newQuantity);
    }
  }

}

function handleMouseDown(evt) {

  stopSmoothScroll();

  if (evt.button == 0) {

    if (evt.detail != 2) { 

      dragging = true;
      realDrag = false;
      dragLastPosition = { x: evt.offsetX, y: evt.offsetY };
      dragStart = { x: evt.offsetX, y: evt.offsetY };
      currentDragHandler = dragHandler || (() => {});

      mouseDown = true;

    } else {

      mouseRightDown = true;

    }

  } else if (evt.button == 2) {

    mouseRightDown = true;

  }
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

export function forceStopDrag() {

  dragging = false;
  realDrag = false;

}

function handleMouseUp() {

  stopSmoothScroll();

  if (!realDrag && mouseDown) {
    mouseClicked = true;
  }

  if (mouseRightDown) {
    mouseRightClicked = true;
  }

  dragging = false;
  realDrag = false;

  mouseDown = false;
  mouseRightDown = false;

  nextMouseUp.forEach(handler => handler());
  nextMouseUp = [];
}

function handleWheel(evt) {

  stopSmoothScroll();

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

export function setHovering(active=false, ifFinalCallback=null) {
  showCursor = active;
  hoveringCallback = ifFinalCallback;
}

export function tickStart() {
  clickHandler = null;
  dragHandler = null;
  scrollHandler = null;
  showCursor = false;
  hoveringCallback = null;

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

  if (hoveringCallback) {
    hoveringCallback();
  }
  
  mouseClicked = false;
  mouseRightClicked = false;

  if (showCursor) {
    canvas.style.cursor = "pointer";
  } else {
    canvas.style.cursor = "default";
  }
}

export function tileMouseX() {
  return Math.floor(gameMouseX / RenderConstants.CELL_WIDTH);
}

export function tileMouseY() {
  return Math.floor(gameMouseY / RenderConstants.CELL_WIDTH);
}
