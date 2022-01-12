import Constants from "../../shared/constants";
import { getAsset } from "../assets";
import { emit } from "../networking";
import { RenderConstants, ctx } from "../render";
import { getExternalState, getInternalState, mutateInternalState } from "../state";
import { gameMouseX, gameMouseY, mouseClicked, registerClick, registerDraggableSurface, registerNextMouseUpHandler, registerNextUnhandledClickHandler, registerScrollableSurface } from "../userInput";
import { getFreeCost } from "../utils/cost";
import { canUnitMoveTo, enemyUnitAtPosition, getQuantityAtPosition, getUnitAtPosition, getUnitById } from "../utils/game";
import { getDirectionFromPosToPos, getHoveringTileCoords, mouseInRect, movePositionInDir, positionCenteredAt } from "../utils/geometry";
import { decayingQuantity, interpolateXYC, sinusoidalTimeValue } from "../utils/math";
import { getValidTilesMoveUnit } from "../utils/tileValidation";
import { setPlacing } from "./placing";
import { getQuantityBarQuantity } from "./quantityBar";

function getUnitStart(unitData) {

  return getUnitGoal({
    ...unitData,
    fromX: unitData.toX,
    fromY: unitData.toY,
    toX: unitData.fromX,
    toY: unitData.fromY,
  });

}

function getUnitGoal(unitData) {

  let { playerId, fromX, fromY, toX, toY, fighting, vagrant } = unitData;

  let direction = getDirectionFromPosToPos(fromX, fromY, toX, toY);

  let unitAtDestination = getUnitAtPosition(toX, toY);
  let goingTowardsEnemy = enemyUnitAtPosition(toX, toY, playerId);

  let destination = positionCenteredAt(toX, toY);

  if (fighting) {

    if (vagrant && goingTowardsEnemy) { // I'm in a tile that is not mine to fight

      return { ...movePositionInDir(destination, direction, -RenderConstants.VAGRANT_FIGHTING_INSET), c: 1 };

    } else { // I am in my tile attacking

      return { ...destination, c: 1 };

    }

  } else { // I am in my tile chilling

    if (vagrant && (goingTowardsEnemy || unitAtDestination && unitAtDestination.fighting)) { // i will be fighting soon

      return getUnitGoal({ ...unitData, fighting: true });

    } else { // i'm going towards my own tile, or an empty one

      return { ...destination, c: 0 };

    }    

  }
  
}

export function renderSoldierAndQuantity(posXYC, quantity, occilate=false, changeInUnits=0, changeInUnitsProgress=1, dir) {

  let rect = renderSoldier(posXYC, occilate);

  let fontSize = 8 - 3 * posXYC.c;

  let descriptor = " units";
  let lx = rect.x + rect.width/2;
  let ly = rect.y + 2;

  if (posXYC.c === 0) {
    if (ctx.zoom <= 2) fontSize = 12;
    if (ctx.zoom <= 1.5) fontSize = 14;
    if (ctx.zoom <= 1) {
      fontSize = 25;
      descriptor = "";
      lx = rect.x + rect.width;
      ly = rect.y + 15;
    }
  }

  renderLabel(quantity + descriptor, lx, ly, fontSize);

  ctx.globalAlpha = 1 - changeInUnitsProgress;
  let sign = changeInUnits >= 0 ? "+" : "-";
  let color;
  if (changeInUnits < 0) {
    color = "#540101";
  } else {
    color = "#015416";
  }

  let yChange = RenderConstants.CELL_HEIGHT * 0.5;

  renderLabel(sign + changeInUnits, lx, ly - decayingQuantity(yChange, changeInUnitsProgress) + 20, fontSize, color);

  ctx.globalAlpha = 1;

  return rect;
}

function renderLabel(text, labelX, labelY, fontSize=8, color="#404040") {
  ctx.fontSize = fontSize;
  let textWidth = ctx.abs.measureText(text).width / ctx.zoom;
  let labelPadding = 3;
  let marginBottom = 0;

  ctx.fillStyle = color;
  ctx.fillRect(labelX - textWidth/2 - labelPadding, labelY - fontSize - labelPadding - marginBottom, textWidth + labelPadding*2, fontSize + labelPadding*2)

  ctx.textBaseline = "middle";
  ctx.textAlign = "center";
  ctx.fillStyle = "white";
  ctx.fillText(text, labelX, labelY - fontSize/2 - marginBottom);
}

export function renderSoldier(posXYC, occilate=false) {

  const { x, y, c } = posXYC;

  const imgAsset = getAsset("soldier");

  const padding = RenderConstants.SOLDIER_PADDING + RenderConstants.SOLDIER_PADDING * 3 * c;

  let imgHeight = RenderConstants.CELL_HEIGHT - padding*2;
  let imgWidth = imgHeight * imgAsset.width / imgAsset.height;

  let imgX = x - imgWidth / 2;
  let imgY = y - imgHeight / 2;

  if(occilate) ctx.globalAlpha = sinusoidalTimeValue(0.5, 1, 100);

  ctx.drawImage(imgAsset, imgX, imgY, imgWidth, imgHeight);

  if(occilate) ctx.globalAlpha = 1;

  return { x: imgX, y: imgY, width: imgWidth, height: imgHeight, rx: x, ry: y };

}

