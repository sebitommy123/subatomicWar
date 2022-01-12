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
import { getMe, getUnitById, getById, canUnitMoveTo, getBuildingAtPosition, anythingAtPos } from './utils/game';
import { renderSoldier, renderSoldierAndQuantity, renderUnit, renderVagrantUnit } from './render/soldier';
import { renderProperty } from './render/property';
import { renderBuiltNode } from './render/builtNode';
import { isPlacingUnit, renderPlacingObject, stopAllPlacing } from './render/placing';
import { computeQuantityBar, drawQuantityBar } from './render/quantityBar';

let animationTickCounter = 0;
let animationTick = 0;
export const canvas = document.getElementById('canvas');
export const ctx = new BetterCtx(canvas.getContext('2d'));

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

  ctx.fillStyle = "#d4f1f9";
  ctx.abs.fillRect(0, 0, canvas.width, canvas.height);

  if (screen !== 'game') {
    renderMainMenu();

  } else {
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

      renderingHoveringTile();

      renderUnits();
      renderVagrantUnits();

      renderPlacingObject();

      // renderPurchasingUnit();
      // renderPurchasingBuilding();
      // renderPurchasingCity();
      // renderPurchasingStructure();
    }

    renderEscapeMessage();

    drawQuantityBar();
  }

  tickEnd();

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

export function renderCost(cost, x, y) {

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

  ctx.fontSize = iconHeight;
  const cumTextWidth = Object.values(cost).reduce((total, quantity) => total + ctx.measureText(quantity).width, 0);

  const boxWidth = padding*2 + Object.keys(cost).length * (iconWidth + iconMarginRight + costSeparation) + cumTextWidth - costSeparation;
  
  x -= boxWidth/2;
  
  ctx.fillStyle = "#404040";
  ctx.fillRect(x, y, boxWidth, iconHeight + padding*2);

  Object.keys(cost).forEach((resource, i) => {

    const image = getAsset(resource);
    const quantity = cost[resource];

    const textWidth = ctx.measureText(quantity).width;

    const thisX = x + padding + i * (iconWidth + iconMarginRight + costSeparation + textWidth);
    const thisY = y + padding;

    ctx.drawImage(image, thisX, thisY, iconWidth, iconHeight);

    ctx.fillStyle = "#ffffff";
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    ctx.fillText(quantity, thisX + iconWidth + iconMarginRight, thisY + iconHeight/2);

  });

}

function renderPurchasingCity() {

  const { land, shopItems, cities, units, playerId, territory, gridDimensions } = getExternalState();
  const { buyingCity } = getInternalState();
  
  if (!buyingCity) return;

  let tileX = tileMouseX();
  let tileY = tileMouseY();

  if (!inBounds(tileX, tileY, gridDimensions.width, gridDimensions.height)) return;

  let itemBuying = shopItems.find(item => item.type == "city");

  let canBuy = canBuyResource(itemBuying.cost, getResources());

  let unitAtPos = units.find(unit => unit.playerId == playerId && unit.x == tileX && unit.y == tileY);
  if (unitAtPos && unitAtPos.fighting) canBuy = false;

  let isIsolated = isIsolatedPosition({x: tileX, y: tileY}, cities.map(city => ({x: city.x, y: city.y})));
  if (!isIsolated) canBuy = false;
  
  if (territory[tileY][tileX] !== playerId) canBuy = false;

  const { allowed } = resolveTerritoryBlacklist(itemBuying.blacklist, land[tileY][tileX]);
  if (!allowed) canBuy = false;

  if (mouseClicked) {
    registerClick(() => {

      emit(Constants.messages.buyFromShop, {
        itemId: itemBuying.id,
        x: tileX,
        y: tileY
      });

      mutateInternalState(state => {
        state.buyingCity = null;
      });
  
    });
  }
  
  ctx.globalAlpha = 0.3;
  ctx.fillStyle = "green";

  if (!canBuy) ctx.fillStyle = "red";

  ctx.fillRect(tileX * RenderConstants.CELL_WIDTH, tileY * RenderConstants.CELL_HEIGHT, RenderConstants.CELL_WIDTH, RenderConstants.CELL_HEIGHT);
  ctx.globalAlpha = 1;

  let asset = getAsset("city");

  let rect = drawBuilding(asset, tileX, tileY);

  ctx.globalAlpha = 0.9;
  renderCost(itemBuying.cost, rect.x + rect.width/2, rect.y + rect.height * 0.7);
  ctx.globalAlpha = 1;

}

