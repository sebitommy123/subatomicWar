const { nanoid } = require('nanoid');

class Player {

  constructor(game, socket, color, gold) {
    this.id = nanoid();
    this.socket = socket;
    this.game = game;

    this.gold = gold;
    this.color = color;
  }

  get name() {
    return this.socket.state.name;
  }

  toClient() {
    return {
      id: this.id,
      name: this.name,
      color: this.color,
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
