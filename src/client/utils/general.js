import { getInternalState, onStateChange } from "../state";
import { getMe } from "./game";

export function getQuantityBarAmount() {
  const { quantityBar } = getInternalState();

  return Math.max(1, Math.floor(quantityBar.percentage * quantityBar.max));
}

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

export function getMaxUnitPurchase(shopItems) {
  return Math.floor(getMe().gold / shopItems.find(s => s.type == "unit").cost.gold);
}

export function multiplyCost(cost, quantity) {
  return {
    gold: cost.gold ? cost.gold * quantity : null,
    wood: cost.wood ? cost.wood * quantity : null,
    oil: cost.oil ? cost.oil * quantity : null,
  }
}

export function getQuantityBarPurchaseCost(shopItems) {

  return multiplyCost(shopItems.find(s => s.type == "unit").cost, getQuantityBarAmount());

}

export function canBuyResource(cost, resources) {
  return Object.keys(cost).every(resource => resources[resource] >= cost[resource]);
}

export function getResources() {
  return {
    gold: getMe().gold,
    wood: getMe().wood,
    oil: getMe().oil
  }
}

export function inBounds(x, y, maxX, maxY) {
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
