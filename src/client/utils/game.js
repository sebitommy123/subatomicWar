import { isAdjescent } from "../../shared/utils";
import { getExternalState } from "../state";
import { inBounds } from "./general";

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

export function getById(id, identifiedList) {
  return identifiedList.find(element => element.id === id);
}

export function getMe() {
  const { playerId, players } = getExternalState();

  if (!playerId || !players) return null;

  return getById(playerId, players);
}

export function getTerritoryAt(territory, x, y) {
  if (x < 0 || x >= territory.length || y < 0 || y >= territory[0].length) {
    return null;
  }
  
  return territory[y][x];
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