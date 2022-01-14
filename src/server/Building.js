const { nanoid } = require("nanoid");
const { BuiltNode } = require("./BuiltNode");

class Building extends BuiltNode{

  constructor(game, x, y, type) {

    super("building", game, x, y, type);

  }

  getCity() {

    return this.game.getCityAuraAtPosition(this.x, this.y);

  }

  isProductiveSpecific() {

    return this.getCity().getPlayer().id == this.getPlayer().id;
    
  }

  specificTick() {

    this.getCity().foodThisTick += this.type.food;

  }

}

module.exports = {
  Building
}
