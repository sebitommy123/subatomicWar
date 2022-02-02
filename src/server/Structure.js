const { nanoid } = require("nanoid");
const { getAdjescentPositions } = require("../shared/utils");
const { BuiltNode } = require("./BuiltNode");

class Structure extends BuiltNode{

  constructor(game, x, y, type) {

    super("structure", game, x, y, type);

  }

  specificTick() {

    if (this.type.name == "Turret") {

      getAdjescentPositions({ x: this.x, y: this.y }).forEach(pos => {
        if (this.game.inBounds(pos.x, pos.y)) {
          const p = this.game.getPlayerAtPosition(pos.x, pos.y);
          if (p != null && p.id != this.getPlayer().id) {
            let unitAt = this.game.getUnitAtPosition(pos.x, pos.y);
            if (unitAt != null) {
              unitAt.takeDamage(Math.max(1, unitAt.quantity * 0.1));
            }
          }
        }
      });

    }

  }

}

module.exports = {
  Structure
}
