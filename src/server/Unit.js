const { nanoid } = require('nanoid');

class Unit {

  constructor(game, player, x, y, quantity, vagrant=false, vagrantData=null, retreating=false) {
    
    this.id = nanoid();
    this.game = game;

    this.player = player;
    this.x = x;
    this.y = y;
    this.quantity = quantity;
    this.fighting = false;
    this.retreating = false;
    this.engagedUnits = [];
    this.vagrant = vagrant;
    this.vagrantData = vagrantData;

  }

  intake(unit) {
    this.quantity += unit.quantity;
    unit.remove();
  }

  forceGround() {
    if (!this.vagrant) return;

    let newUnit = new Unit(this.game, this.player, this.vagrantData.toX, this.vagrantData.toY, this.quantity);
    this.game.units.push(newUnit);
    this.remove();
  }

  handleArrival() {
    const { toX, toY } = this.vagrantData;

    const unitAtDestination = this.game.getUnitAtPosition(toX, toY);
    
    this.retreating = false;

    if (unitAtDestination) {
      if (unitAtDestination.player.id == this.player.id) {
        unitAtDestination.intake(this);
      } else {
        unitAtDestination.engage(this);
      }        
    } else {
      this.forceGround();
      this.game.territory[this.vagrantData.toY][this.vagrantData.toX] = this.player.id;
    }
  }

  remove() {
    if (this.vagrant && this.fighting) {
      let fightingUnit = this.game.getUnitAtPosition(this.vagrantData.toX, this.vagrantData.toY);
      if(fightingUnit) fightingUnit.disengage(this);
    }
    
    this.game.units = this.game.units.filter(u => u.id != this.id);
    this.game.vagrantUnits = this.game.vagrantUnits.filter(u => u.id != this.id);
  }

  sameInSpirit(unit) {
    return this.player.id == unit.player.id && this.x == unit.x && this.y == unit.y;
  }

  disengage(unit) {

    this.engagedUnits = this.engagedUnits.filter(u => u.id != unit.id);

    if (this.engagedUnits.length == 0) {
      this.fighting = false;
    }

  }

  engage(unit) {

    let sameUnit = this.engagedUnits.find(u => u.sameInSpirit(unit));
    if (sameUnit) {
      sameUnit.intake(unit);
    } else {
      this.engagedUnits.push(unit);
    }

    unit.fighting = true;
    this.fighting = true;

  }

  toClient() {

    return {
      id: this.id,
      playerId: this.player.id,
      x: this.x,
      y: this.y,
      quantity: this.quantity,
      vagrant: this.vagrant,
      vagrantData: this.vagrantData,
      fighting: this.fighting,
      engagedUnits: this.engagedUnits.map(u => u.id),
      retreating: this.retreating,
    }

  }

}

module.exports = {
  Unit
};