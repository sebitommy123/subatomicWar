import { getRingPositions, isAdjescent } from "../../shared/utils";
import { canvas, ctx } from "../render";
import { getExternalState, getInternalState, mutateInternalState } from "../state";
import { inBounds, localTime } from "./general";
import { smoothCurve } from "./math";

export function getUnitAtPosition(x, y) {
  const { units } = getExternalState();
  return units.find(unit => unit.x === x && unit.y === y);
}

export function getUnitById(unitId) {
  const { units, vagrantUnits } = getExternalState();

  let unit = getById(unitId, units);
  if (unit) return unit;

  return getById(unitId, vagrantUnits);
}

export function getAnythingById(id) {
  return getById(id, getAllObjects());
}

export function getById(id, identifiedList) {
  return identifiedList.find(element => element.id === id);
}

export function getAllObjects() {
  const { buildings, cities, structures, units, vagrantUnits } = getExternalState();

  return [...buildings, ...cities, ...structures, ...units, ...vagrantUnits];
}

export function getMe() {
  const { playerId, players } = getExternalState();

  if (!playerId || !players) return null;

  return getById(playerId, players);
}

export function getTerritoryAt(x, y) {
  const { territory } = getExternalState();

  if (x < 0 || x >= territory.length || y < 0 || y >= territory[0].length) {
    return null;
  }
  
  return territory[y][x];
}

export function getPlayerAt(x, y) {

  let pid = getTerritoryAt(x, y);

  if (pid == null) return null;

  return getPlayerById(pid);

}

export function getPlayerById(id) {

  const { players } = getExternalState();

  return getById(id, players);

}

export function getPlayerColorAt(x, y) {

  let p = getPlayerAt(x, y);

  if (p) {
    return p.color;
  }

}

export function isFriendlyTerritory(x, y, pid) {

  const { playerId } = getExternalState();

  if (pid == null) pid = playerId;

  return getTerritoryAt(x, y) == pid;

}

export function enemyUnitAtPosition(x, y, pid=null) {
  const { playerId } = getExternalState();

  if (pid == null) pid = playerId;

  const unit = getUnitAtPosition(x, y);
  if (!unit) return false;
  return unit.playerId !== pid;
}

export function ownedUnitAtPosition(x, y, pid=null) {
  const { playerId } = getExternalState();

  if (pid == null) pid = playerId;

  const unit = getUnitAtPosition(x, y);
  if (!unit) return false;
  return unit.playerId === pid;
}

export function canUnitMoveTo(unit, x, y) {

  const { landTypes, land, gridDimensions } = getExternalState();

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

export function getLandAt(x, y) {

  const { land } = getExternalState();

  return land[y][x];
  
}

export function getLandEfficiency(x, y, type) {

  let item = type.blacklist[getLandAt(x, y)];

  if (item) {
    if (item.efficiency) {
      return item.efficiency;
    }
  }

  return 1;

}

export function getQuantityAtPosition(x, y) {
  const unit = getUnitAtPosition(x, y);

  if (!unit) return 0;

  return unit.quantity;
}

export function filterAllPositions(func) {

  const { gridDimensions } = getExternalState();

  let result = [];

  for (let x = 0; x < gridDimensions.width; x++) {
    for (let y = 0; y < gridDimensions.height; y++) {

      if (func(x, y)) {
        result.push({x, y});
      } else {
        result.push({x, y, valid: false});
      }

    }
  }

  return result;

}
export function mapAllPositions(func) {

  const { gridDimensions } = getExternalState();

  let result = [];

  for (let x = 0; x < gridDimensions.width; x++) {
    for (let y = 0; y < gridDimensions.height; y++) {

      result.push(func(x, y));

    }
  }

  return result;

}

export function getBuildingAtPosition(x, y) {

  const { buildings } = getExternalState();

  return buildings.find(building => building.x == x && building.y == y);

}

export function getCityAtPosition(x, y) {

  const { cities } = getExternalState();

  return cities.find(city => city.x == x && city.y == y);

}

export function getPlayerCities(pid=null) {

  const { cities } = getExternalState();

  if (pid == null) pid = getMe().id;

  return cities.filter(city => getTerritoryAt(city.x, city.y) === pid);

}

export function getStructureAtPosition(x, y) {

  const { structures } = getExternalState();

  return structures.find(structure => !structure.type.isOnBorder && structure.x == x && structure.y == y);

}

export function getBorderAtPosition(x, y) {

  const { structures } = getExternalState();

  return structures.find(structure => structure.type.isOnBorder && structure.x == x && structure.y == y);

}

export function borderAtPos(x, y) {
  return !!getBorderAtPosition(x, y);
}

export function anythingAtPos(x, y) {

  if(getBuildingAtPosition(x, y)) return true;

  if(getCityAtPosition(x, y)) return true;

  if(getStructureAtPosition(x, y)) return true;

  return false;

}

export function fightingOccuringAt(x, y) {

  let unit = getUnitAtPosition(x, y);

  if (!unit) return false;

  return unit.fighting;

}

export function getCityAuraAtPosition(x, y) {

  const { cities } = getExternalState();

  return cities.find(city => {

    if (city.x == x && city.y == y) return false; //a city is not in its own aura

    return Math.abs(city.x - x) <= 1 && Math.abs(city.y - y) <= 1;

  });

}

export function getLandTypeAtPosition(x, y) {

  const { landTypes } = getExternalState();

  return landTypes[getLandAt(x, y)];

}

export function canWalkOnPosition(x, y) {

  return getLandTypeAtPosition(x, y).canWalk;

}

export function getAllFriendlyTiles(pid) {

  const { playerId } = getExternalState();

  if (pid == null) pid = playerId;

  return filterAllPositions(function(x, y) {
    return isFriendlyTerritory(x, y, pid);
  });

}

export function smoothScrollTo(gameX, gameY, zoom, duration=1000) {

  const targetOffsetX = (canvas.width / zoom) / 2 - gameX;
  const targetOffsetY = (canvas.height / zoom) / 2 - gameY;

  mutateInternalState(state => {
    state.smoothScrolling = {
      startX: ctx.offsetX,
      startY: ctx.offsetY,
      startZoom: ctx.zoom,
      targetX: targetOffsetX,
      targetY: targetOffsetY,
      targetZoom: zoom,
      start: localTime(),
      end: localTime() + duration,
    }
  });

}

export function stopSmoothScroll() {

  mutateInternalState(state => {
    state.smoothScrolling = null;
  });

}

export function updateSmoothScroll() {

  const { smoothScrolling } = getInternalState();

  if (smoothScrolling == null) return;

  const { startX, startY, startZoom, targetX, targetY, targetZoom, start, end } = smoothScrolling;

  let duration = end - start;
  let delta = localTime() - start;

  let progress = Math.max(0, delta / duration);

  if (progress > 1) {
    ctx.offsetX = targetX;
    ctx.offsetY = targetY;
    ctx.zoom = targetZoom;

    stopSmoothScroll();

    return;
  }
  
  let currentX = smoothCurve(startX, targetX, progress);
  let currentY = smoothCurve(startY, targetY, progress);
  let currentZoom = smoothCurve(startZoom, targetZoom, progress);

  ctx.offsetX = currentX;
  ctx.offsetY = currentY;
  ctx.zoom = currentZoom;

}