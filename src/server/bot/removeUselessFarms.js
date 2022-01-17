
function removeUselessFarms(agent) {

  let success = false;

  agent.getCities().forEach(city => {
    if (success) return;
    city.getBuildingsInAura().forEach(building => {
      if (success) return;
      if (building.getPlayer().id == agent.player.id) {
        if (city.population == 8 && building.type.name == "Farm" && !building.isRazing()) {
          building.raze();
          success = true;
        }
      }
    });
  });

  return success;

}

module.exports = removeUselessFarms;