function renderPurchasingBuilding() {

  const { land, shopItems, buildings, cities, units, playerId, territory, gridDimensions } = getExternalState();
  const { buyingBuilding } = getInternalState();
  
  if (!buyingBuilding) return;

  let tileX = tileMouseX();
  let tileY = tileMouseY();

  if (!inBounds(tileX, tileY, gridDimensions.width, gridDimensions.height)) return false;

  let itemBuying = shopItems.find(item => item.id == buyingBuilding);

  let canBuy = canBuyResource(itemBuying.cost, getResources());

  let unitAtPos = units.find(unit => unit.playerId == playerId && unit.x == tileX && unit.y == tileY);
  if (unitAtPos && unitAtPos.fighting) canBuy = false;

  if (anythingAtPos(tileX, tileY)) canBuy = false;
  
  if (territory[tileY][tileX] !== playerId) canBuy = false;

  let auras = getAuraPositions(cities.map(city => ({ x: city.x, y: city.y })));
  if (!positionInPositionList({ x: tileX, y: tileY }, auras)) canBuy = false;

  const { allowed, efficiency } = resolveTerritoryBlacklist(itemBuying.blacklist, land[tileY][tileX]);
  if (!allowed) canBuy = false;

  if (mouseClicked) {
    registerClick(() => {
  
      if (territory[tileY][tileX] !== playerId) {

        displayError("You can only place buildings in your territory.");

        return;

      }

      emit(Constants.messages.buyFromShop, {
        itemId: itemBuying.id,
        x: tileX,
        y: tileY
      });

      mutateInternalState(state => {
        state.buyingBuilding = null;
      });
  
    });
  }
  
  ctx.globalAlpha = 0.3;
  ctx.fillStyle = "green";

  if (!canBuy) ctx.fillStyle = "red";

  ctx.fillRect(tileX * RenderConstants.CELL_WIDTH, tileY * RenderConstants.CELL_HEIGHT, RenderConstants.CELL_WIDTH, RenderConstants.CELL_HEIGHT);
  ctx.globalAlpha = 1;

  let asset = getAsset(itemBuying.image.split(".")[0]);

  let rect = drawBuilding(asset, tileX, tileY);

  ctx.globalAlpha = 0.9;
  renderCost(itemBuying.cost, rect.x + rect.width/2, rect.y + rect.height * 0.7);
  ctx.globalAlpha = 1;

  if (efficiency) {

    let showEfficiency = Math.floor(efficiency * 100);
    let message;
    if (showEfficiency > 100) {
      showEfficiency -= 100;
      showEfficiency = `+${showEfficiency}%`;
      message = "higher rates";
      ctx.fillStyle = "#005c15";
    } else if (showEfficiency < 100) {
      showEfficiency = 100 - showEfficiency;
      showEfficiency = `-${showEfficiency}%`;
      message = "lower rates";
      ctx.fillStyle = "#5c0000";
    }

    message = `${itemBuying.name}s yield ${showEfficiency} ${message} in ${land[tileY][tileX]} tiles`;
    
    let fontSize = 4;
    ctx.fontSize = fontSize;
    let textWidth = ctx.measureText(message).width;
    
    let innerMargin = 3;
    let innerPadding = 3;
    let marginBottom = 6;

    let boxWidth = 22;

    let totalWidth = boxWidth + innerMargin + innerPadding*2 + textWidth;
    let totalHeight = innerPadding * 2 + fontSize;
    let totalY = rect.y - marginBottom - totalHeight;

    let boxX = rect.x + rect.width/2 - totalWidth/2;
    ctx.fillRect(boxX, totalY, boxWidth, totalHeight);

    ctx.fillStyle = "#404040";
    ctx.fillRect(boxX + boxWidth + innerMargin, totalY, innerPadding*2 + textWidth, totalHeight);

    ctx.textBaseline = "middle";
    ctx.textAlign = "center";
    ctx.fillStyle = "white";
    ctx.fillText(message, boxX + boxWidth + innerMargin + innerPadding + textWidth/2, totalY + innerPadding + fontSize/2);

    ctx.fontSize = 5;
    ctx.fillText(showEfficiency, boxX + boxWidth/2, totalY + totalHeight/2);

  }

}

