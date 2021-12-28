// Learn more about this file at:
// https://victorzhou.com/blog/build-an-io-game-part-1/#5-client-rendering
import { debounce } from 'throttle-debounce';
import { getAsset } from './assets';
import BetterCtx from './betterCtx';
import { updateStageInfo } from './stageInfo';
import { mouseDown, mouseClicked, tickEnd, tickStart } from './userInput';
import { mouseInRect } from './utils';
import { emit } from './networking';

import Constants from '../shared/constants';
import { getById, getMe } from './state';

let renderingState;
export const canvas = document.getElementById('canvas');
export const ctx = new BetterCtx(canvas.getContext('2d'));

export const RenderConstants = Object.freeze({
  CELL_WIDTH: 100,
  CELL_HEIGHT: 100,
});

let clickHandler = null;

function registerClick(handler) {
  clickHandler = handler;
}

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

  clickHandler = null;
  tickStart();

  ctx.fillStyle = "#d4f1f9";
  ctx.abs.fillRect(0, 0, canvas.width, canvas.height);

  if (renderingState.screen !== 'game') {
    renderMainMenu();

  } else {      
    renderLand();
    
    renderGrid();

    renderTerritory();
    
    if (renderingState.stage === "pregame") {
      renderSelectStartingPosition();
      updateStageInfo();
    }

    if (renderingState.stage === "game") {
      renderUnits();
    }

  }

  if (clickHandler) {
    clickHandler();
  }

  tickEnd();

}

function renderTerritory() {

  const { players, territory } = renderingState;

  territory.forEach((row, y) => {
    row.forEach((playerId, x) => {
      if (playerId) {
        let color = getById(playerId, players).color;
        ctx.fillStyle = color;
        ctx.fillRect(x * RenderConstants.CELL_WIDTH, y * RenderConstants.CELL_HEIGHT, RenderConstants.CELL_WIDTH, RenderConstants.CELL_HEIGHT);
      }
    });
  });

}

function renderSelectStartingPosition() {
  const { territory, gridDimensions } = renderingState;
  const { width, height } = gridDimensions;

  for (let x = 0; x < width; x++) {
    for (let y = 0; y < height; y++) {
      if (territory[y][x] === getMe().id) {
        continue;
      }

      let rect = {
        x: x * RenderConstants.CELL_WIDTH,
        y: y * RenderConstants.CELL_HEIGHT,
        width: RenderConstants.CELL_WIDTH,
        height: RenderConstants.CELL_HEIGHT,
      };

      if (mouseInRect(rect)) {
        ctx.globalAlpha = 0.4;
        ctx.fillStyle = "black";
        ctx.fillRect(rect);
        ctx.globalAlpha = 1;

        if (mouseClicked) {
          registerClick(() => {
            emit(Constants.messages.chooseStartingPosition, { x, y });
          });
        }
      }
    }
  }

}

function renderLand() {

  renderingState.land.forEach((row, y) => {
    row.forEach((cell, x) => {
      if (cell == "water") {
        ctx.fillStyle = "#0096FF";
      }
      else if (cell == "grass") {
        ctx.fillStyle = "#7EC850";
      }

      ctx.fillRect(x * RenderConstants.CELL_WIDTH, y * RenderConstants.CELL_HEIGHT, RenderConstants.CELL_WIDTH, RenderConstants.CELL_HEIGHT);
    });
  });

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