const { nanoid } = require('nanoid');
const { getRingPositions } = require('../shared/utils');
const { Building } = require('./Building');

class City {

  constructor(game, x, y) {

    this.id = nanoid();

    this.game = game;
    this.x = x;
    this.y = y;

    this.population = 1;

    this.foodThisTick = 0;
    this.turnsLeft = this.getNeededToGrow();

  }

  get type() {
    return this.game.shop.items.find(i => i.name == "City");
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

  getPlayer() {

    return this.game.getPlayerAtPosition(this.x, this.y);
    
  }

  getNeededToGrow() {
    return 2 ** (this.population - 1) * this.game.config.baseCityGrowth;
  }

  tick() {

    let resourceYield = this.game.shop.multiplyCost(this.type.resourceYield, -1);

    this.getPlayer().pay(resourceYield);

    let unitYield = this.type.unitYield;

    if (unitYield > 0) {
      this.game.addUnitsAnimating(this.x, this.y, unitYield);
    }

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

  toClient() {
    return {
      id: this.id,
      x: this.x,
      y: this.y,
      population: this.population,
      turnsLeft: this.turnsLeft,
      type: this.type,
    };
  }

}

module.exports = {
  City
}
