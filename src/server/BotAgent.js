const { isAdjescent, randomNumberBetween, getPositionInPositionList } = require("../shared/utils");
const buildBuildings = require("./bot/buildBuildings");
const buyUnits = require("./bot/buyUnits");
const defend = require("./bot/defend");
const ensureAuraBasic = require("./bot/ensureAuraBasic");
const removeUselessFarms = require("./bot/removeUselessFarms");

class BotAgent {

  constructor(player) {

    this.player = player;

    this.nextAction = null;

  }

  get game() {
    return this.player.game;
  }

  get config() {
    return this.game.config;
  }

  get socket() {
    return this.player.socket;
  }

  get emit() {
    return this.socket.clientEmit.bind(this.socket);
  }

  getCities() {
    return this.game.cities.filter(c => c.getPlayer().id == this.player.id);
  }

  getUnitsAdjescentTo(pos) {

    return this.game.units.filter(u => u.player.id == this.player.id && isAdjescent({x: u.x, y: u.y}, pos));

  }

  handleGameStarted() {

    this.nextAction = Date.now() + this.config.botSpeed;

  }

  getTilesUnderAttack() {

    let tiles = this.game.vagrantUnits.map(unit => {
      if (unit.player.id == this.player.id) return null;
      
      let p = this.game.getPlayerAtPosition(unit.vagrantData.toX, unit.vagrantData.toY);
      if (p == null) return null;
      if (p.id != this.player.id) return null;

      return {x: unit.vagrantData.toX, y: unit.vagrantData.toY, quantity: unit.quantity};
    }).filter(t => t != null);

    let tilesUnderAttack = [];

    tiles.forEach(t => {
      let pos = getPositionInPositionList(t, tilesUnderAttack);

      if (pos == null) {
        tilesUnderAttack.push(t);
      } else {
        pos.quantity += t.quantity;
      }
    });

    return tilesUnderAttack;

  }

  chanceToPerformAction() {

    if (this.nextAction > Date.now()) return false;

    const tilesUnderAttack = this.getTilesUnderAttack();

    if (tilesUnderAttack.length > 0) {
      defend(this, tilesUnderAttack);
    } else {
      const layers = [buyUnits, ensureAuraBasic, buildBuildings, removeUselessFarms];
      let done = false;

      layers.forEach(layer => {
        if (done) return;

        done = layer(this);
      });
    }    

    this.nextAction = Date.now() + randomNumberBetween(this.config.botSpeed * 0.4, this.config.botSpeed * 1.8);

    return true;

  }

}

module.exports = BotAgent;
