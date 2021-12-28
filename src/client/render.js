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
import { getById, getInternalState, getMe, mutateInternalState, flipNeighborList, clockwiseDir, getTerritoryDirFrom, getTerritoryDirPositionFrom } from './state';

let renderingState;
export const canvas = document.getElementById('canvas');
export const ctx = new BetterCtx(canvas.getContext('2d'));

export const RenderConstants = Object.freeze({
  CELL_WIDTH: 100,
  CELL_HEIGHT: 100,
  SIDE_SIZE: () => 7 / ctx.zoom
});

let clickHandler = null;

function registerClick(handler) {
  clickHandler = handler;
}

export function setRenderingState(newState) {

  let lastState = renderingState;

  renderingState = newState;

  if (newState.territory && lastState.territory != newState.territory) {
    recomputeTerritoryNeighbors();
  }

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
      drawQuantityBar();
    }

  }

  if (clickHandler) {
    clickHandler();
  }

  tickEnd();

}

function drawQuantityBar() {

  const marginRight = 75;
  const barWidth = 50;

  const marginTop = 150;
  const marginBottom = 200;

  const barHeight = canvas.height - marginBottom - marginTop;

  const backgroundPadding = 3;
  ctx.fillStyle = "#d4f1f9";
  ctx.abs.fillRect(canvas.width - marginRight - barWidth - backgroundPadding, marginTop - backgroundPadding, barWidth + backgroundPadding*2, barHeight + backgroundPadding*2)
  
  ctx.fillStyle = "#404040";
  ctx.abs.fillRect(canvas.width - marginRight - barWidth, marginTop, barWidth, barHeight);

  const filledPercentage = 0.6;
  const filledHeight = barHeight * filledPercentage;

  ctx.fillStyle = "#70AD47";
  ctx.abs.fillRect(canvas.width - marginRight - barWidth, marginTop + (barHeight - filledHeight), barWidth, filledHeight)

  ctx.strokeStyle = "#d4f1f9";
  ctx.abs.beginPath();
  ctx.abs.lineWidth = 3;
  ctx.abs.moveTo(canvas.width - marginRight - barWidth, marginTop + (barHeight - filledHeight));
  ctx.abs.lineTo(canvas.width - marginRight, marginTop + (barHeight - filledHeight));
  ctx.abs.stroke();

}

function recomputeTerritoryNeighbors() {

  const { territory, gridDimensions } = renderingState;
  const { width, height } = gridDimensions;

  mutateInternalState(state => {
    state.territoryNeighbors = [];

    for (let y = 0; y < height; y++) {

      state.territoryNeighbors.push([]);

      for (let x = 0; x < width; x++) {

        let neighbors = [];

        if (x > 0 && territory[y][x-1] === territory[y][x]) {
          neighbors.push("left");
        }
        if (y > 0 && territory[y-1][x] === territory[y][x]) {
          neighbors.push("top")
        }
        if (x < width - 1 && territory[y][x+1] === territory[y][x]) {
          neighbors.push("right");
        }
        if (y < height - 1 && territory[y+1][x] === territory[y][x]) {
          neighbors.push("bottom")
        }

        state.territoryNeighbors[y].push(neighbors);

      }
    }

  });

}

