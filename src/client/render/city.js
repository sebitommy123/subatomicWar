import { getRingPositions } from "../../shared/utils";
import { getAsset } from "../assets";
import { ctx, RenderConstants } from "../render";
import { getExternalState } from "../state";
import { getBuildingAtPosition, getPlayerColorAt, getTerritoryAt, isFriendlyTerritory } from "../utils/game";
import { inBounds } from "../utils/general";
import { positionCenteredAt } from "../utils/geometry";
import { renderBuiltNode } from "./builtNode";
import { drawBuilding } from "./property";

export function renderCity(city) {

  const { gridDimensions } = getExternalState();

  let { x, y, population, turnsLeft, id } = city;

  renderBuiltNode(city, "city");

  if (!isFriendlyTerritory(x, y)) return;

  let ringPositions = getRingPositions({ x, y }).filter(pos => inBounds(pos.x, pos.y, gridDimensions.width, gridDimensions.height)).filter(pos => isFriendlyTerritory(pos.x, pos.y));
  let farms = ringPositions.filter(pos => {
    let b = getBuildingAtPosition(pos.x, pos.y);
    return b && b.type.name == "Farm";
  });

  const marginCorner = 4;
  const size = 14;
  const inset = 2;

  let turnSpeed = 4 ** farms.length;

  ctx.fontSize = 24;
  ctx.textBaseline = "middle";
  ctx.textAlign = "center";
  ctx.fillStyle = "#000077";
  ctx.fillCircle(x * RenderConstants.CELL_WIDTH + marginCorner + size, y * RenderConstants.CELL_HEIGHT + marginCorner + size, size);
  ctx.drawImage(getAsset("population"), x * RenderConstants.CELL_WIDTH + marginCorner + inset, y * RenderConstants.CELL_HEIGHT + marginCorner + inset, size * 2 - inset * 2, size * 2 - inset * 2);

  ctx.fillText(population, x * RenderConstants.CELL_WIDTH + marginCorner + size - 0.4, y * RenderConstants.CELL_HEIGHT + marginCorner + size + 1);

  let turnsLeftEstimate = Math.ceil(turnsLeft / turnSpeed);
  let growthText = turnsLeftEstimate + " days until growth";

  if (population == 8) {
    growthText = "City at max population";
  }

  ctx.textAlign = "center";
  ctx.fillStyle = "black";
  ctx.fontSize = 6;
  ctx.fillText(growthText, x * RenderConstants.CELL_WIDTH + RenderConstants.CELL_WIDTH/2, (y+1) * RenderConstants.CELL_HEIGHT - 7);

}

export function drawAuraAt(x, y) {

  let pos = positionCenteredAt(x, y);

  ctx.fillStyle = "#ffff88";

  const totalR = RenderConstants.CELL_WIDTH * 1.5;

  for (let i = 0; i < 5; i++) {

    let r = totalR * (i + 1) / 5;

    ctx.globalAlpha = 0.2;
    ctx.fillRect(pos.x - r, pos.y - r, r*2, r*2);
    ctx.globalAlpha = 1;
  }

}

export function drawCityLimits(x, y) {

  let pos = positionCenteredAt(x, y);
  const totalR = RenderConstants.CELL_WIDTH * 1.5;

  ctx.strokeStyle = "#000000";
  ctx.lineWidth = 5;
  ctx.strokeRect(pos.x - totalR, pos.y - totalR, totalR*2, totalR*2);

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


export function drawCitiesWithPopulationEmphasis() {

  const { cities } = getExternalState();

  cities.forEach(city => {

    drawCityLimits(city.x, city.y);
    
    drawBuilding(getAsset("city"), city.x, city.y);

    let population = city.population;

    let cx = (city.x + 0.2) * RenderConstants.CELL_WIDTH;
    let cy = (city.y + 0.2) * RenderConstants.CELL_HEIGHT;
    let r = RenderConstants.CELL_WIDTH * 0.25;
    let inset = 2;

    ctx.fontSize = 40;
    ctx.textBaseline = "middle";
    ctx.textAlign = "center";
    ctx.fillStyle = "#000077";
    ctx.fillCircle(cx, cy, r);
    ctx.drawImage(getAsset("population"), cx - r + inset, cy - r + inset, r*2 - inset*2, r*2 - inset*2);

    ctx.fillText(population, cx, cy);

    ctx.textAlign = "center";
    ctx.fillStyle = "#000077";
    ctx.fontSize = 11;
    ctx.fillText(`Max buildings: ${population}`, city.x * RenderConstants.CELL_WIDTH + RenderConstants.CELL_WIDTH/2, (city.y+1) * RenderConstants.CELL_HEIGHT - 14);

  });

}
