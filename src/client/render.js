// Learn more about this file at:
// https://victorzhou.com/blog/build-an-io-game-part-1/#5-client-rendering
import { debounce } from 'throttle-debounce';
import { getAsset } from './assets';
import BetterCtx from './betterCtx';
import { updateStageInfo } from './stageInfo';
import { canBuyResource, getMaxUnitPurchase, getQuantityBarPurchaseCost, getResources, inBounds } from './utils/general';
import { registerClick, mouseClicked, tickEnd, tickStart, registerDraggableSurface, mouseX, mouseY, registerNonDraggableSurface, registerScrollableSurface, registerNonScrollableSurface, registerNextMouseUpHandler, gameMouseY, gameMouseX, registerNextUnhandledClickHandler, tileMouseX, tileMouseY } from './userInput';


import { emit } from './networking';

import Constants from '../shared/constants';
import { getInternalState, mutateInternalState, getExternalState } from './state';
import { getAdjescentPositions, getAuraPositions, getRingPositions, isAdjescent, isIsolatedPosition, positionInPositionList, resolveTerritoryBlacklist } from '../shared/utils';
import { decayingQuantity, sinusoidalTimeValue } from './utils/math';
import { displayError } from './utils/display';
import { getHoveringTileCoords, mouseInLastCircle, mouseInRect, pointInRect, flipNeighborList, clockwiseDir, getTerritoryDirFrom, getTerritoryDirPositionFrom, getDirectionFromPosToPos, positionCenteredAt } from './utils/geometry';
import { getMe, getUnitById, getById, canUnitMoveTo, getBuildingAtPosition, anythingAtPos, isFriendlyTerritory, updateSmoothScroll, smoothScrollTo } from './utils/game';
import { renderSoldier, renderSoldierAndQuantity, renderUnit, renderVagrantUnit } from './render/soldier';
import { renderProperty } from './render/property';
import { renderBuiltNode } from './render/builtNode';
import { ensurePlacingObjectExists, isPlacingUnit, renderPlacingObject, stopAllPlacing } from './render/placing';
import { computeQuantityBar, drawQuantityBar } from './render/quantityBar';
import { renderContextMenu } from './render/contextMenu';
import { renderCity } from './render/city';

export const canvas = document.getElementById('canvas');
export const ctx = new BetterCtx(canvas.getContext('2d'));

let renderAtTopHandlers = [];

export const RenderConstants = Object.freeze({
  CELL_WIDTH: 100,
  CELL_HEIGHT: 100,
  SIDE_SIZE: () => Math.min(7 / ctx.zoom, 8),
  SOLDIER_PADDING: 10,
  VAGRANT_FIGHTING_INSET: 30,
  BUILDING_PADDING: 10,
});

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

  const { screen, stage } = getExternalState();

  tickStart();

  ensurePlacingObjectExists();

  renderAtTopHandlers = [];

  ctx.fillStyle = "#d4f1f9";
  ctx.abs.fillRect(0, 0, canvas.width, canvas.height);

  if (screen !== 'game') {
    renderMainMenu();

  } else {
    updateSmoothScroll();

    registerMapSurface();

    renderLand();
    
    renderGrid();

    renderTerritory();
    
    if (stage === "pregame") {
      renderSelectStartingPosition();
    }

    if (stage === "game") {
      renderCities();
      renderBuildings();
      renderStructures();

      renderUnits();
      renderVagrantUnits();

      renderPlacingObject();
    }

    renderEscapeMessage();
    renderDisconnectedMessage();

    drawQuantityBar();
  }

  renderAtTopHandlers.forEach(h => h());
  
  renderContextMenu();

  tickEnd();

}

export function renderAtTop(handler) {
  
  renderAtTopHandlers.push(handler);
  
}

function renderBuildings() {

  const { buildings } = getExternalState();

  buildings.forEach(building => {

    renderBuiltNode(building, "building");

  });

}

