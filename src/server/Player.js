const { nanoid } = require('nanoid');

class Player {

  constructor(game, socket, color, gold) {
    this.id = nanoid();
    this.socket = socket;
    this.game = game;

    this.gold = gold;
    this.color = color;

    this.startingPos = null;
  }

  isEnemyTile(x, y) {
    if (this.game.territory[y][x] === null) return false;

    return this.game.territory[y][x] != this.id;
  }

  isOccupiedEnemyTile(x, y) {
    return this.game.units.some(u => u.player.id != this.id && u.x == x && u.y == y);
  }

  get name() {
    return this.socket.state.name;
  }

  toClient() {
    return {
      id: this.id,
      name: this.name,
      color: this.color,
      startingPos: this.startingPos
    };
  }

  toClientSelf() {
    return {
      ...this.toClient(),
      gold: this.gold,
    };
  }

}

module.exports = {
  Player
}