export function renderVagrantUnit(unit) {

  if (!unit.vagrant) return;

  const { selectedUnit, draggingUnit, quantityBar } = getInternalState();

  let { playerId, x, y, quantity, fighting, vagrantData, vagrant, lastQuantity, lastQuantityChange } = unit;

  let changeInUnits = 0;
  let changeInUnitsProgress = undefined;

  if (lastQuantityChange) {

    changeInUnits = quantity - lastQuantity;

    let delta = Date.now() - lastQuantityChange;

    let totalTime = 1 * 1000;

    changeInUnitsProgress = delta / totalTime;

    if (changeInUnitsProgress > 1) changeInUnitsProgress = 1;

  }

  let { toX, toY, start, end } = vagrantData;

  let delta = Date.now() - start;
  let totalDuration = end - start;

  let progress = delta / totalDuration;

  if (progress > 1) progress = 1;

  let unitData = {
    playerId, 
    fromX: x, 
    fromY: y, 
    toX: toX, 
    toY: toY, 
    fighting, 
    vagrant
  };

  let startXyc = getUnitStart(unitData);
  let goal = getUnitGoal(unitData);

  let interpolated = interpolateXYC(startXyc, goal, progress);
  
  let xyc = fighting ? goal : interpolated;

  let quantityToDisplay = quantity;
  let occilate = false;

  if (selectedUnit && selectedUnit == unit.id) {
    if (draggingUnit && quantityBar) quantityToDisplay = quantityBar.max - getQuantityBarQuantity();
    occilate = true;
  }

  let rect = renderSoldierAndQuantity(xyc, quantityToDisplay, occilate, changeInUnits, changeInUnitsProgress, getDirectionFromPosToPos(x, y, toX, toY));

  if (fighting && mouseInRect(rect)) {

    handleMouseOverUnit(unit, rect);

  }

  return rect;

}

export function renderUnit(unit) {

  if (unit.vagrant) return;

  const { selectedUnit, movingObject } = getInternalState();

  let { id, x, y, quantity, playerId, fighting, vagrant, lastQuantity, lastQuantityChange } = unit;

  let changeInUnits = 0;
  let changeInUnitsProgress = undefined;

  if (lastQuantityChange) {

    changeInUnits = quantity - lastQuantity;

    let delta = Date.now() - lastQuantityChange;

    let totalTime = 1 * 1000;

    changeInUnitsProgress = delta / totalTime;

    if (changeInUnitsProgress > 1) changeInUnitsProgress = 1;

  }

  let renderQuantity = quantity;

  
  if (movingObject && movingObject.type == "unit" && movingObject.id == unit.id) {
    renderQuantity = quantity - getQuantityBarQuantity();
  }

  let rect = renderSoldierAndQuantity(getUnitGoal({
    playerId, 
    fromX: null, 
    fromY: null, 
    toX: x, 
    toY: y, 
    fighting, 
    vagrant
  }), renderQuantity, renderQuantity != quantity, changeInUnits, changeInUnitsProgress);

  rect.width *= 0.5;

  if (mouseInRect(rect)) {

    handleMouseOverUnit(unit, rect);

  }

  return rect;

}

function renderPlacingUnit(x, y, quantity) {

  const { movingObject } = getInternalState();

  const unit = getUnitById(movingObject.id);

  if (!unit) return;

  let renderQuantity = quantity + getQuantityAtPosition(x, y);

  let pos = positionCenteredAt(x, y);

  if (x == unit.x && y == unit.y) {
    pos = { x: gameMouseX, y: gameMouseY };
    renderQuantity = quantity;
  }

  return renderSoldierAndQuantity({ ...pos, c: 0 }, renderQuantity, true)
}

function canMoveUnitFrom(x, y) {

  const { movingObject } = getInternalState();

  const unit = getUnitById(movingObject.id);

  if (!unit) return;

  return getValidTilesMoveUnit(unit.x, unit.y);
}

function moveUnitTo(x, y, quantity) {

  const { movingObject } = getInternalState();

  const unit = getUnitById(movingObject.id);

  if (!unit) return;
  
  if (unit.vagrant) {

    emit(Constants.messages.retreat, {
      unitId: unit.id,
      quantity,
    });

  } else {
    
    emit(Constants.messages.moveUnits, {
      from: { x: unit.x, y: unit.y },
      to: { x, y },
      quantity,
    });

  }  

}

function handleUnitStartMoving(unit) {
  setPlacing("unit", unit.id, getFreeCost(), renderPlacingUnit, canMoveUnitFrom, moveUnitTo, {
    tag: "movingUnit", 
    max: () => getUnitById(unit.id).quantity, 
    tip: (quantity) => [
      `MOVING UNITS`,
      `Units to move: ${quantity}`,
      `Units left: ${getUnitById(unit.id).quantity - quantity}`,
      `Click on tile to move`
    ],
    color: "#70AD47", 
    units: "units",
  }, {
    hideAfter: true,
  });
  
  mutateInternalState(state => {
    state.movingObject = {
      type: "unit",
      id: unit.id
    }
  });
}

function handleMouseOverUnit(unit, rect) {

  const { playerId } = getExternalState();

  if (unit.playerId != playerId) return;

  const { id } = unit;

  if (mouseClicked) {
    registerClick(() => {

      handleUnitStartMoving(unit);
      
    });
  }

  registerDraggableSurface((dx, dy, first) => {
    if (first) {

      handleUnitStartMoving(unit);

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
