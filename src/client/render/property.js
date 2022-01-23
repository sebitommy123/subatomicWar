import { getAsset } from "../assets";
import { emit } from "../networking";
import { ctx, renderAtTop, RenderConstants, renderCost } from "../render";
import { getExternalState, getInternalState, mutateInternalState } from "../state";
import { mouseClicked, registerClick, registerNextUnhandledClickHandler } from "../userInput";
import { getLandEfficiency, getTerritoryAt } from "../utils/game";
import { ceilCost, costIsZero, inBounds, multiplyCost } from "../utils/general";
import { getDirections, getTerritoryDirFrom, mouseInLastCircle, mouseInRect, positionCenteredAt } from "../utils/geometry";
import { decayingQuantity } from "../utils/math";

export function renderProperty(x, y, type) {

  const { playerId, territory, dayStart, dayEnd } = getExternalState();

  let rect;

  if (type.isOnBorder) {
    rect = drawBorderBuilding(getAsset(type.borderImage.split('.')[0]), x, y);
  } else {
    rect = drawBuilding(getAsset(type.image.split('.')[0]), x, y);
  }

  if (playerId == territory[y][x]) {

    renderAtTop(() => {

      let gain = computeYield(x, y, type);

      if (!costIsZero(gain)) {

        let length = 2 * 1000;
        let delta = Date.now() - dayStart;

        let progress = delta / length;

        if (progress > 1 || progress < 0) progress = 1;

        ctx.globalAlpha = 1 - progress;
        let color = "#015416";

        let yChange = RenderConstants.CELL_HEIGHT * 0.5;
        
        renderCost(gain, rect.x + rect.width/2, rect.y + rect.height * 0.7 - decayingQuantity(yChange, progress));

        ctx.globalAlpha = 1;

      }

    });

  }

  return rect;

}

function computeYield(x, y, type) {

  return ceilCost(multiplyCost(type.resourceYield, getLandEfficiency(x, y, type)));

}

export function drawBorderBuilding(asset, x, y) {

  const width = 10;
  const inset = 3;

  const sides = {
    right: () => ctx.drawImage(asset, x * RenderConstants.CELL_WIDTH + RenderConstants.CELL_WIDTH - width - inset, y * RenderConstants.CELL_HEIGHT + inset, width, RenderConstants.CELL_HEIGHT - inset*2),
    left: () => ctx.drawImage(asset, x * RenderConstants.CELL_WIDTH + inset, y * RenderConstants.CELL_HEIGHT + inset, width, RenderConstants.CELL_HEIGHT - inset *2),
    top: () => ctx.drawImage(asset, x * RenderConstants.CELL_WIDTH + inset, y * RenderConstants.CELL_HEIGHT + inset, RenderConstants.CELL_WIDTH - inset*2, width),
    bottom: () => ctx.drawImage(asset, x * RenderConstants.CELL_WIDTH + inset, y * RenderConstants.CELL_HEIGHT + RenderConstants.CELL_HEIGHT - width - inset, RenderConstants.CELL_WIDTH - inset*2, width),
  }

  getDirections().forEach(dir => {

    if (getTerritoryAt(x, y) == getTerritoryDirFrom(x, y, dir)) {
      
      ctx.globalAlpha = 0.2;

    } else {

      ctx.globalAlpha = 1;

    }

    sides[dir]();

    ctx.globalAlpha = 1;

  });

  return {
    x: x * RenderConstants.CELL_WIDTH + RenderConstants.BUILDING_PADDING,
    y: y * RenderConstants.CELL_HEIGHT + RenderConstants.BUILDING_PADDING,
    width: RenderConstants.CELL_WIDTH - RenderConstants.BUILDING_PADDING*2,
    height: RenderConstants.CELL_HEIGHT - RenderConstants.BUILDING_PADDING*2
  };

}

export function drawBuilding(asset, x, y) {

  ctx.drawImage(asset, x * RenderConstants.CELL_WIDTH + RenderConstants.BUILDING_PADDING, y * RenderConstants.CELL_HEIGHT + RenderConstants.BUILDING_PADDING, RenderConstants.CELL_WIDTH - RenderConstants.BUILDING_PADDING*2, RenderConstants.CELL_HEIGHT - RenderConstants.BUILDING_PADDING*2);

  return {
    x: x * RenderConstants.CELL_WIDTH + RenderConstants.BUILDING_PADDING,
    y: y * RenderConstants.CELL_HEIGHT + RenderConstants.BUILDING_PADDING,
    width: RenderConstants.CELL_WIDTH - RenderConstants.BUILDING_PADDING*2,
    height: RenderConstants.CELL_HEIGHT - RenderConstants.BUILDING_PADDING*2
  };

}
