const Joi = require("joi");
const { nanoid } = require("nanoid");
const Constants = require("../shared/constants");
const { resolveTerritoryBlacklist, isIsolatedPosition } = require("../shared/utils");
const { Building } = require("./Building");
const { City } = require("./City");
const { Structure } = require("./Structure");
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

    this.handlers["structure"] = (player, item, input) => {

      const { x, y } = input;

      if (x == null || y == null) return;

      if (this.game.territory[y][x] !== player.id) return;

      if (!player.canAfford(item.cost)) {
        player.socket.emitError(`You don't have enough resources to buy a ${item.name}.`);
        return;
      }

      if (item.isOnBorder) {

        if (this.game.isBorderBuiltNodePosition(x, y)) {
  
          player.socket.emitError(`There is already something here.`);
          return;
  
        }
        
      } else {

        if (this.game.isCentralBuiltNodePosition(x, y)) {
  
          player.socket.emitError(`There is already something here.`);
          return;
  
        }

      }

      if (this.game.fightingOccuringAt(x, y)) {
        player.socket.emitError(`You can't place where there is fighting occuring.`);
        return;
      }

      player.pay(item.cost);

      let structure = new Structure(this.game, x, y, item);
      this.game.structures.push(structure);

      this.game.sendSyncUpdate();

    }

    this.handlers["building"] = (player, item, input) => {

      const { x, y } = input;

      if (x == null || y == null) return;

      if (this.game.territory[y][x] !== player.id) return;

      if (!player.canAfford(item.cost)) {
        player.socket.emitError(`You don't have enough resources to buy a ${item.name}.`);
        return;
      }

      if (this.game.isCentralBuiltNodePosition(x, y)) {

        player.socket.emitError(`There is already something here.`);
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

      if (this.game.fightingOccuringAt(x, y)) {
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

      if (this.game.isCentralBuiltNodePosition(x, y)) {
          
        player.socket.emitError(`There is already something here.`);
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

      if (!this.game.getCityAtPosition(x, y)) return;

      // TODO: Factor in oil
      
      let costNow = this.multiplyCost(item.cost, quantity);

      if (!player.canAfford(costNow)) {
        player.socket.emitError("You don't have enough resources to buy a unit here.");
        return;
      }

      player.pay(costNow);

      this.game.addUnitsAnimating(x, y, quantity);

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
      resourceYield: {},
      food: 0,
      combat: {},
      blacklist: {
        water: { allowed: false }
      },
      tags: [],
    });

    this.addItem({
      name: "Gold mine",
      desc: "Yields 5 gold per turn",
      cost: { wood: 200 },
      image: "mine.png",
      type: "building",
      resourceYield: { gold: 5 },
      food: 0,
      combat: {},
      blacklist: {
        water: { allowed: false },
        desert: { allowed: true, efficiency: 0.5 },
        plains: { allowed: true },
        forest: { allowed: true },
        mountains: { allowed: true, efficiency: 1.4 },
        oil: { allowed: false },
      },
      tags: [],
      razeCost: { gold: 50 },
      razeTime: 20 * 1000,
    });

    this.addItem({
      name: "Lumber mill",
      desc: "Yields 5 wood per turn",
      cost: { wood: 160 },
      image: "lumbermill.png",
      type: "building",
      resourceYield: { wood: 5 },
      food: 0,
      combat: {},
      blacklist: {
        water: { allowed: false },
        desert: { allowed: false },
        plains: { allowed: true, efficiency: 0.5 },
        forest: { allowed: true },
        mountains: { allowed: true, efficiency: 0.5 },
        oil: { allowed: false },
      },
      tags: [],
      razeCost: { gold: 50 },
      razeTime: 20 * 1000,
    });

    this.addItem({
      name: "Farm",
      desc: "Doubles city growth speed",
      cost: { wood: 300 },
      image: "farm.png",
      type: "building",
      resourceYield: {},
      food: 1,
      combat: {},
      blacklist: {
        water: { allowed: false },
        desert: { allowed: false },
        plains: { allowed: true },
        forest: { allowed: true },
        mountains: { allowed: false },
        oil: { allowed: false },
      },
      tags: [],
      razeCost: { gold: 50 },
      razeTime: 20 * 1000,
    });

    this.addItem({
      name: "Oil rig",
      desc: "Yields 5 oil per turn",
      cost: { wood: 400 },
      image: "oilRig.png",
      type: "building",
      resourceYield: { oil: 5 },
      food: 0,
      combat: {},
      blacklist: {
        water: { allowed: false },
        desert: { allowed: false },
        plains: { allowed: false },
        forest: { allowed: false },
        mountains: { allowed: false },
        oil: { allowed: true },
      },
      tags: [],
      razeCost: { gold: 50 },
      razeTime: 20 * 1000,
    });

    this.addItem({
      name: "Barracks",
      desc: "Trains 3 units per turn",
      cost: { wood: 500 },
      image: "barracks.png",
      type: "building",
      resourceYield: {},
      food: 0,
      combat: {},
      unitYield: 3,
      blacklist: {
        water: { allowed: false },
        mountains: { allowed: false },
        oil: { allowed: false },
      },
      tags: [],
      razeCost: { gold: 50 },
      razeTime: 20 * 1000,
    });

    this.addItem({
      name: "City",
      desc: "Settle a new city",
      cost: { wood: 150, gold: 150 },
      image: "city.png",
      type: "city",
      resourceYield: {},
      food: 0,
      combat: { attack: 1.5, defense: 1.5 },
      blacklist: {
        water: { allowed: false },
        oil: { allowed: false },
      },
      tags: [],
      razeCost: { gold: 100 },
      razeTime: 20 * 1000,
    });

    this.addItem({
      name: "Trench",
      desc: "Better defensive position for your units",
      cost: { wood: 25, gold: 25 },
      image: "trenchFull.png",
      borderImage: "trench.png",
      type: "structure",
      resourceYield: {},
      food: 0,
      combat: { defense: 1.5, attack: 1 },
      blacklist: {
        water: { allowed: false },
        oil: { allowed: false },
        mountains: { allowed: false },
      },
      tags: [],
      razeCost: {},
      razeTime: 2 * 1000,
      isOnBorder: true,
    });

    this.addItem({
      name: "Turret",
      desc: "Damages all adjescent enemy units",
      cost: { gold: 150, oil: 50 },
      image: "turret.png",
      type: "structure",
      resourceYield: {},
      food: 0,
      combat: {},
      blacklist: {
        water: { allowed: false },
        mountains: { allowed: false },
      },
      tags: [],
      razeCost: { gold: 100 },
      razeTime: 20 * 1000,
    });

    this.addItem({
      name: "Missile silo",
      desc: "Launches missiles at enemy units",
      cost: { gold: 200, oil: 150 },
      image: "missiles.png",
      type: "structure",
      resourceYield: {},
      food: 0,
      combat: {},
      blacklist: {
        water: { allowed: false },
        mountains: { allowed: false },
      },
      tags: [],
      razeCost: { gold: 100 },
      razeTime: 20 * 1000,
      action: {
        type: "missile",
        range: 3,
        cost: { oil: 100 },
      },
    });

    this.addItem({
      name: "Nuclear missile silo",
      desc: "Launches nuclear missiles at enemy units",
      cost: { gold: 200, oil: 1000 },
      image: "missiles.png",
      type: "structure",
      resourceYield: {},
      food: 0,
      combat: {},
      blacklist: {
        water: { allowed: false },
        mountains: { allowed: false },
      },
      tags: [],
      razeCost: { gold: 100 },
      razeTime: 20 * 1000,
      action: {
        type: "nuclear",
        range: 3,
        cost: { oil: 500 },
      },
    });

    this.addItem({
      name: "Paratrooping airport",
      desc: "Allows units to paratroop from this airport",
      cost: { gold: 150, oil: 150 },
      image: "paratrooping.png",
      type: "structure",
      resourceYield: {},
      food: 0,
      combat: {},
      blacklist: {
        water: { allowed: false },
        mountains: { allowed: false },
      },
      tags: [],
      razeCost: { gold: 100 },
      razeTime: 20 * 1000,
      action: {
        type: "unit",
        range: 2,
        cost: { oil: 1 },
      },
    });

  }

  addItem(item) {

    let { name, cost, image, type, desc, blacklist, resourceYield, food, combat, unitYield, razeCost, razeTime, isOnBorder, borderImage, action } = item;

    if (!unitYield) unitYield = 0;

    if (!razeCost) razeCost = {};
    if (!razeTime) razeTime = 0;
    
    if (isOnBorder == null) isOnBorder = false;

    this.items.push({
      id: nanoid(),
      name, cost, image, type, desc, blacklist, resourceYield, food, combat, unitYield, razeCost, razeTime, isOnBorder, borderImage, action
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

  getItemByName(itemName) {
    return this.items.find(item => item.name.toLowerCase() === itemName.toLowerCase());
  }

  canPlaceBuiltNode(itemName, x, y) {
    let item = this.getItemByName(itemName);

    let { allowed } = resolveTerritoryBlacklist(item.blacklist, this.game.land[y][x]);

    return allowed;
  }

  handleOnBuyFromShop(player, input) {

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
