const { nanoid } = require('nanoid');

class Player {

  constructor(socket) {
    this.id = nanoid();
    this.socket = socket;

    this.color = "#" + Math.floor(Math.random() * 16777215).toString(16);
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

}

module.exports = {
  Player
}
