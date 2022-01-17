const Constants = require("../../shared/constants");

function buyUnits(agent) {

  const unitItem = agent.game.shop.getItemByName("soldier");

  const unitCost = unitItem.cost;

  const goldCost = unitCost.gold;

  const myGold = agent.player.gold;

  let maxPurchase = Math.floor(myGold / goldCost);

  if (maxPurchase <= 3) return false;

  const aCity = agent.getCities()[0];

  if (aCity == null) return false;

  agent.emit(Constants.messages.buyFromShop, {
    itemId: unitItem.id,
    quantity: maxPurchase,
    x: aCity.x,
    y: aCity.y
  });

  return true;

}

module.exports = buyUnits;
