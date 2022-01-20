
function defend(agent, tiles) {

  let success = false;

  let myUnits = agent.game.units.filter(u => u.player.id == agent.player.id);

  if (tiles.length == 1) {

    let unitsOutside = myUnits.filter(u => u.x != tiles[0].x || u.y != tiles[0].y);

    if (unitsOutside.length > 0) {
      agent.emit("moveUnits", {
        from: {
          x: unitsOutside[0].x,
          y: unitsOutside[0].y
        },
        to: {
          x: tiles[0].x,
          y: tiles[0].y,
        },
        quantity: unitsOutside[0].quantity,
      });
    }
  }

  tiles.forEach(tile => {



  });

}

module.exports = defend;
