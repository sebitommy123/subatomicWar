// Learn more about this file at:
// https://victorzhou.com/blog/build-an-io-game-part-1/#5-client-rendering
import { debounce } from 'throttle-debounce';
import { getAsset } from './assets';
import BetterCtx from './betterCtx';

let renderingState;
export const canvas = document.getElementById('canvas');
export const ctx = new BetterCtx(canvas.getContext('2d'));

export const RenderConstants = Object.freeze({
  CELL_WIDTH: 100,
  CELL_HEIGHT: 100,
});

export function setRenderingState(newState) {

  renderingState = newState;

}

export function initRender() { 
  /**
   * Starts rendering the game.
   */

  setCanvasDimensions();

  window.addEventListener('resize', debounce(40, setCanvasDimensions));

  callAnimationLoop(render);
}

function setCanvasDimensions() {
  // On small screens (e.g. phones), we want to "zoom out" so players can still see at least
  // 800 in-game units of width.
  const scaleRatio = Math.max(1, 800 / window.innerWidth);
  canvas.width = scaleRatio * window.innerWidth;
  canvas.height = scaleRatio * window.innerHeight;
}

function callAnimationLoop(func) {

  func();

  requestAnimationFrame(() => callAnimationLoop(func));

}

function render() {
  ctx.fillStyle = "white";
  ctx.abs.fillRect(0, 0, canvas.width, canvas.height);

  if (renderingState.screen !== 'game') {
    renderMainMenu();
  } else {    
    renderGrid();

    renderUnits();
  }
}

function renderMainMenu() {
  let gradient = ctx.abs.createLinearGradient(0, canvas.height/2, canvas.width, canvas.height/2);
  gradient.addColorStop(0, 'green');
  gradient.addColorStop(.5, 'cyan');
  gradient.addColorStop(1, 'green');
  ctx.fillStyle = gradient;
  ctx.abs.fillRect(0, 0, canvas.width, canvas.height);
}

function renderGrid() {
  const { width, height } = renderingState.gridDimensions;

  ctx.strokeStyle = 'black';
  ctx.lineWidth = 1;

  for (let x = 0; x <= width; x++) {
    ctx.beginPath();
    ctx.moveTo(x * RenderConstants.CELL_WIDTH, 0);
    ctx.lineTo(x * RenderConstants.CELL_WIDTH, height * RenderConstants.CELL_HEIGHT);
    ctx.stroke();
  }

  for (let y = 0; y <= height; y++) {
    ctx.beginPath();
    ctx.moveTo(0, y * RenderConstants.CELL_HEIGHT);
    ctx.lineTo(width * RenderConstants.CELL_WIDTH, y * RenderConstants.CELL_HEIGHT);
    ctx.stroke();
  }
}

function renderUnits() {

  renderingState.units.forEach(unit => {
    let { id, x, y, quantity } = unit;

    ctx.fillStyle = "red";
    let img = getAsset("soldier");

    let padding = 10;

    let renderWidth = (RenderConstants.CELL_HEIGHT - padding*2) * img.width / img.height;
    ctx.drawImage(img, x * RenderConstants.CELL_WIDTH + (RenderConstants.CELL_WIDTH - renderWidth) / 2, y * RenderConstants.CELL_HEIGHT + padding, renderWidth, RenderConstants.CELL_HEIGHT - padding*2);
  
    ctx.fontSize = 20;
    ctx.textAlign = "right";
    ctx.textBaseline = "top";

    if (ctx.zoom < 0.5) {
      ctx.fillStyle = "white";
      let textWidth = ctx.abs.measureText(quantity).width / ctx.zoom;
      ctx.fillRect(x * RenderConstants.CELL_WIDTH + RenderConstants.CELL_WIDTH - 10 - textWidth, y * RenderConstants.CELL_HEIGHT + 3, textWidth, 15 / ctx.zoom);
    }

    ctx.fillStyle = "black";
    ctx.fillText(quantity, x * RenderConstants.CELL_WIDTH + RenderConstants.CELL_WIDTH - 10, y * RenderConstants.CELL_HEIGHT + 5);
  
  });

}