function renderPurchasingStructure() {

  const { land, shopItems, buildings, cities, units, playerId, territory, gridDimensions } = getExternalState();
  const { buyingStructure } = getInternalState();
  
  if (!buyingStructure) return;

  let tileX = tileMouseX();
  let tileY = tileMouseY();

  if (!inBounds(tileX, tileY, gridDimensions.width, gridDimensions.height)) return false;

  let itemBuying = shopItems.find(item => item.id == buyingStructure);

  let canBuy = canBuyResource(itemBuying.cost, getResources());

  let unitAtPos = units.find(unit => unit.playerId == playerId && unit.x == tileX && unit.y == tileY);
  if (unitAtPos && unitAtPos.fighting) canBuy = false;

  if (anythingAtPos(tileX, tileY)) canBuy = false;
  
  if (territory[tileY][tileX] !== playerId) canBuy = false;

  const { allowed, efficiency } = resolveTerritoryBlacklist(itemBuying.blacklist, land[tileY][tileX]);
  if (!allowed) canBuy = false;

  if (mouseClicked) {
    registerClick(() => {
  
      if (territory[tileY][tileX] !== playerId) {

        displayError("You can only place buildings in your territory.");

        return;

      }

      emit(Constants.messages.buyFromShop, {
        itemId: itemBuying.id,
        x: tileX,
        y: tileY
      });
  
    });
  }
  
  ctx.globalAlpha = 0.3;
  ctx.fillStyle = "green";

  if (!canBuy) ctx.fillStyle = "red";

  ctx.fillRect(tileX * RenderConstants.CELL_WIDTH, tileY * RenderConstants.CELL_HEIGHT, RenderConstants.CELL_WIDTH, RenderConstants.CELL_HEIGHT);
  ctx.globalAlpha = 1;

  let asset = getAsset(itemBuying.image.split(".")[0]);

  let rect = drawBuilding(asset, tileX, tileY);

  ctx.globalAlpha = 0.9;
  renderCost(itemBuying.cost, rect.x + rect.width/2, rect.y + rect.height * 0.7);
  ctx.globalAlpha = 1;

  if (efficiency) {

    let showEfficiency = Math.floor(efficiency * 100);
    let message;
    if (showEfficiency > 100) {
      showEfficiency -= 100;
      showEfficiency = `+${showEfficiency}%`;
      message = "higher rates";
      ctx.fillStyle = "#005c15";
    } else if (showEfficiency < 100) {
      showEfficiency = 100 - showEfficiency;
      showEfficiency = `-${showEfficiency}%`;
      message = "lower rates";
      ctx.fillStyle = "#5c0000";
    }

    message = `${itemBuying.name}s yield ${showEfficiency} ${message} in ${land[tileY][tileX]} tiles`;
    
    let fontSize = 4;
    ctx.fontSize = fontSize;
    let textWidth = ctx.measureText(message).width;
    
    let innerMargin = 3;
    let innerPadding = 3;
    let marginBottom = 6;

    let boxWidth = 22;

    let totalWidth = boxWidth + innerMargin + innerPadding*2 + textWidth;
    let totalHeight = innerPadding * 2 + fontSize;
    let totalY = rect.y - marginBottom - totalHeight;

    let boxX = rect.x + rect.width/2 - totalWidth/2;
    ctx.fillRect(boxX, totalY, boxWidth, totalHeight);

    ctx.fillStyle = "#404040";
    ctx.fillRect(boxX + boxWidth + innerMargin, totalY, innerPadding*2 + textWidth, totalHeight);

    ctx.textBaseline = "middle";
    ctx.textAlign = "center";
    ctx.fillStyle = "white";
    ctx.fillText(message, boxX + boxWidth + innerMargin + innerPadding + textWidth/2, totalY + innerPadding + fontSize/2);

    ctx.fontSize = 5;
    ctx.fillText(showEfficiency, boxX + boxWidth/2, totalY + totalHeight/2);

  }

}

function drawBuilding(asset, x, y) {

  ctx.drawImage(asset, x * RenderConstants.CELL_WIDTH + RenderConstants.BUILDING_PADDING, y * RenderConstants.CELL_HEIGHT + RenderConstants.BUILDING_PADDING, RenderConstants.CELL_WIDTH - RenderConstants.BUILDING_PADDING*2, RenderConstants.CELL_HEIGHT - RenderConstants.BUILDING_PADDING*2);

  return {
    x: x * RenderConstants.CELL_WIDTH + RenderConstants.BUILDING_PADDING,
    y: y * RenderConstants.CELL_HEIGHT + RenderConstants.BUILDING_PADDING,
    width: RenderConstants.CELL_WIDTH - RenderConstants.BUILDING_PADDING*2,
    height: RenderConstants.CELL_HEIGHT - RenderConstants.BUILDING_PADDING*2
  };

}

