import { getAdjescentPositions, getAuraPositions, isAdjescent, isIsolatedPosition } from "../../shared/utils";
import { getExternalState } from "../state";
import { anythingAtPos, borderAtPos, canWalkOnPosition, fightingOccuringAt, filterAllPositions, getCityAtPosition, getCityAuraAtPosition, getLandAt, getLandEfficiency, isFriendlyTerritory, mapAllPositions } from "./game";
import { doesBlacklistAllow, inBounds } from "./general";

export function getValidTilesMoveUnit(fromX, fromY) {

  let candidates = mapAllPositions((x, y) => {

    if (!canWalkOnPosition(x, y)) return {
      x, y, valid: false
    };

    if (x == fromX && y == fromY) return {
      x, y, valid: false
    };

    if (isAdjescent({x: fromX, y: fromY}, {x, y})) {

      return {
        x, y, valid: true
      };

    } else {

      if (!isFriendlyTerritory(x, y)) return {
        x, y, valid: false
      };

      return {
        x, y, valid: true, color: "rgba(200, 255, 200, 255)", r: "Will take several movements to reach.", "e": "Far"
      };

    }

  });

  return candidates;

}

export function getValidTilesPlaceUnit(objectType) {

  const { blacklist } = objectType;

  let candidates = filterAllPositions((x, y) => {

    if (!isFriendlyTerritory(x, y)) return false;

    if (!getCityAtPosition(x, y)) return false;

    if (!doesBlacklistAllow(blacklist, getLandAt(x, y))) return false;

    return true;

  });

  return candidates;

}

export function getValidTilesPlaceStructure(objectType) {

  const { blacklist } = objectType;

  let candidates = filterAllPositions((x, y) => {

    if (!isFriendlyTerritory(x, y)) return false;

    if (!doesBlacklistAllow(blacklist, getLandAt(x, y))) return false;

    if (objectType.isOnBorder) {
      if (borderAtPos(x, y)) return false;
    } else {
      if (anythingAtPos(x, y)) return false;
    }

    if (fightingOccuringAt(x, y)) return false;

    return true;

  });

  candidates = candidates.map(candidate => {

    let obj = {
      x: candidate.x,
      y: candidate.y,
    };

    const efficiency = getLandEfficiency(candidate.x, candidate.y, objectType);

    if (efficiency != 1) {

      let showEfficiency = Math.floor(efficiency * 100);
  
      let message;
      let color;
      if (showEfficiency > 100) {
        showEfficiency -= 100;
        showEfficiency = `+${showEfficiency}%`;
        message = "higher rates";
        color = "#88ff88";
      } else if (showEfficiency < 100) {
        showEfficiency = 100 - showEfficiency;
        showEfficiency = `-${showEfficiency}%`;
        message = "lower rates";
        color = "#ffff88";
      }

      obj.color = color;
      obj.r = `${objectType.name}s yield ${showEfficiency} ${message} in ${getLandAt(candidate.x, candidate.y)} tiles`;
      obj.e = showEfficiency;
    }

    return obj;
  });

  return candidates;

}

export function getValidTilesPlaceBuilding(objectType) {

  const { cities } = getExternalState();

  let candidates = getValidTilesPlaceStructure(objectType);

  candidates = candidates.map(({x, y, color, r, e, valid}) => {
    let city = getCityAuraAtPosition(x, y);
    
    if (!city) return {x, y, valid: false, r: "No city nearby", e: "Too far", color: "#ff8888"};

    if (!isFriendlyTerritory(city.x, city.y)) return {x, y, valid: false, r: "City nearby is not yours", e: "Too far", color: "#ff8888"};

    return {x, y, color, r, e, valid};
  });

  return candidates;

}

export function getValidTilesPlaceCity(objectType) {

  const { cities } = getExternalState();

  let candidates = getValidTilesPlaceStructure(objectType);

  candidates = candidates.map(pos => {
    let isIsolated = isIsolatedPosition({x: pos.x, y: pos.y}, cities.map(city => ({x: city.x, y: city.y})));

    if (isIsolated) {
      return {...pos, color: "#88ff88"};
    } else {
      return {...pos, valid: false, r: "Cities must be spaced out", e: "Too close", color: "#ff8888"};
    }

  });

  return candidates;

}
