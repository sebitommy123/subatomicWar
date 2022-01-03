const Joi = require("joi");
const { nanoid } = require("nanoid");
const Constants = require("../shared/constants");
const { resolveTerritoryBlacklist, isIsolatedPosition } = require("../shared/utils");
const { Building } = require("./Building");
const { City } = require("./City");
const { Unit } = require("./Unit");

class Shop {
  
  constructor(game) {

    this.game = game;

    this.items = [];
    this.handlers = {};

    this.addShopItems();

    this.addItemHandlers();

    this.registerShopEvents();

  }

  multiplyCost(cost, factor) {
      
    return {
      gold: cost.gold ? cost.gold * factor: null,
      oil: cost.oil ? cost.oil * factor : null,
      wood: cost.wood ? cost.wood * factor : null,
    };
    
  }

  addItemHandlers() {

    this.handlers["building"] = (player, item, input) => {

      const { x, y } = input;

      if (x == null || y == null) return;

      if (this.game.territory[y][x] !== player.id) return;

      if (!player.canAfford(item.cost)) {
        player.socket.emitError(`You don't have enough resources to buy a ${item.name}.`);
        return;
      }

      let buildingAtPos = this.game.getBuildingAtPosition(x, y);

      if (buildingAtPos) {
        player.socket.emitError(`There is already a ${buildingAtPos.type.name} here.`);
        return;
      }

      let cityAtPos = this.game.getCityAtPosition(x, y);

      if (cityAtPos) {
        player.socket.emitError(`There is already a city here.`);
        return;
      }
      
      let cityAuraAtPos = this.game.getCityAuraAtPosition(x, y);

      if (!cityAuraAtPos) {
        player.socket.emitError(`The ${item.name} has to be built close to a city.`);
        return;
      }

      if (cityAuraAtPos.getPlayer().id !== player.id) {
        player.socket.emitError(`You don't own the city here.`);
        return;
      }

      if (!cityAuraAtPos.canTakeNewBuildings()) {
        player.socket.emitError(`The city's population isn't large enough to take any more buildings.`);
        return;
      }

      let unitAtPos = this.game.getUnitAtPosition(x, y);
      if (unitAtPos && unitAtPos.fighting) {
        player.socket.emitError(`You can't place where there is fighting occuring.`);
        return;
      }

      player.pay(item.cost);

      let building = new Building(this.game, x, y, item);
      this.game.buildings.push(building);

      this.game.sendSyncUpdate();

    }

    this.handlers["city"] = (player, item, input) => {

      const { x, y } = input;

      if (x == null || y == null) return;

      if (this.game.territory[y][x] !== player.id) return;

      if (!player.canAfford(item.cost)) {
        player.socket.emitError(`You don't have enough resources to buy a city.`);
        return;
      }

      let unitAtPos = this.game.getUnitAtPosition(x, y);
      if (unitAtPos && unitAtPos.fighting) {
        player.socket.emitError(`You can't place where there is fighting occuring.`);
        return;
      }

      if (!isIsolatedPosition({x, y}, this.game.cities.map(city => ({x: city.x, y: city.y})))) {
        player.socket.emitError("Position is too close to someone else's.");
        return;
      }

      player.pay(item.cost);

      let city = new City(this.game, x, y);
      this.game.cities.push(city);

      this.game.sendSyncUpdate();

    }

    this.handlers["unit"] = (player, item, input) => {

      const { quantity, x, y } = input;

      if (quantity == null || x == null || y == null) return;

      if (this.game.territory[y][x] !== player.id) return;

      // TODO: Factor in oil
      
      let costNow = this.multiplyCost(item.cost, quantity);

      if (!player.canAfford(costNow)) {
        player.socket.emitError("You don't have enough resources to buy a unit here.");
        return;
      }

      player.pay(costNow);

      let existingUnit = this.game.getUnitAtPosition(x, y);

      if (existingUnit) {
        existingUnit.setQuantityAnimating(existingUnit.quantity + quantity);
      } else {
        let newUnit = new Unit(this.game, player, x, y, quantity);
        this.game.units.push(newUnit);
      }

      this.game.sendSyncUpdate();

    };

  }

