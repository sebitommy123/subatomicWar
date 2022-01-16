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

  getBuildingsInAura() {

    return getRingPositions({ x: this.x, y: this.y }).map(position => {

      return this.game.getBuildingAtPosition(position.x, position.y);

    }).filter(b => b != null);

  }

  getBuildingCount() {

    return this.getBuildingsInAura().length;

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

  specificRaze() {

    this.getBuildingsInAura().forEach(building => {
      building.raze(this.type.razeTime);
    });

  }

  specificStopRaze() {

    this.getBuildingsInAura().forEach(building => {
      if (building.razingCollaterally) {
        building.stopRaze();
      }
    });


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
