const { getRingPositions, isAdjescent, randomIntBetween } = require("../../shared/utils");

function getNeutralAura(agent, city) {

  const game = agent.game;

  let candidates = getRingPositions({x: city.x, y: city.y});

  candidates = candidates.filter(pos => game.inBounds(pos.x, pos.y));

  candidates = candidates.filter(pos => game.getPlayerAtPosition(pos.x, pos.y) == null);

  candidates = candidates.filter(pos => {
    let unitGoingToPos = game.vagrantUnits.find(({player, vagrantData}) => player.id == agent.player.id && vagrantData.toX == pos.x && vagrantData.toY == pos.y);
    return unitGoingToPos == null;
  });

  return candidates;

}

function ensureAuraBasic(agent) {

  let success = false;

  agent.getCities().forEach(city => {

    if (success) return;

    let aura = getNeutralAura(agent, city);

    aura.forEach(pos => {

      if (success) return;

      if (isAdjescent(pos, {x: city.x, y: city.y})) {

        agent.emit("moveUnits", {
          from: {
            x: city.x,
            y: city.y
          },
          to: pos,
          quantity: randomIntBetween(1, 2),
        });

        success = true;

      } else {

        let unitsThatCanCome = agent.getUnitsAdjescentTo(pos);

        if (unitsThatCanCome.length == 0) return;

        let chosenUnit = unitsThatCanCome[0];

        agent.emit("moveUnits", {
          from: {
            x: chosenUnit.x,
            y: chosenUnit.y
          },
          to: pos,
          quantity: 1,
        });

        success = true;
      
      }

    });

  });

  return success;

}

module.exports = ensureAuraBasic;
