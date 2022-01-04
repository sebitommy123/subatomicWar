// Learn more about this file at:
// https://victorzhou.com/blog/build-an-io-game-part-1/#5-client-rendering
import { debounce } from 'throttle-debounce';
import { getAsset } from './assets';
import BetterCtx from './betterCtx';
import { updateStageInfo } from './stageInfo';
import { registerClick, mouseClicked, tickEnd, tickStart, registerDraggableSurface, mouseX, mouseY, registerNonDraggableSurface, registerScrollableSurface, registerNonScrollableSurface, registerNextMouseUpHandler, gameMouseY, gameMouseX, registerNextUnhandledClickHandler, tileMouseX, tileMouseY, stopAllPlacing } from './userInput';
import { canBuyResource, decayingQuantity, displayError, getHoveringTileCoords, getMaxUnitPurchase, getQuantityBarAmount, getQuantityBarPurchaseCost, getResources, inBounds, mouseInLastRect, mouseInRect, pointInRect, sinusoidalTimeValue } from './utils';
import { emit } from './networking';

import Constants from '../shared/constants';
import { getById, getInternalState, getMe, mutateInternalState, flipNeighborList, clockwiseDir, getTerritoryDirFrom, getTerritoryDirPositionFrom, getDirectionFromPosToPos } from './state';
import { getAdjescentPositions, getAuraPositions, getRingPositions, isAdjescent, isIsolatedPosition, positionInPositionList, resolveTerritoryBlacklist } from '../shared/utils';

let animationTickCounter = 0;
let animationTick = 0;
let renderingState;
export const canvas = document.getElementById('canvas');
export const ctx = new BetterCtx(canvas.getContext('2d'));

export const RenderConstants = Object.freeze({
  CELL_WIDTH: 100,
  CELL_HEIGHT: 100,
  SIDE_SIZE: () => Math.min(7 / ctx.zoom, 8),
  SOLDIER_PADDING: 10,
  VAGRANT_FIGHTING_INSET: 0.7,
  BUILDING_PADDING: 10,
});

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

  tickStart();

  if (renderingState.screen === "game" && renderingState.stage === "game") {

    const { selectedUnit } = getInternalState();
    if (selectedUnit && !getUnitById(selectedUnit)) {
      stopAllPlacing();
    }

  }

  ctx.fillStyle = "#d4f1f9";
  ctx.abs.fillRect(0, 0, canvas.width, canvas.height);

  if (renderingState.screen !== 'game') {
    renderMainMenu();

  } else {
    registerMapSurface();

    renderLand();
    
    renderGrid();

    renderTerritory();
    
    if (renderingState.stage === "pregame") {
      renderSelectStartingPosition();
      updateStageInfo();
    }

    if (renderingState.stage === "game") {
      renderCities();
      renderBuildings();

      renderingHoveringTile();

      renderUnits();
      renderDraggingUnit();
      renderVagrantUnits();

      renderPurchasingUnit();
      renderPurchasingBuilding();
      renderPurchasingCity();
    }

    renderEscapeMessage();

    computeQuantityBar();
    drawQuantityBar();
  }

  tickEnd();

}

function renderBuildings() {

  const { buildings } = renderingState;

  buildings.forEach(building => {
      
    let { x, y, type } = building;

    let asset = getAsset(type.image.split('.')[0]);

    drawBuilding(asset, x, y);

  });

}

function renderEscapeMessage() {

  const { draggingUnit, selectedUnit, buyingUnit, buyingBuilding, buyingCity } = getInternalState();

  if (!draggingUnit && !selectedUnit && !buyingUnit && !buyingBuilding && !buyingCity) return;

  ctx.abs.font = "15px Arial";
  let width = ctx.abs.measureText("Press Escape to cancel").width;

  ctx.abs.fillStyle = "#540017";
  ctx.abs.fillRect(canvas.width/2 - width/2 - 10, 50, width + 20, 40);

  ctx.abs.textAlign = "center";
  ctx.abs.textBaseline = "middle";
  ctx.abs.fillStyle = "#ffffff";
  ctx.abs.fillText("Press Escape to cancel", canvas.width/2, 70);

}

