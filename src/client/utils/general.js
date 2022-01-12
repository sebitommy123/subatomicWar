import { getExternalState, getInternalState, onStateChange } from "../state";
import { getMe } from "./game";

export function getDayTime(start, end) {

  let length = end - start;
  let delta = Date.now() - start;

  let progress = delta / length;

  if (progress > 1) progress = 1;

  let minutesInADay = 24 * 60;

  let minutes = Math.floor(minutesInADay * progress);

  let hours = Math.floor(minutes / 60);

  let minutesLeft = minutes % 60;

  return `${hours}:${minutesLeft < 10 ? '0' : ''}${minutesLeft}`;

}

export function getMaxUnitPurchase() {
  const { shopItems } = getExternalState();

  return Math.floor(getMe().gold / shopItems.find(s => s.type == "unit").cost.gold);
}

export function multiplyCost(cost, quantity) {
  return {
    gold: cost.gold ? cost.gold * quantity : null,
    wood: cost.wood ? cost.wood * quantity : null,
    oil: cost.oil ? cost.oil * quantity : null,
  }
}

export function ceilCost(cost) {
  return {
    gold: cost.gold ? Math.ceil(cost.gold) : null,
    wood: cost.wood ? Math.ceil(cost.wood) : null,
    oil: cost.oil ? Math.ceil(cost.oil) : null,
  }
}

export function costIsZero(cost) {
  if (cost.gold && cost.gold > 0) return false;
  if (cost.wood && cost.wood > 0) return false;
  if (cost.oil && cost.oil > 0) return false;

  return true;
}

export function getQuantityBarPurchaseCost(shopItems) {

  return multiplyCost(shopItems.find(s => s.type == "unit").cost, getQuantityBarAmount());

}

export function canBuyResource(cost, resources) {
  return Object.keys(cost).every(resource => resources[resource] >= cost[resource]);
}

export function canBuy(cost) {
  return canBuyResource(cost, getResources());
}

export function getResources() {
  return {
    gold: getMe().gold,
    wood: getMe().wood,
    oil: getMe().oil
  }
}

export function inBounds(x, y, maxX, maxY) {

  const { gridDimensions } = getExternalState();

  if (!maxX) maxX = gridDimensions.width;
  if (!maxY) maxY = gridDimensions.height;

  return x >= 0 && x < maxX && y >= 0 && y < maxY;
}

export function ensureServerSync() {

  const originalDateFunction = Date.now;
  let serverTimeError = 0;

  onStateChange(state => {
    if (state) {
      if (state.serverTime) {
        serverTimeError = state.serverTime - originalDateFunction();

        if (Date.now === originalDateFunction) console.log("You're off the server by ", serverTimeError, "ms");

        Date.now = () => {
          return serverTimeError + originalDateFunction();
        };
      }
    }
  });

}

export function doesBlacklistAllow(blacklist, land) {

  let data = blacklist[land];

  if (data) {
    return data.allowed;
  }

  return true;

}
