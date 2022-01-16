import { getAsset } from "../assets";
import { emit } from "../networking";
import { ctx, renderAtTop, RenderConstants, renderCost } from "../render";
import { getExternalState, getInternalState, mutateInternalState } from "../state";
import { mouseClicked, registerClick, registerNextUnhandledClickHandler } from "../userInput";
import { getLandEfficiency, getTerritoryAt } from "../utils/game";
import { ceilCost, costIsZero, multiplyCost } from "../utils/general";
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

  const sides = {
    right: () => ctx.drawImage(asset, x * RenderConstants.CELL_WIDTH + RenderConstants.CELL_WIDTH - width, y * RenderConstants.CELL_HEIGHT, width, RenderConstants.CELL_HEIGHT),
    left: () => ctx.drawImage(asset, x * RenderConstants.CELL_WIDTH, y * RenderConstants.CELL_HEIGHT, width, RenderConstants.CELL_HEIGHT),
    top: () => ctx.drawImage(asset, x * RenderConstants.CELL_WIDTH, y * RenderConstants.CELL_HEIGHT, RenderConstants.CELL_WIDTH, width),
    bottom: () => ctx.drawImage(asset, x * RenderConstants.CELL_WIDTH, y * RenderConstants.CELL_HEIGHT + RenderConstants.CELL_HEIGHT - width, RenderConstants.CELL_WIDTH, width),
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

export function drawAuraAt(x, y) {

  let pos = positionCenteredAt(x, y);

  ctx.fillStyle = "#ffff88";

  const totalR = RenderConstants.CELL_WIDTH * 1.5;

  for (let i = 0; i < 5; i++) {

    let r = totalR * (i + 1) / 5;

    ctx.globalAlpha = 0.2;
    ctx.fillCircle(pos.x, pos.y, r);
    ctx.globalAlpha = 1;
  }

}

export function drawAllCityAuras() {

  const { cities } = getExternalState();

  cities.forEach(city => {
      
    drawAuraAt(city.x, city.y);

  });

  cities.forEach(city => {
    
    drawBuilding(getAsset("city"), city.x, city.y);

  });

}
