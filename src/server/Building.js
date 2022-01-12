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

  remove() {

    this.game.buildings.splice(this.game.buildings.indexOf(this), 1);

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

      let resourceYield = this.game.shop.multiplyCost(this.type.resourceYield, -this.getLandEfficiency());

      p.pay(resourceYield);

      let unitYield = Math.floor(this.type.unitYield * this.getLandEfficiency());

      if (unitYield > 0) {
        this.game.addUnitsAnimating(this.x, this.y, unitYield);
      }

      this.getCity().foodThisTick += this.type.food;

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
