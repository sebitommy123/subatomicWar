const { nanoid } = require('nanoid');
const { landTypes } = require('./land');

class Unit {

  constructor(game, player, x, y, quantity, vagrant=false, vagrantData=null, retreating=false) {
    
    this.id = nanoid();
    this.game = game;

    this.player = player;
    this.x = x;
    this.y = y;
    this.lastQuantity = quantity;
    this.lastQuantityChange = null;
    this.quantity = quantity;
    this.fighting = false;
    this.fightingStart = null;
    this.retreating = retreating;
    this.engagedUnits = [];
    this.vagrant = vagrant;
    this.vagrantData = vagrantData;

  }

  setQuantityAnimating(quantity) {
    this.lastQuantity = this.quantity;
    this.lastQuantityChange = Date.now();
    this.quantity = quantity;
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

    let wasFighting = this.fighting;
    
    this.fighting = false;

    if (this.vagrant && wasFighting) {
      let fightingUnit = this.game.getUnitAtPosition(this.vagrantData.toX, this.vagrantData.toY);
      if(fightingUnit) fightingUnit.disengage(this);
    }

    if(!this.vagrant && wasFighting) this.resolveFightUponLoss();
    
    //THIS HAPPENS LAST!! KEEP IT LAST!
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

    let wasFighting = this.fighting;

    unit.fighting = true;
    this.fighting = true;

    if (!wasFighting){
      this.startFight();
    } 

  }

  startFight() {
    this.fightingStart = Date.now();

    setTimeout(this.evolveFight.bind(this), this.game.config.fightInitialDelay);
  }

  takeDamage(damage) {
    if (damage == 0) return;

    let realDamage = parseInt(damage);
    let offsetDamage = damage - realDamage;

    if (Math.random() < offsetDamage) {
      realDamage++;
    }

    this.setQuantityAnimating(Math.max(this.quantity - realDamage, 0));
    if (this.quantity <= 0) this.remove();
  }

  landBelow() {
    return this.game.land[this.y][this.x];
  }

  buildingBelow() {
    return this.game.getBuildingAtPosition(this.x, this.y);
  }

  cityBelow() {
    return this.game.getCityAtPosition(this.x, this.y);
  }

  getMultiplier(name) {
    let multiplier = landTypes[this.landBelow()].combat[name];
    
    let building = this.buildingBelow();
    if (building) multiplier *= building.type.combat[name];
    
    let city = this.cityBelow();
    if (city) multiplier *= this.game.shop.items.find(i => i.type === "city").combat[name];

    return multiplier;
  }

  getDefenseMultiplier() {
    return this.getMultiplier("defense");
  }

  getAttackMultiplier() {
    return this.getMultiplier("attack");
  }

  evolveFight() {
    
    let outgoingMultiplier = this.game.config.damageMultiplier * this.getDefenseMultiplier();
    
    [...this.engagedUnits].forEach(enemy => {
      
      if (!this.fighting) return; // stop if dead

      let total = enemy.quantity + this.quantity;
      
      let incomingMultiplier = this.game.config.damageMultiplier * enemy.getAttackMultiplier();

      let outgoingDamage = total * outgoingMultiplier;

      let incomingDamage = total * incomingMultiplier;

      let extraFactor = 1;

      if (outgoingDamage < 1) {
        extraFactor = 1 / outgoingDamage;
      }

      if (incomingDamage * extraFactor < 1) {
        extraFactor = 1 / incomingDamage;
      }

      if (outgoingDamage > enemy.quantity) {
        extraFactor = enemy.quantity / outgoingDamage;
      }
      if (incomingDamage * extraFactor > this.quantity) {
        extraFactor = this.quantity / incomingDamage;
      }

      enemy.takeDamage(outgoingDamage * extraFactor);
      this.takeDamage(incomingDamage * extraFactor);
      
    });

    this.game.sendSyncUpdate();

    if(this.fighting) setTimeout(this.evolveFight.bind(this), this.game.config.fightSpeed);

  }

  resolveFightUponLoss() {

    if (this.engagedUnits.length == 0) {
      return;
    }

    let winningPlayer = this.engagedUnits[0].player;

    let totalWinningUnits = this.engagedUnits.reduce((total, unit) => {
      if (unit.player.id != winningPlayer.id) return total;
      return total + unit.quantity;
    }, 0);

    let newWinningUnit = new Unit(this.game, winningPlayer, this.x, this.y, totalWinningUnits);
    this.game.units.push(newWinningUnit);

    [...this.engagedUnits].forEach(unit => {
      console.log(unit);
      if(unit.player.id == winningPlayer.id) unit.remove();
    });

    console.log(this.engagedUnits.length);

    if (this.engagedUnits.length > 0) {
      this.engagedUnits.forEach(unit => {
        newWinningUnit.engage(unit);
      });
    }

    this.game.territory[this.y][this.x] = winningPlayer.id;

  }

  toClient() {

    return {
      id: this.id,
      playerId: this.player.id,
      x: this.x,
      y: this.y,
      quantity: this.quantity,
      lastQuantity: this.lastQuantity,
      lastQuantityChange: this.lastQuantityChange,
      vagrant: this.vagrant,
      vagrantData: this.vagrantData,
      fighting: this.fighting,
      engagedUnits: this.engagedUnits.map(u => u.id),
      retreating: this.retreating,
      fightingStart: this.fightingStart
    }

  }

}

module.exports = {
  Unit
};