function renderCost(cost, x, y) {

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

function renderPurchasingUnit() {

  const { shopItems, units, playerId, territory, gridDimensions } = renderingState;
  const { buyingUnit, quantityBar } = getInternalState();
  
  if (!buyingUnit || !quantityBar) return;

  let quantity = getQuantityBarAmount();

  let tileX = tileMouseX();
  let tileY = tileMouseY();

  if (!inBounds(tileX, tileY, gridDimensions.width, gridDimensions.height)) return false;

  let canBuy = getMe().gold >= shopItems.find(item => item.type == "unit").cost.gold;

  if (mouseClicked) {
    registerClick(() => {
  
      if (territory[tileY][tileX] !== playerId) {

        displayError("You can only purchase units in your territory.");

        return;

      }

      emit(Constants.messages.buyFromShop, {
        itemId: shopItems.find(item => item.type == "unit").id,
        quantity: quantity,
        x: tileX,
        y: tileY
      });
  
    });
  }
  
  ctx.globalAlpha = 0.3;
  ctx.fillStyle = "green";

  if (territory[tileY][tileX] !== playerId || !canBuy) ctx.fillStyle = "red";

  ctx.fillRect(tileX * RenderConstants.CELL_WIDTH, tileY * RenderConstants.CELL_HEIGHT, RenderConstants.CELL_WIDTH, RenderConstants.CELL_HEIGHT);
  ctx.globalAlpha = 1;

  let unitAtPos = units.find(unit => unit.playerId == playerId && unit.x == tileX && unit.y == tileY);

  let renderQuantity = quantity;

  if (!canBuy) {
    renderQuantity = 0;
  }

  if (unitAtPos) renderQuantity += unitAtPos.quantity;

  let rect = renderSoldier(tileX, tileY, renderQuantity, true);

  ctx.globalAlpha = 0.9;
  renderCost(getQuantityBarPurchaseCost(shopItems), rect.x + rect.width/2, rect.y + rect.height * 0.7);
  ctx.globalAlpha = 1;

  rect.width *= 0.5;

  if (mouseInRect(rect)) {

    registerScrollableSurface((dy) => {
      mutateInternalState(state => {
        let newVal = state.quantityBar.percentage - dy * 0.003;

        if (newVal > 1) newVal = 1;
        if (newVal < 0) newVal = 0;

        state.quantityBar.percentage = newVal;
      });
    });

  }

}

function renderPurchasingCity() {

  const { land, shopItems, cities, units, playerId, territory, gridDimensions } = renderingState;
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

  const { land, shopItems, buildings, cities, units, playerId, territory, gridDimensions } = renderingState;
  const { buyingBuilding } = getInternalState();
  
  if (!buyingBuilding) return;

  let tileX = tileMouseX();
  let tileY = tileMouseY();

  if (!inBounds(tileX, tileY, gridDimensions.width, gridDimensions.height)) return false;

  let itemBuying = shopItems.find(item => item.id == buyingBuilding);

  let canBuy = canBuyResource(itemBuying.cost, getResources());

  let unitAtPos = units.find(unit => unit.playerId == playerId && unit.x == tileX && unit.y == tileY);
  if (unitAtPos && unitAtPos.fighting) canBuy = false;

  let buildingAtPos = buildings.find(building => building.x == tileX && building.y == tileY);
  if (buildingAtPos) canBuy = false;
  
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

function drawBuilding(asset, x, y) {

  ctx.drawImage(asset, x * RenderConstants.CELL_WIDTH + RenderConstants.BUILDING_PADDING, y * RenderConstants.CELL_HEIGHT + RenderConstants.BUILDING_PADDING, RenderConstants.CELL_WIDTH - RenderConstants.BUILDING_PADDING*2, RenderConstants.CELL_HEIGHT - RenderConstants.BUILDING_PADDING*2);

  return {
    x: x * RenderConstants.CELL_WIDTH + RenderConstants.BUILDING_PADDING,
    y: y * RenderConstants.CELL_HEIGHT + RenderConstants.BUILDING_PADDING,
    width: RenderConstants.CELL_WIDTH - RenderConstants.BUILDING_PADDING*2,
    height: RenderConstants.CELL_HEIGHT - RenderConstants.BUILDING_PADDING*2
  };

}

function getBuildingAtPosition(x, y) {

  const { buildings } = renderingState;

  return buildings.find(building => building.x == x && building.y == y);

}

function renderCities() {

  const { territory, playerId, gridDimensions } = renderingState;

  renderingState.cities.forEach(city => {

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

  const { vagrantUnits, territory, units } = renderingState;
  const { selectedUnit, draggingUnit, quantityBar } = getInternalState();

  vagrantUnits.forEach((vagrantUnit) => {

    let { x, y, quantity, fighting, vagrantData } = vagrantUnit;

    let { toX, toY, start, end } = vagrantData;

    let delta = Date.now() - start;
    let totalDuration = end - start;

    let progress = delta / totalDuration;

    if (progress > 1) progress = 1;

    let current = getVagrantXYCStart(vagrantUnit);
    let goal = getVagrantXYCGoal(vagrantUnit);

    let interpolated = interpolateXYC(current, goal, progress);

    let { x: xPos, y: yPos, c: cPos } = fighting ? goal : interpolated;

    let quantityToDisplay = quantity;
    let occilate = false;

    if (selectedUnit && selectedUnit == vagrantUnit.id) {
      if (draggingUnit && quantityBar) quantityToDisplay = quantityBar.max - getQuantityBarAmount();
      occilate = true;
    }

    let rect = renderSoldier(xPos, yPos, quantityToDisplay, occilate, cPos, getDirectionFromPosToPos(x, y, toX, toY));

    if (fighting && mouseInRect(rect)) {

      handleMouseOverUnit(vagrantUnit, rect);
  
    }

    renderPossibleQuantityChange(vagrantUnit, rect.x + rect.width, rect.y - rect.height * 0.5, cPos===1);

  });

}

function interpolateXYC(start, end, progress) {

  let x = start.x + (end.x - start.x) * progress;
  let y = start.y + (end.y - start.y) * progress;
  let c = start.c + (end.c - start.c) * progress;

  return {x, y, c};

}

function getVagrantXYCStart(vagrantUnit) {

  const { vagrantUnits, territory, units } = renderingState;
  const { selectedUnit, draggingUnit, quantityBar } = getInternalState();

  let { playerId, x, y, quantity, fighting, retreating, vagrant, vagrantData } = vagrantUnit;

  let { toX, toY, start, end } = vagrantData;

  let direction = getDirectionFromPosToPos(x, y, toX, toY);

  let unitAtStart = units.find(unit => unit.x === x && unit.y === y);

  if (retreating) {

    if (direction == "right") return { x: toX - RenderConstants.VAGRANT_FIGHTING_INSET, y: toY, c: 1 };
    if (direction == "left") return { x: toX + RenderConstants.VAGRANT_FIGHTING_INSET, y: toY, c: 1 };
    if (direction == "top") return { x: toX, y: toY + RenderConstants.VAGRANT_FIGHTING_INSET, c: 1 };
    if (direction == "bottom") return { x: toX, y: toY - RenderConstants.VAGRANT_FIGHTING_INSET, c: 1 };

  } else {

    if (unitAtStart && unitAtStart.playerId == playerId && unitAtStart.fighting) {
      return {x: x, y: y, c: 1};
    }

    return {x: x, y: y, c: 0};

  }

}

function getVagrantXYCGoal(vagrantUnit) {

  const { vagrantUnits, territory, units } = renderingState;
  const { selectedUnit, draggingUnit, quantityBar } = getInternalState();

  let { playerId, x, y, quantity, fighting, vagrant, vagrantData } = vagrantUnit;

  let { toX, toY, start, end } = vagrantData;

  let direction = getDirectionFromPosToPos(x, y, toX, toY);

  let enemyAtDestination = false;
  let unitAtDestination = units.find(unit => unit.x === toX && unit.y === toY);
  if (unitAtDestination != null && unitAtDestination.playerId != playerId) {
    enemyAtDestination = true;
  }

  if (!enemyAtDestination && !fighting) {
    if (unitAtDestination) {
      if (unitAtDestination.playerId == playerId && unitAtDestination.fighting) {
        return { x: toX, y: toY, c: 1 };
      }
    }
    return { x: toX, y: toY, c: 0 };
  } else {
    if (direction == "right") return { x: x + RenderConstants.VAGRANT_FIGHTING_INSET, y: y, c: 1 };
    if (direction == "left") return { x: x - RenderConstants.VAGRANT_FIGHTING_INSET, y: y, c: 1 };
    if (direction == "top") return { x: x, y: y - RenderConstants.VAGRANT_FIGHTING_INSET, c: 1 };
    if (direction == "bottom") return { x: x, y: y + RenderConstants.VAGRANT_FIGHTING_INSET, c: 1 };
  }
  
}

function renderingHoveringTile() {

  const { units } = renderingState;
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

function canUnitMoveTo(unit, x, y) {

  const { landTypes, land, gridDimensions } = renderingState;

  const { x: fromX, y: fromY } = unit;

  if (unit.vagrant) {
    return x == fromX && y == fromY;
  }

  if (!inBounds(x, y, gridDimensions.width, gridDimensions.height)) return false;

  if(!isAdjescent({ x: fromX, y: fromY }, { x, y })) return false;

  if (unit.engagedUnits.map(engagedUnitId => getUnitById(engagedUnitId)).some(engagedUnit => engagedUnit.x === x && engagedUnit.y === y)) {
    return false;
  }

  if (!landTypes[land[y][x]].canWalk) return false;

  return true;

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

function computeQuantityBar() {

  const { shopItems } = renderingState;

  mutateInternalState(internalState => {

    let previousConfig = internalState.quantityBar;
    let previousPercentage = previousConfig ? previousConfig.percentage : null;

    internalState.quantityBar = null;

    if (internalState.buyingUnit) {

      if (previousConfig && previousConfig.id != 0) previousPercentage = null;

      let percentage = previousPercentage;
      if (!percentage) {
        percentage = internalState.savedQuantityPercentages.buying;
      }
      internalState.savedQuantityPercentages.buying = percentage;

      internalState.quantityBar = {
        id: 0,
        percentage: percentage,
        max: getMaxUnitPurchase(shopItems),
        units: "units",
        color: "#adad47",
        tip: () => {
          let quantity = getQuantityBarAmount();
          return [
            `BUYING UNITS`,
            `Units to buy: ${quantity}`,
            `Cost: ${getQuantityBarPurchaseCost(shopItems).gold}`,
            `Click on tile to buy`
          ]
        }
      };

    }

    if (internalState.selectedUnit || internalState.draggingUnit) {

      if (previousConfig && previousConfig.id != 1) previousPercentage = null;

      const unit = getUnitById(internalState.selectedUnit);

      let percentage = previousPercentage;
      if (!percentage) {
        percentage = internalState.savedQuantityPercentages.unit;
      }
      internalState.savedQuantityPercentages.unit = percentage;

      internalState.quantityBar = {
        id: 1,
        percentage: percentage,
        max: unit.quantity,
        units: "units",
        color: "#70AD47",
        tip: () => {
          let quantity = getQuantityBarAmount();
          return [
            `MOVING UNITS`,
            `Units to move: ${quantity}`,
            `Units left over: ${unit.quantity - quantity}`,
            `Drag unit to tile`
          ]
        }
      };

    }

  });

}

function drawQuantityBar() {

  if (!getInternalState().quantityBar) return;

  const { quantityBar } = getInternalState();
  const { percentage, max, color } = quantityBar;
  const tip = quantityBar.tip();

  const marginRight = 75;
  const barWidth = 50;

  const marginTop = 150;
  const marginBottom = 200;

  const barHeight = canvas.height - marginBottom - marginTop;

  // light blue background
  const backgroundPadding = 3;
  ctx.fillStyle = "#d4f1f9";
  ctx.abs.fillRect(canvas.width - marginRight - barWidth - backgroundPadding, marginTop - backgroundPadding, barWidth + backgroundPadding*2, barHeight + backgroundPadding*2)
  
  // dark gray bar
  ctx.fillStyle = "#404040";
  ctx.abs.fillRect(canvas.width - marginRight - barWidth, marginTop, barWidth, barHeight);

  if (pointInRect({ x: mouseX, y: mouseY }, {
    x: canvas.width - marginRight - barWidth, 
    y: marginTop, 
    width: barWidth, 
    height: barHeight
  })) {
    function update() {
      const newFillAbs = barHeight - (mouseY - marginTop);
      let newFillPercent = newFillAbs / barHeight;

      newFillPercent = Math.floor(newFillPercent * 100) / 100;

      if (newFillPercent > 1) newFillPercent = 1;
      if (newFillPercent < 0) newFillPercent = 0.001;

      mutateInternalState(state => {
        state.quantityBar.percentage = newFillPercent;
      });
    }

    registerDraggableSurface(update);
    if (mouseClicked) registerClick(update);

    registerScrollableSurface(dy => {

      mutateInternalState(state => {
        let newVal = state.quantityBar.percentage - dy * 0.003;

        if (newVal > 1) newVal = 1;
        if (newVal < 0) newVal = 0.001;

        state.quantityBar.percentage = newVal;
      });
      
    });
  }

  const filledHeight = barHeight * percentage;

  // green bar
  ctx.fillStyle = color;
  ctx.abs.fillRect(canvas.width - marginRight - barWidth, marginTop + (barHeight - filledHeight), barWidth, filledHeight)

  // separating line
  ctx.strokeStyle = "#d4f1f9";
  ctx.abs.beginPath();
  ctx.abs.lineWidth = 3;
  ctx.abs.moveTo(canvas.width - marginRight - barWidth, marginTop + (barHeight - filledHeight));
  ctx.abs.lineTo(canvas.width - marginRight, marginTop + (barHeight - filledHeight));
  ctx.abs.stroke();

  // text
  const value = getQuantityBarAmount();
  const percentText = Math.floor(percentage * 100) + "%";

  if (filledHeight < barHeight - 40) {

    ctx.fillStyle = "#dddddd";
    ctx.abs.font = "9px Arial";
    ctx.abs.textAlign = "center";
    ctx.abs.textBaseline = "bottom";
    ctx.abs.fillText(percentText, canvas.width - marginRight - barWidth/2 + 1, marginTop + (barHeight - filledHeight) - 18);
    ctx.fillStyle = "#ffffff";
    ctx.abs.font = "13px Arial";
    ctx.abs.fillText(value, canvas.width - marginRight - barWidth/2, marginTop + (barHeight - filledHeight) - 4);
 
  } else {

    ctx.fillStyle = "#dddddd";
    ctx.abs.font = "9px Arial";
    ctx.abs.textAlign = "center";
    ctx.abs.textBaseline = "top";
    ctx.abs.fillText(percentText, canvas.width - marginRight - barWidth/2 + 1, marginTop + (barHeight - filledHeight) + 20);
    ctx.fillStyle = "#ffffff";
    ctx.abs.font = "13px Arial";
    ctx.abs.fillText(value, canvas.width - marginRight - barWidth/2, marginTop + (barHeight - filledHeight) + 6);

  }

  ctx.fillStyle = "#000000";
  ctx.abs.font = "bold 9px Arial";
  ctx.abs.textBaseline = "bottom";
  ctx.abs.fillText(max + " units", canvas.width - marginRight - barWidth/2, marginTop - backgroundPadding - 2);
  
  ctx.abs.font = "bold 14px Arial";
  ctx.abs.fillText("100%", canvas.width - marginRight - barWidth/2, marginTop - backgroundPadding - 13);

  ctx.fillStyle = "#000000";
  ctx.abs.font = "bold 14px Arial";
  ctx.abs.textBaseline = "top";
  ctx.abs.fillText("0%", canvas.width - marginRight - barWidth/2 + 2, marginTop + barHeight + backgroundPadding + 4);

  const separation = 40;
  const lines = tip.length;
  const lineHeight = 20;
  const tipPadding = 10;
  const tipHeight = lines * lineHeight + tipPadding*2;
  const tipWidth = 140;
  
  ctx.fillStyle = "#404040";
  ctx.abs.fillRect(canvas.width - marginRight - barWidth/2 - tipWidth/2, marginTop - separation - tipHeight, tipWidth, tipHeight);
  if (pointInRect({x: mouseX, y: mouseY}, {
    x: canvas.width - marginRight - barWidth/2 - tipWidth/2, 
    y: marginTop - separation - tipHeight, 
    width: tipWidth, 
    height: tipHeight
  })) {
    registerNonDraggableSurface();
    registerNonScrollableSurface();
  }

  tip.forEach((tip, i) =>  {
    ctx.fillStyle = "white";
    ctx.abs.font = "13px Arial";
    ctx.abs.textAlign = "center";
    ctx.abs.textBaseline = "middle";
    ctx.abs.fillText(tip, canvas.width - marginRight - barWidth/2, marginTop - separation - tipHeight + i * lineHeight + lineHeight/2 + tipPadding);
  });

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
  const { players, gridDimensions, playerId, land } = renderingState;
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

  renderingState.land.forEach((row, y) => {
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

function renderDraggingUnit() {

  const { selectedUnit, draggingUnit, quantityBar } = getInternalState();
  
  if (!selectedUnit || !draggingUnit) return;
  
  if (quantityBar) {
    let quantityToMove = getQuantityBarAmount();
    renderSoldier((gameMouseX + draggingUnit.offsetX) / RenderConstants.CELL_WIDTH, (gameMouseY + draggingUnit.offsetY) / RenderConstants.CELL_HEIGHT, quantityToMove, true, getUnitById(selectedUnit).vagrant);
  }

}

function getSoldierDimensions(padding=RenderConstants.SOLDIER_PADDING) {

  let imgHeight = RenderConstants.CELL_HEIGHT - padding*2;
  let imgWidth = imgHeight * getAsset("soldier").width / getAsset("soldier").height;
  
  return { imgHeight, imgWidth };
}

function renderUnits() {

  const { selectedUnit, draggingUnit, quantityBar } = getInternalState();

  renderingState.units.forEach(unit => {
    let { id, x, y, quantity, fighting, lastQuantity, lastQuantityChange } = unit;

    let quantityToDisplay = quantity;

    if (selectedUnit && selectedUnit == id && draggingUnit && quantityBar) {
      quantityToDisplay = quantityBar.max - getQuantityBarAmount();
    }

    const rect = renderSoldier(x, y, quantityToDisplay, selectedUnit == id, fighting);

    rect.width *= 0.5;

    if (mouseInRect(rect)) {

      handleMouseOverUnit(unit, rect)
  
    }

    renderPossibleQuantityChange(unit, rect.x + rect.width, rect.y - rect.height * 0.5, fighting);
  
  });

}

function renderPossibleQuantityChange(unit, x, y, compact) {
  const { quantity, lastQuantity, lastQuantityChange } = unit;

  if (lastQuantityChange) {

    let changeInUnits = quantity - lastQuantity;

    let delta = Date.now() - lastQuantityChange;

    let totalTime = 1 * 1000;

    let progress = delta / totalTime;

    if (progress > 1) progress = 1;

    renderChangeNumber(changeInUnits, progress, x, y, compact);

  }
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

function renderSoldier(x, y, quantity, occilate, compact=false, arrowLabel=null) {
  let img = getAsset("soldier");

  
  let imgX;
  let imgY;
  let imgWidth;
  let imgHeight;

  let padding = RenderConstants.SOLDIER_PADDING + RenderConstants.SOLDIER_PADDING * 3 * compact;

  if (ctx.zoom > 0.7 || compact) { 
    
    const { imgWidth: renderWidth, imgHeight: renderHeight } = getSoldierDimensions(padding);
    imgX = x * RenderConstants.CELL_WIDTH + (RenderConstants.CELL_WIDTH - renderWidth) / 2;
    imgY = y * RenderConstants.CELL_HEIGHT + padding;
    imgWidth = renderWidth;
    imgHeight = renderHeight;

    if(occilate) ctx.globalAlpha = sinusoidalTimeValue(0.5, 1, 100);
    ctx.drawImage(img, imgX, imgY, renderWidth, renderHeight);
    ctx.globalAlpha = 1;

  } else {
    let renderHeight = 30;
    let renderWidth = renderHeight * 430 / img.height;
    imgX = x * RenderConstants.CELL_WIDTH + (RenderConstants.CELL_WIDTH - renderWidth) / 2;
    imgY = y * RenderConstants.CELL_HEIGHT + RenderConstants.CELL_HEIGHT - padding - renderHeight;
    ctx.drawImage(img, imgX, 2 + imgY, renderWidth, renderHeight);
    ctx.drawImage(img, 15 + imgX, -2 + imgY, renderWidth, renderHeight);
    ctx.drawImage(img, -10 + imgX, -4 + imgY, renderWidth, renderHeight);
  }

  
  let quantitySize = 13 * ctx.zoom;

  if (quantitySize < 16) {

    let quantityX = x * RenderConstants.CELL_WIDTH + RenderConstants.CELL_WIDTH - 20;
    let quantityY = y * RenderConstants.CELL_HEIGHT + 20;

    if (compact) {
      quantityX = imgX + imgWidth / 2;
      quantityY = imgY + imgHeight / 2;
    }

    let realSize = quantitySize / ctx.zoom + 6;

    if (arrowLabel) {
      
      let arrowToX = quantityX;
      let arrowToY = quantityY;

      if (arrowLabel == "right") {
        arrowToX += realSize * 0.05;
        quantityX -= realSize * 0.5;
      } else if (arrowLabel == "left") {
        arrowToX -= realSize * 0.05;
        quantityX += realSize * 0.5;
      } else if (arrowLabel == "top") {
        arrowToY -= realSize * 0.05;
        quantityY += realSize * 0.5;
      } else if (arrowLabel == "bottom") {
        arrowToY += realSize * 0.05;
        quantityY -= realSize * 0.5;
      }

      drawArrow(quantityX, quantityY, arrowToX, arrowToY, 20, "#404040");
    } else {
      ctx.fillStyle = "#404040";
      ctx.fillCircle(quantityX, quantityY, (quantitySize) / ctx.zoom + 6)
    }

    ctx.font = Math.floor(quantitySize*1.8) + "px Arial";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    
    ctx.fillStyle = "white";
    ctx.fillText(quantity, quantityX, quantityY);
    
  } else {

    renderLabel(quantity + " units", imgX + imgWidth/2, y * RenderConstants.CELL_HEIGHT + padding)

  }

  return { x: imgX, y: imgY, width: imgWidth, height: imgHeight };
}

function drawArrow(fromx, fromy, tox, toy, arrowWidth, color){
  //variables to be used when creating the arrow
  var headlen = 10;
  var angle = Math.atan2(toy-fromy,tox-fromx);

  ctx.abs.save();
  ctx.strokeStyle = color;

  //starting path of the arrow from the start square to the end square
  //and drawing the stroke
  ctx.beginPath();
  ctx.moveTo(fromx, fromy);
  ctx.lineTo(tox, toy);
  ctx.lineWidth = arrowWidth * ctx.zoom;
  ctx.stroke();

  //starting a new path from the head of the arrow to one of the sides of
  //the point
  ctx.beginPath();
  ctx.moveTo(tox, toy);
  ctx.lineTo(tox-headlen*Math.cos(angle-Math.PI/7),
             toy-headlen*Math.sin(angle-Math.PI/7));

  //path from the side point of the arrow, to the other side point
  ctx.lineTo(tox-headlen*Math.cos(angle+Math.PI/7),
             toy-headlen*Math.sin(angle+Math.PI/7));

  //path from the side point back to the tip of the arrow, and then
  //again to the opposite side point
  ctx.lineTo(tox, toy);
  ctx.lineTo(tox-headlen*Math.cos(angle-Math.PI/7),
             toy-headlen*Math.sin(angle-Math.PI/7));

  //draws the paths created above
  ctx.stroke();
  ctx.abs.restore();
}

function handleMouseOverUnit(unit, rect) {

  if (unit.playerId != renderingState.playerId) return;

  const { id } = unit;

  if (mouseClicked) {
    registerClick(() => {
      mutateInternalState(state => {
        state.selectedUnit = id;
      });

      registerNextUnhandledClickHandler(() => {
        if (!mouseInRect(rect)) {
          mutateInternalState(state => {
            state.selectedUnit = null;
          });
        }
      });
    });
  }

  registerDraggableSurface((dx, dy, first) => {
    mutateInternalState(state => {
      state.selectedUnit = id;

      if (!state.draggingUnit) {
        if (!unit.vagrant) {
          state.draggingUnit = {
            offsetX: unit.x * RenderConstants.CELL_WIDTH - gameMouseX,
            offsetY: unit.y * RenderConstants.CELL_HEIGHT - gameMouseY,
          }
        } else {
          state.draggingUnit = {
            offsetX: -RenderConstants.CELL_WIDTH/2,
            offsetY: -RenderConstants.CELL_HEIGHT/2,
          }
        }
      }
    });

    if (first) {
      registerNextMouseUpHandler(() => {
        mutateInternalState(state => {

          if (!state.draggingUnit) return;

          const { x: toX, y: toY } = getHoveringTileCoords();

          if (canUnitMoveTo(unit, toX, toY)) {

            let moveAmount = getQuantityBarAmount();
            
            if (unit.vagrant) {

              emit(Constants.messages.retreat, {
                unitId: id,
                quantity: moveAmount
              });

            } else {
              
              emit(Constants.messages.moveUnits, {
                from: { x: unit.x, y: unit.y },
                to: { x: toX, y: toY },
                quantity: moveAmount
              });

            }

            if (moveAmount == unit.quantity) state.selectedUnit = null;

          }

          state.draggingUnit = null;
        });
      });

      registerNextUnhandledClickHandler(() => {
        if (!mouseInRect(rect)) {
          mutateInternalState(state => {
            state.selectedUnit = null;
          });
        }
      });
    }
  });

  const { selectedUnit } = getInternalState();

  if (selectedUnit) {
    registerScrollableSurface((dy) => {
      mutateInternalState(state => {
        let newVal = state.quantityBar.percentage - dy * 0.003;

        if (newVal > 1) newVal = 1;
        if (newVal < 0) newVal = 0;

        state.quantityBar.percentage = newVal;
      });
    });
  }

}

function renderLabel(text, labelX, labelY) {
  let fontSize = 8;
  ctx.fontSize = fontSize;
  let textWidth = ctx.abs.measureText(text).width / ctx.zoom;
  let labelPadding = 3;
  let marginBottom = 0;

  ctx.fillStyle = "#404040";
  ctx.fillRect(labelX - textWidth/2 - labelPadding, labelY - fontSize - labelPadding - marginBottom, textWidth + labelPadding*2, fontSize + labelPadding*2)

  ctx.textBaseline = "middle";
  ctx.textAlign = "center";
  ctx.fillStyle = "white";
  ctx.fillText(text, labelX, labelY - fontSize/2 - marginBottom);
}

function getUnitById(unitId) {
  const { units, vagrantUnits } = renderingState;

  let unit = getById(unitId, units);
  if (unit) return unit;

  return getById(unitId, vagrantUnits);
}

function getPlayerById(playerId) {
  const { players } = renderingState;

  return getById(playerId, players);
}