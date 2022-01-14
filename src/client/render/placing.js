import Constants from "../../shared/constants";
import { getPositionInPositionList, positionInPositionList } from "../../shared/utils";
import { emit } from "../networking";
import { ctx, RenderConstants, renderCost } from "../render";
import { getExternalState, getInternalState, mutateInternalState } from "../state";
import { forceStopDrag, mouseClicked, mouseRightClicked, registerClick, registerNextMouseUpHandler, registerScrollableSurface, tileMouseX, tileMouseY } from "../userInput";
import { isFreeCost } from "../utils/cost";
import { getQuantityAtPosition } from "../utils/game";
import { canBuy, inBounds, multiplyCost } from "../utils/general";
import { mouseInRect } from "../utils/geometry";
import { closeContextMenu } from "./contextMenu";
import { getQuantityBarQuantity, removeQuantityBar, setQuantityBar, setQuantityBarQuantity } from "./quantityBar";

export function stopAllPlacing() {
  mutateInternalState(state => {
    state.placingObject = null;
    state.deletingObject = null;
    state.movingObject = null;
    
    removeQuantityBar();

    closeContextMenu();

    forceStopDrag();
  });
}

export function setPlacing(type, id, cost, render, canPlace, onPlace, quantifiable=null, extraOptions) {

  if (!extraOptions) extraOptions = {};

  stopAllPlacing();

  mutateInternalState(state => {
    state.placingObject = {
      type,
      id,
      cost,
      quantifiable,
      render,
      onPlace,
      canPlace,
      extraOptions,
    };
  });

  if (quantifiable) {
    setQuantityBar(quantifiable);
  }

}

export function isPlacing() {

  const { placingObject } = getInternalState();

  return placingObject;

}

export function isPlacingUnit() {

  const { placingObject } = getInternalState();

  if (!placingObject) return null;

  if (!placingObject.type === "unit") return null;

  return true;

}

export function renderPlacingObject() {

  const { shopItems, units, playerId, territory, gridDimensions } = getExternalState();
  const { quantityBar, placingObject } = getInternalState();

  if (!placingObject) return;
  
  const { type: itemType, id: itemId, quantifiable, render, cost, onPlace, canPlace, extraOptions } = placingObject;

  let quantity = 1;
  if (quantifiable) {
    quantity = getQuantityBarQuantity();
  }

  let tileX = tileMouseX();
  let tileY = tileMouseY();

  if (!inBounds(tileX, tileY, gridDimensions.width, gridDimensions.height)) return;

  const netCost = multiplyCost(cost, quantity);

  let canBuyBool = canBuy(netCost);

  if (mouseClicked || mouseRightClicked) {
    
    registerClick(() => {

      if (mouseRightClicked) {
        setQuantityBarQuantity(0.5);
      }

      onPlace(tileX, tileY, getQuantityBarQuantity());

      if (extraOptions.hideAfter) {
        stopAllPlacing();
      }
  
    });

  }

  const availableTiles = canPlace();

  availableTiles.forEach(tile => {

    if (tile.valid === false) return;

    ctx.fillStyle = tile.color ? tile.color : "white";

    ctx.globalAlpha = 0.5;
    ctx.fillRect(tile.x * RenderConstants.CELL_WIDTH, tile.y * RenderConstants.CELL_HEIGHT, RenderConstants.CELL_WIDTH, RenderConstants.CELL_HEIGHT);
    ctx.globalAlpha = 1;
  });
  
  ctx.globalAlpha = 0.5;

  let pos = getPositionInPositionList({x: tileX, y: tileY}, availableTiles);

  if (pos == null) {
    canBuyBool = false;
  } else {
    if (pos.valid === false) {
      canBuyBool = false;
    }

    ctx.fillStyle = pos.color ? pos.color : "white";
  }

  if (!canBuyBool) ctx.fillStyle = "red";

  ctx.fillRect(tileX * RenderConstants.CELL_WIDTH, tileY * RenderConstants.CELL_HEIGHT, RenderConstants.CELL_WIDTH, RenderConstants.CELL_HEIGHT);
  ctx.globalAlpha = 1;

  let rect = render(tileX, tileY, quantity);

  if (!isFreeCost(cost)) {

    ctx.globalAlpha = 0.9;
    renderCost(netCost, rect.x + rect.width/2, rect.y + rect.height * 0.7);
    ctx.globalAlpha = 1;

  }

  if (pos && pos.r) {
    renderEfficiency(rect, pos.r, pos.e, pos.color ? pos.color : "#ffff88");
  }


  rect.width *= 0.5;

  if (mouseInRect(rect) && quantifiable && false) {

    registerScrollableSurface((dy) => {
      mutateInternalState(state => {

        if (state.quantityBar.currentPercentage != null) {

          let change = dy * 0.003;

          if (change > 0.1) change = 0.1;
          if (change < -0.1) change = -0.1;

          let newVal = state.quantityBar.currentPercentage - change;

          if (newVal > 1) newVal = 1;
          if (newVal < 0) newVal = 0;

          state.quantityBar.currentPercentage = newVal;

        }
        
      });
    });

  }

}

function renderEfficiency(rect, message, efficiency, color) {
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

  ctx.fillStyle = color;

  let boxX = rect.x + rect.width/2 - totalWidth/2;
  ctx.fillRect(boxX, totalY, boxWidth, totalHeight);

  ctx.fillStyle = "#404040";
  ctx.fillRect(boxX + boxWidth + innerMargin, totalY, innerPadding*2 + textWidth, totalHeight);

  ctx.textBaseline = "middle";
  ctx.textAlign = "center";
  ctx.fillStyle = "white";
  ctx.fillText(message, boxX + boxWidth + innerMargin + innerPadding + textWidth/2, totalY + innerPadding + fontSize/2);
  
  ctx.fontSize = 5;
  ctx.fillStyle = "black";
  ctx.fillText(efficiency, boxX + boxWidth/2, totalY + totalHeight/2);
}
