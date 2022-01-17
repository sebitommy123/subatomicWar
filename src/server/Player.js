const { nanoid } = require('nanoid');
const BotAgent = require('./BotAgent');

class Player {

  constructor(game, socket, color, startingResources, bot=false) {
    this.id = nanoid();
    this.socket = socket;
    this.game = game;

    this.bot = bot;
    this.botAgent = null;
    if (bot) {
      this.botAgent = new BotAgent(this);
    }

    this.gold = startingResources.gold;
    this.oil = startingResources.oil;
    this.wood = startingResources.wood;
    this.color = color;

    this.startingPos = null;
  }

  canAfford(cost) {
    const { gold, oil, wood } = cost;

    if (gold && gold > this.gold) return false;
    if (oil && oil > this.oil) return false;
    if (wood && wood > this.wood) return false;

    return true;
  }

  pay(cost) {
    const { gold, oil, wood } = cost;

    if (gold) this.gold -= gold;
    if (oil) this.oil -= oil;
    if (wood) this.wood -= wood;

    this.gold = Math.ceil(this.gold);
    this.oil = Math.ceil(this.oil);
    this.wood = Math.ceil(this.wood);
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
      oil: this.oil,
      wood: this.wood,
    };
  }

}

module.exports = {
  Player
}
