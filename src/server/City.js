const { nanoid } = require('nanoid');

class City {

  constructor(game, x, y) {

    this.id = nanoid();

    this.game = game;
    this.x = x;
    this.y = y;

    this.population = 1;

  }

  toClient() {
    return {
      id: this.id,
      x: this.x,
      y: this.y,
      population: this.population,
    };
  }

}

module.exports = {
  City
}
