const { nanoid } = require("nanoid");

class Building {

  constructor(game, x, y, type) {

    this.id = nanoid();
    this.game = game;
    
    this.x = x;
    this.y = y;
    this.type = type;

  }

  getCity() {
    return this.game.getCityAuraAtPosition(this.x, this.y);
  }

  isActive() {

    return this.getCity().getPlayer().id == this.getPlayer().id;
    
  }

  getPlayer() {

    return this.game.getPlayerAtPosition(this.x, this.y);

  }

  getBlacklistItem() {

    return this.type.blacklist[this.game.land[this.y][this.x]];

  }

  getLandEfficiency() {

    let item = this.getBlacklistItem();

    if (item) {
      if (item.efficiency) {
        return item.efficiency;
      }
    }

    return 1;

  }

  tick() {
    let p = this.getPlayer();

    if (p && this.isActive()) {
      if (this.type.name === "Gold mine") {
        p.gold += Math.ceil(5 * this.getLandEfficiency());
      }
      if (this.type.name === "Lumber mill") {
        p.wood += Math.ceil(5 * this.getLandEfficiency());
      }
      if (this.type.name === "Oil rig") {
        p.oil += Math.ceil(5 * this.getLandEfficiency());
      }
      if (this.type.name === "Farm") {
        this.getCity().foodThisTick += 1;
      }
    }

  }

  toClient() {

    return {
      id: this.id,
      x: this.x,
      y: this.y,
      type: this.type,
    }

  }

}

module.exports = {
  Building
}
