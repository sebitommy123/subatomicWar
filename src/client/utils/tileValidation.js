import { getAdjescentPositions, getAuraPositions, isIsolatedPosition } from "../../shared/utils";
import { getExternalState } from "../state";
import { anythingAtPos, canWalkOnPosition, fightingOccuringAt, filterAllPositions, getCityAtPosition, getCityAuraAtPosition, getLandAt, getLandEfficiency, isFriendlyTerritory } from "./game";
import { doesBlacklistAllow, inBounds } from "./general";

export function getValidTilesMoveUnit(fromX, fromY) {

  let candidates = getAdjescentPositions({x: fromX, y: fromY});

  candidates = candidates.filter(candidate => {
    if(!inBounds(candidate.x, candidate.y)) return false;

    if (!canWalkOnPosition(candidate.x, candidate.y)) return false;

    return true;
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

    if (anythingAtPos(x, y)) return false;

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
