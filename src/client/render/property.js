import { getAsset } from "../assets";
import { emit } from "../networking";
import { ctx, RenderConstants, renderCost } from "../render";
import { getExternalState, getInternalState, mutateInternalState } from "../state";
import { mouseClicked, registerClick, registerNextUnhandledClickHandler } from "../userInput";
import { getLandEfficiency } from "../utils/game";
import { multiplyCost } from "../utils/general";
import { mouseInLastCircle, mouseInRect } from "../utils/geometry";
import { decayingQuantity } from "../utils/math";

export function renderProperty(x, y, type) {

  const { playerId, territory, dayStart, dayEnd } = getExternalState();

  let asset = getAsset(type.image.split('.')[0]);

  let rect = drawBuilding(asset, x, y);

  if (playerId !== territory[y][x]) return;

  if (mouseClicked && mouseInRect(rect)) {
    registerClick(() => {
      mutateInternalState(state => {
        state.deletingObject = building.id;
      })
    });

    registerNextUnhandledClickHandler(() => {
      mutateInternalState(state => {
        state.deletingObject = null;
      })
    });
  }

  let gain = computeYield(x, y, type);

  let length = 2 * 1000;
  let delta = Date.now() - dayStart;

  let progress = delta / length;

  if (progress > 1 || progress < 0) progress = 1;

  ctx.globalAlpha = 1 - progress;
  let color = "#015416";

  let yChange = RenderConstants.CELL_HEIGHT * 0.5;

  renderCost(gain, rect.x + rect.width/2, rect.y + rect.height * 0.7 - decayingQuantity(yChange, progress));

  ctx.globalAlpha = 1;


  return rect;

}

function computeYield(x, y, type) {

  return multiplyCost(type.resourceYield, getLandEfficiency(x, y, type));

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