  addShopItems() {

    this.addItem({
      name: "Soldier",
      desc: "Soldiers to defend and attack",
      cost: { gold: 3 },
      image: "soldier.png",
      type: "unit",
      blacklist: {
        water: { allowed: false }
      },
    });

    this.addItem({
      name: "Gold mine",
      desc: "Yields 5 gold per turn",
      cost: { wood: 100 },
      image: "mine.png",
      type: "building",
      blacklist: {
        water: { allowed: false },
        desert: { allowed: true, efficiency: 0.5 },
        plains: { allowed: true },
        forest: { allowed: true },
        mountains: { allowed: true, efficiency: 1.5 },
        oil: { allowed: false },
      }
    });

    this.addItem({
      name: "Lumber mill",
      desc: "Yields 5 wood per turn",
      cost: { wood: 80 },
      image: "lumbermill.png",
      type: "building",
      blacklist: {
        water: { allowed: false },
        desert: { allowed: false },
        plains: { allowed: true, efficiency: 0.5 },
        forest: { allowed: true },
        mountains: { allowed: true, efficiency: 0.5 },
        oil: { allowed: false },
      }
    });

    this.addItem({
      name: "Farm",
      desc: "Doubles city growth speed",
      cost: { wood: 140 },
      image: "farm.png",
      type: "building",
      blacklist: {
        water: { allowed: false },
        desert: { allowed: false },
        plains: { allowed: true },
        forest: { allowed: true },
        mountains: { allowed: false },
        oil: { allowed: false },
      }
    });

    this.addItem({
      name: "Oil rig",
      desc: "Yields 5 oil per turn",
      cost: { wood: 200 },
      image: "oilRig.png",
      type: "building",
      blacklist: {
        water: { allowed: false },
        desert: { allowed: false },
        plains: { allowed: false },
        forest: { allowed: false },
        mountains: { allowed: false },
        oil: { allowed: true },
      }
    });

    this.addItem({
      name: "City",
      desc: "Settle a new city",
      cost: { wood: 50, gold: 200 },
      image: "city.png",
      type: "city",
      blacklist: {
        water: { allowed: false },
        oil: { allowed: false },
      }
    });

  }

  addItem(item) {

    const { name, cost, image, type, desc, blacklist } = item;

    this.items.push({
      id: nanoid(),
      name, cost, image, type, desc, blacklist
    });

  }

  registerShopEvents() {

    this.game.players.forEach(player => {
      
      player.socket.on({
        message: Constants.messages.buyFromShop,
        state: state => state.screen === "game" && state.stage === "game",
        input: Joi.object({
          itemId: Joi.string().required(),
          quantity: Joi.number().integer().min(1),
          x: Joi.number().integer().min(0).max(this.game.gridDimensions.width - 1).required(),
          y: Joi.number().integer().min(0).max(this.game.gridDimensions.height - 1).required(),
        }),
        respond: (input) => this.handleOnBuyFromShop(player, input),
      })

    });

  }

  handleOnBuyFromShop(player, input) {

    console.log("Buying from shop");

    let itemId = input.itemId;

    let item = this.items.find(item => item.id === itemId);

    if (!item) return;

    let handler = this.handlers[item.type];

    if (!handler) return;

    const { x, y } = input;

    let { allowed } = resolveTerritoryBlacklist(item.blacklist, this.game.land[y][x]);

    if (!allowed) {
      player.socket.emitError(`You cannot place a ${item.name} on ${this.game.land[y][x]}.`);
      return;
    }

    handler(player, item, input);

  }

  getClientItems() {

    return this.items;

  }

}

module.exports = {
  Shop
}
