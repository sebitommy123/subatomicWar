const { nanoid } = require("nanoid");

class Structure {

  constructor(game, x, y, type) {

    this.id = nanoid();
    this.game = game;
    
    this.x = x;
    this.y = y;
    this.type = type;

  }

  getPlayer() {
    return this.game.getPlayerAtPosition(this.x, this.y);
  }

  remove() {

    this.game.structures.splice(this.game.structures.indexOf(this), 1);

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
  Structure
}
