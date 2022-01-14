const { nanoid } = require('nanoid');

class BuiltNode {

  constructor(superType, game, x, y, type=null) {

    this.id = nanoid();
    this.game = game;
    this.x = x;
    this.y = y;
    
    this.razingTimeout = null;
    this.razeEnd = null;
    this.razeStart = null;

    if (type != null) this.type = type;

    if (superType == "city") {
      this.type = this.game.shop.items.find(i => i.name == "City");
    }

    this.array = this.game.getBuiltNodeArray(superType);

  }

  isProductive() {

    if (this.isProductiveSpecific && !this.isProductiveSpecific()) return false;

    if (this.getPlayer() == null) return false;

    return true;

  }

  remove() {

    this.array.splice(this.array.indexOf(this), 1);

  }

  getPlayer() {

    return this.game.getPlayerAtPosition(this.x, this.y);

  }

  ownedBy(player) {
    return this.getPlayer().id == player.id;
  }

  getLandUnder() {
    return this.game.getLandAt(this.x, this.y);
  }

  getBlacklistItem() {

    return this.type.blacklist[this.getLandUnder()];

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

  isRazing() {

    return this.razingTimeout != null;

  }

  raze() {

    const time = this.type.razeTime;

    if (this.razingTimeout) {
      return;
    }

    this.razeStart = Date.now();
    this.razeEnd = Date.now() + time;

    this.razingTimeout = setTimeout(() => {
      this.razeEnd = null;
      this.razingTimeout = null;

      this.remove();

      this.game.sendSyncUpdate();
    }, time);

  }

  stopRaze() {

    clearTimeout(this.razingTimeout);

    this.razingTimeout = null;
    this.razeEnd = null;

  }

  tick() {

    if (this.isProductive()) {

      let p = this.getPlayer();

      let resourceYield = this.game.shop.multiplyCost(this.type.resourceYield, -this.getLandEfficiency());

      p.pay(resourceYield);

      let unitYield = Math.floor(this.type.unitYield * this.getLandEfficiency());

      if (unitYield > 0) {
        this.game.addUnitsAnimating(this.x, this.y, unitYield);
      }

      if (this.specificTick) {
        this.specificTick();
      }
    }

  }

  toClient() {

    let extra = {};

    if (this.toClientSpecific) extra = this.toClientSpecific();

    return {
      id: this.id,
      x: this.x,
      y: this.y,
      type: this.type,
      razeEnd: this.razeEnd,
      razeStart: this.razeStart,
      ...extra
    }

  }

}

module.exports = {
  BuiltNode,
}
