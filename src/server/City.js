const { getRingPositions } = require('../shared/utils');
const { Building } = require('./Building');
const { BuiltNode } = require('./BuiltNode');

class City extends BuiltNode{

  constructor(game, x, y) {

    super("city", game, x, y);

    this.population = 1;

    this.foodThisTick = 0;
    this.turnsLeft = this.getNeededToGrow();

  }

  canTakeNewBuildings() {
    return this.getBuildingCount() < this.population;
  }

  getBuildingCount() {

    let count = 0;

    getRingPositions({ x: this.x, y: this.y }).forEach(position => {

      let building = this.game.getBuildingAtPosition(position.x, position.y);

      if (building) {
        count += 1;
      }

    });

    return count;

  }

  getNeededToGrow() {
    return 2 ** (this.population - 1) * this.game.config.baseCityGrowth;
  }

  specificTick() {

    if (this.population < 8) {

      let skipTurns = 4 ** this.foodThisTick; // even with 0, that's 1 per turn, natural growth of 1 turn per turn

      this.turnsLeft -= skipTurns;

      if (this.turnsLeft <= 0) {
        this.population += 1;
        this.turnsLeft = this.getNeededToGrow();
      }

    }

    this.foodThisTick = 0;
      
  }

  toClientSpecific() {
    return {
      population: this.population,
      turnsLeft: this.turnsLeft,
    };
  }

}

module.exports = {
  City
}