function renderCities() {

  const { territory, playerId, gridDimensions, cities } = getExternalState();

  cities.forEach(city => {

    let { x, y, population, turnsLeft, id } = city;

    drawBuilding(getAsset("city"), x, y);

    if (territory[y][x] !== playerId) return;

    let ringPositions = getRingPositions({ x, y }).filter(pos => inBounds(pos.x, pos.y, gridDimensions.width, gridDimensions.height)).filter(pos => territory[pos.y][pos.x] == playerId);
    let farms = ringPositions.filter(pos => {
      let b = getBuildingAtPosition(pos.x, pos.y);
      return b && territory[pos.y][pos.x] == playerId && b.type.name == "Farm";
    });

    let turnSpeed = 4 ** farms.length;

    ctx.fontSize = 8;
    ctx.textBaseline = "middle";
    ctx.textAlign = "center";
    ctx.fillStyle = "black";
    ctx.fillCircle(x * RenderConstants.CELL_WIDTH + RenderConstants.CELL_WIDTH/2 - 24, (y+1) * RenderConstants.CELL_HEIGHT - 7, 7)

    ctx.fillStyle = "white";
    ctx.fillText(population, x * RenderConstants.CELL_WIDTH + RenderConstants.CELL_WIDTH/2 - 24, (y+1) * RenderConstants.CELL_HEIGHT - 7);

    let turnsLeftEstimate = Math.ceil(turnsLeft / turnSpeed);
    ctx.textAlign = "left";
    ctx.fillStyle = "black";
    ctx.fontSize = 6;
    ctx.fillText(turnsLeftEstimate + " days until growth", x * RenderConstants.CELL_WIDTH + RenderConstants.CELL_WIDTH/2 - 15, (y+1) * RenderConstants.CELL_HEIGHT - 7)

  });

}

function renderVagrantUnits() {

  const { vagrantUnits } = getExternalState();

  vagrantUnits.forEach((vagrantUnit) => {

    renderVagrantUnit(vagrantUnit);

  });

}

function renderingHoveringTile() {

  const { units } = getExternalState();
  const { draggingUnit, selectedUnit } = getInternalState();

  if (draggingUnit && selectedUnit) {

    const { x: fromX, y: fromY } = getUnitById(selectedUnit);

    const possibleTiles = getAdjescentPositions({ x: fromX, y: fromY });

    possibleTiles.push({ x: fromX, y: fromY });

    possibleTiles.forEach(({ x: posX, y: posY }) => {
      ctx.fillStyle = "#00ff00";
      ctx.globalAlpha = 0.3;

      if (!canUnitMoveTo(getUnitById(selectedUnit), posX, posY)) return;

      ctx.fillRect(posX * RenderConstants.CELL_WIDTH, posY * RenderConstants.CELL_HEIGHT, RenderConstants.CELL_WIDTH, RenderConstants.CELL_HEIGHT);
    });

    const { x: toX, y: toY } = getHoveringTileCoords();

    ctx.fillStyle = "#00ff00";
    if (!canUnitMoveTo(getUnitById(selectedUnit), toX, toY)) {
      ctx.fillStyle = "#ff0000";
    }
    ctx.globalAlpha = 0.5;

    ctx.fillRect(toX * RenderConstants.CELL_WIDTH, toY * RenderConstants.CELL_HEIGHT, RenderConstants.CELL_WIDTH, RenderConstants.CELL_HEIGHT);

    ctx.globalAlpha = 1;

  }

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

function renderChangeNumber(change, progress, x, y, compact) {

  ctx.globalAlpha = 1 - progress;
  let sign = change >= 0 ? "+" : "";
  if (change < 0) {
    ctx.fillStyle = "#540101";
  } else {
    ctx.fillStyle = "#015416";
  }

  let yChange = RenderConstants.CELL_HEIGHT * 0.5;

  ctx.fontSize = compact ? 7 : 20;

  ctx.fillCircle(x, y - decayingQuantity(yChange, progress) + yChange, compact ? 6 : 20);
  
  ctx.fillStyle = "white";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(sign + change, x, y - decayingQuantity(yChange, progress) + yChange);
  ctx.globalAlpha = 1;

}