function renderTerritory() {

  function renderRightSide(x, y) {
    ctx.fillRect(x * RenderConstants.CELL_WIDTH + RenderConstants.CELL_WIDTH - RenderConstants.SIDE_SIZE(), y * RenderConstants.CELL_HEIGHT, RenderConstants.SIDE_SIZE(), RenderConstants.CELL_HEIGHT);
  }
  function renderLeftSide(x, y) {
    ctx.fillRect(x * RenderConstants.CELL_WIDTH, y * RenderConstants.CELL_HEIGHT, RenderConstants.SIDE_SIZE(), RenderConstants.CELL_HEIGHT);
  }
  function renderTopSide(x, y) {
    ctx.fillRect(x * RenderConstants.CELL_WIDTH, y * RenderConstants.CELL_HEIGHT, RenderConstants.CELL_WIDTH, RenderConstants.SIDE_SIZE());
  }
  function renderBottomSide(x, y) {
    ctx.fillRect(x * RenderConstants.CELL_WIDTH, y * RenderConstants.CELL_HEIGHT + RenderConstants.CELL_HEIGHT - RenderConstants.SIDE_SIZE(), RenderConstants.CELL_WIDTH, RenderConstants.SIDE_SIZE());
  }
  
  function renderLeftTopCorner(x, y) {
    ctx.fillRect(x * RenderConstants.CELL_WIDTH, y * RenderConstants.CELL_HEIGHT, RenderConstants.SIDE_SIZE(), RenderConstants.SIDE_SIZE());
  }
  function renderTopRightCorner(x, y) {
    ctx.fillRect(x * RenderConstants.CELL_WIDTH + RenderConstants.CELL_WIDTH - RenderConstants.SIDE_SIZE(), y * RenderConstants.CELL_HEIGHT, RenderConstants.SIDE_SIZE(), RenderConstants.SIDE_SIZE());
  }
  function renderRightBottomCorner(x, y) {
    ctx.fillRect(x * RenderConstants.CELL_WIDTH + RenderConstants.CELL_WIDTH - RenderConstants.SIDE_SIZE(), y * RenderConstants.CELL_HEIGHT + RenderConstants.CELL_HEIGHT - RenderConstants.SIDE_SIZE(), RenderConstants.SIDE_SIZE(), RenderConstants.SIDE_SIZE());
  }
  function renderBottomLeftCorner(x, y) {
    ctx.fillRect(x * RenderConstants.CELL_WIDTH, y * RenderConstants.CELL_HEIGHT + RenderConstants.CELL_HEIGHT - RenderConstants.SIDE_SIZE(), RenderConstants.SIDE_SIZE(), RenderConstants.SIDE_SIZE());
  }

  const { players, territory } = renderingState;
  const { territoryNeighbors } = getInternalState();

  territory.forEach((row, y) => {
    row.forEach((playerId, x) => {
      if (playerId) {        
        let color = getById(playerId, players).color;
        ctx.fillStyle = color;
        
        const neighbors = territoryNeighbors[y][x];
        const nonNeighbors = flipNeighborList(neighbors);

        const drawDirMap = {
          "left": renderLeftSide,
          "top": renderTopSide,
          "right": renderRightSide,
          "bottom": renderBottomSide,
        };

        const drawCornerDirMap = {
          "left": renderLeftTopCorner,
          "top": renderTopRightCorner,
          "right": renderRightBottomCorner,
          "bottom": renderBottomLeftCorner,
        };

        nonNeighbors.forEach(dir => {
          drawDirMap[dir](x, y);
        });

        neighbors.forEach(dir => {
          const nextDir = clockwiseDir(dir);
          if (neighbors.includes(nextDir)) {
            const firstStep = getTerritoryDirPositionFrom(territory, x, y, dir);
            const diagonal = getTerritoryDirFrom(territory, firstStep.x, firstStep.y, nextDir);

            if (diagonal !== playerId) {
              drawCornerDirMap[dir](x, y);
            }
          }
        });

      }
    });
  });

  territory.forEach((row, y) => {
    row.forEach((playerId, x) => {
      if (playerId) {        
        let color = getById(playerId, players).color;
        ctx.fillStyle = color;

        ctx.globalAlpha = 0.2;
        ctx.fillRect(x * RenderConstants.CELL_WIDTH, y * RenderConstants.CELL_HEIGHT, RenderConstants.CELL_WIDTH, RenderConstants.CELL_HEIGHT);
        ctx.globalAlpha = 1;
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
        ctx.fillStyle = "#4fb7ff";
        if ((x + y) % 2 == 0) {
          ctx.fillStyle = "#4fb7df";
        }
      }
      else if (cell == "grass") {
        ctx.fillStyle = "#7EC850";
        if ((x + y) % 2 == 0) {
          ctx.fillStyle = "#8ECF50";
        }
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