function renderStructures() {

  const { structures } = getExternalState();

  structures.forEach(structure => {
      
    renderBuiltNode(structure, "structure");

  });

}

function renderEscapeMessage() {

  if (!isPlacingUnit()) return;

  ctx.abs.font = "15px Arial";
  let width = ctx.abs.measureText("Press Escape to cancel").width;

  ctx.abs.fillStyle = "#540017";
  ctx.abs.fillRect(canvas.width/2 - width/2 - 10, 50, width + 20, 40);

  ctx.abs.textAlign = "center";
  ctx.abs.textBaseline = "middle";
  ctx.abs.fillStyle = "#ffffff";
  ctx.abs.fillText("Press Escape to cancel", canvas.width/2, 70);

}

function renderDisconnectedMessage() {

  const { disconnected } = getInternalState();
  if (!disconnected) return;

  ctx.abs.font = "15px Arial";
  let width = ctx.abs.measureText("Disconnected from server").width;

  ctx.abs.fillStyle = "#540017";
  ctx.abs.fillRect(canvas.width/2 - width/2 - 10, 150, width + 20, 40);

  ctx.abs.textAlign = "center";
  ctx.abs.textBaseline = "middle";
  ctx.abs.fillStyle = "#ffffff";
  ctx.abs.fillText("Disconnected from server", canvas.width/2, 170);

}

export function getCostRenderWidth(cost, abs=false) {

  const padding = 4;
  const iconWidth = 13;
  const iconMarginRight = 6;
  const costSeparation = 10;
  const iconHeight = 13;

  if (abs) {
    ctx.abs.font = iconHeight + "px Verdana";
  } else {
    ctx.fontSize = iconHeight;
  }

  const cumTextWidth = Object.values(cost).reduce((total, quantity) => total + ctx.measureText(quantity).width, 0);

  const boxWidth = padding*2 + Object.keys(cost).length * (iconWidth + iconMarginRight + costSeparation) + cumTextWidth - costSeparation;

  return boxWidth;

}

export function renderCost(cost, x, y, transparent=false, abs=false) {

  // delete null values from object cost
  for (let key in cost) {
    if (cost[key] === null) {
      delete cost[key];
    }
  }

  const padding = 4;
  const iconWidth = 13;
  const iconHeight = 13;
  const iconMarginRight = 6;
  const costSeparation = 10;

  let useCtx = ctx;

  if (abs) {
    useCtx = ctx.abs;
    useCtx.font = iconHeight + "px Verdana";
  } else {
    ctx.fontSize = iconHeight;
  }
  const cumTextWidth = Object.values(cost).reduce((total, quantity) => total + useCtx.measureText(quantity).width, 0);

  const boxWidth = padding*2 + Object.keys(cost).length * (iconWidth + iconMarginRight + costSeparation) + cumTextWidth - costSeparation;
  
  x -= boxWidth/2;
  
  useCtx.fillStyle = "#404040";
  if (!transparent) useCtx.fillRect(x, y, boxWidth, iconHeight + padding*2);

  Object.keys(cost).forEach((resource, i) => {

    const image = getAsset(resource);
    const quantity = cost[resource];

    const textWidth = useCtx.measureText(quantity).width;

    const thisX = x + padding + i * (iconWidth + iconMarginRight + costSeparation + textWidth);
    const thisY = y + padding;

    useCtx.drawImage(image, thisX, thisY, iconWidth, iconHeight);

    useCtx.fillStyle = "#ffffff";
    useCtx.textAlign = "left";
    useCtx.textBaseline = "middle";
    useCtx.fillText(quantity, thisX + iconWidth + iconMarginRight, thisY + iconHeight/2 + 1);

  });

}

function renderCities() {

  const { cities } = getExternalState();

  cities.forEach(city => {

    renderCity(city);

  });

}

function renderVagrantUnits() {

  const { vagrantUnits } = getExternalState();

  vagrantUnits.forEach((vagrantUnit) => {

    renderVagrantUnit(vagrantUnit);

  });

}

