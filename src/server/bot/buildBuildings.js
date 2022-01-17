const Constants = require("../../shared/constants");

const { getRingPositions, resolveTerritoryBlacklist } = require("../../shared/utils");

const defaultOrder = ["Gold mine", "Lumber mill", "Farm", "Gold mine", "Farm", "Gold mine", "Barracks", "Barracks", "Barracks", "Barracks"];

function getCurrentStep(city, order) {

  let buildings = city.getBuildingsInAura();

  let typeList = buildings.map(b => b.type.name);

  let result;

  console.log(typeList);

  order.forEach((nextBuilding, step) => {

    if (result != null) return;

    if (typeList.includes(nextBuilding)) {  
      typeList.splice(typeList.indexOf(nextBuilding), 1);
      return;
    } else {
      if (nextBuilding == "Farm" && city.population == 8) return;
      result = step;
    }

  });

  return result;

}

function getOptimalPlacingLocation(agent, item, city) {

  let candidates = getRingPositions({ x: city.x, y: city.y });

  candidates = candidates.filter(pos => {
    if (!agent.game.inBounds(pos.x, pos.y)) return false;

    let player = agent.game.getPlayerAtPosition(pos.x, pos.y);
    if (player == null) return false;
    if (player.id != agent.player.id) return false;

    if (agent.game.isCentralBuiltNodePosition(pos.x, pos.y)) return false;

    if (agent.game.fightingOccuringAt(pos.x, pos.y)) return false;

    return true;
  });

  let bestCandidate = null;
  let bestEfficiency = 0;

  candidates.forEach(pos => {

    let land = agent.game.getLandAt(pos.x, pos.y);

    let res = resolveTerritoryBlacklist(item.blacklist, land);

    let efficiency = res.efficiency ? res.efficiency : 1;

    if (!res.allowed) efficiency = 0;

    if (efficiency > bestEfficiency) {
      bestCandidate = pos;
      bestEfficiency = efficiency;
    }

  });

  return bestCandidate;

}

function getOrder(agent, city) {

  let order = defaultOrder;

  ['Gold mine', 'Lumber mill', 'Farm', 'Barracks'].forEach(buildingType => {
    if (getOptimalPlacingLocation(agent, agent.game.shop.getItemByName(buildingType), city) == null) {
      order = order.filter(o => o != buildingType);
    }
  });

  return order;

}

function buildBuildings(agent) {

  let success = null;

  agent.getCities().forEach(city => {

    if (success !== null) return;

    if (!city.canTakeNewBuildings()) return;

    let order = getOrder(agent, city);

    let step = getCurrentStep(city, order);

    console.log(order, step);

    if (step == null) {

      success = false;
      return;

    }

    let buildingTypeName = order[step];

    let buildingItem = agent.game.shop.getItemByName(buildingTypeName);

    let buildingCost = buildingItem.cost;

    if (!agent.player.canAfford(buildingCost)) {
      success = false;
      return;
    }
    
    let pos = getOptimalPlacingLocation(agent, buildingItem, city);

    agent.emit(Constants.messages.buyFromShop, {
      itemId: buildingItem.id,
      quantity: 1,
      x: pos.x,
      y: pos.y
    });

    success = true;

  });

  return success;

}

module.exports = buildBuildings;