function registerMapSurface() {
  registerDraggableSurface((dx, dy) => {

    ctx.offsetX += dx;
    ctx.offsetY += dy;

  });

  registerScrollableSurface((dy) => {
    let scale = dy * -0.003;

    let previousZoom = ctx.zoom;
    let nextZoom = previousZoom + scale;

    nextZoom = Math.max(0.4, nextZoom);
    nextZoom = Math.min(4, nextZoom);

    ctx.zoom = nextZoom;

    ctx.offsetX = mouseX - (mouseX - ctx.offsetX) * nextZoom / previousZoom;
    ctx.offsetY = mouseY - (mouseY - ctx.offsetY) * nextZoom / previousZoom;
  });
}

function recomputeTerritoryNeighbors() {

  const { territory, gridDimensions } = getExternalState();
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

  recomputeTerritoryNeighbors();

  const { players, territory } = getExternalState();
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
            const firstStep = getTerritoryDirPositionFrom(x, y, dir);
            const diagonal = getTerritoryDirFrom(firstStep.x, firstStep.y, nextDir);

            if (diagonal !== playerId) {
              drawCornerDirMap[dir](x, y);
            }
          }
        });

        const max = 0.4;

        ctx.globalAlpha = 0.4 * Math.min(max / 0.4, 0.6 / ctx.zoom);
        ctx.fillRect(x * RenderConstants.CELL_WIDTH, y * RenderConstants.CELL_HEIGHT, RenderConstants.CELL_WIDTH, RenderConstants.CELL_HEIGHT);
        ctx.globalAlpha = 1;

      }
    });
  });
  
}

function renderSelectStartingPosition() {
  const { players, gridDimensions, playerId, land } = getExternalState();
  const { width, height } = gridDimensions;

  for (let x = 0; x < width; x++) {
    for (let y = 0; y < height; y++) {

      let auraRect = {
        x: (x-1) * RenderConstants.CELL_WIDTH,
        y: (y-1) * RenderConstants.CELL_HEIGHT,
        width: RenderConstants.CELL_WIDTH*3,
        height: RenderConstants.CELL_HEIGHT*3,
      };

      let rect = {
        x: x * RenderConstants.CELL_WIDTH,
        y: y * RenderConstants.CELL_HEIGHT,
        width: RenderConstants.CELL_WIDTH,
        height: RenderConstants.CELL_HEIGHT,
      };

      if (mouseInRect(rect)) {

        let canPlaceHere = isIsolatedPosition({x, y}, players.filter(p => p.id != playerId).map(p => p.startingPos).filter(s => s != null));
        
        const tile = land[y][x];
        if (tile == "water" || tile == "oil") canPlaceHere = false;

        ctx.globalAlpha = 0.4;
        ctx.fillStyle = "black";
        ctx.fillRect(rect);

        ctx.globalAlpha = 0.3;
        ctx.fillStyle = "green";
        if (!canPlaceHere) ctx.fillStyle = "red";
        ctx.fillRect(auraRect);
        ctx.globalAlpha = 1;

        if (canPlaceHere && mouseClicked) {
          registerClick(() => {
            emit(Constants.messages.chooseStartingPosition, { x, y });
          });
        }
      }
    }
  }

}

function renderLand() {

  const { land } = getExternalState();

  land.forEach((row, y) => {
    row.forEach((cell, x) => {

      let asset = getAsset(cell == "oil" ? "oilTile" : cell);

      ctx.drawImage(asset, x * RenderConstants.CELL_WIDTH, y * RenderConstants.CELL_HEIGHT, RenderConstants.CELL_WIDTH, RenderConstants.CELL_HEIGHT);
    
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
  const { gridDimensions } = getExternalState();
  const { width, height } = gridDimensions;

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

  const { units } = getExternalState();

  units.forEach(unit => {

    let rect = renderUnit(unit);
  
  });

}
