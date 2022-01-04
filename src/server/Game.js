const { Player } = require("./Player");
const { Unit } = require("./Unit");
const { City } = require("./City");

const { updateStates } = require("./SocketWrapper");

const { generateEmptyTerritory, getEmptyPositions } = require("./territory");
const { generateRandomLand, landTypes } = require("./land");
const Constants = require("../shared/constants");
const Joi = require("joi");
const { colors, pickRandom } = require("./utils");
const { isAdjescent, isIsolatedPosition } = require("../shared/utils");
const { Shop } = require("./Shop");

class Game {

  constructor(playerSockets, lobbyId, config) {

    this.stage = "pregame";

    this.config = config;
    this.lobbyId = lobbyId;

    this.gridDimensions = config.gridDimensions;

    this.players = playerSockets.map((s, i) => new Player(this, s, colors[i], config.startingResources));

    this.territory = generateEmptyTerritory(this.gridDimensions.width, this.gridDimensions.height);
    this.land = generateRandomLand(this.gridDimensions.width, this.gridDimensions.height);
    this.units = [];
    this.vagrantUnits = [];
    this.cities = [];
    this.buildings = [];

    this.dayStart = null;
    
    this.shop = null;

    this.setupPregame(config.waitTime);

    this.sendSyncUpdate();

  }

  getStartingPositions(playerId=null) {
    return this.players.filter(p => p.id != playerId).map(p => p.startingPos).filter(s => s != null);
  }

  setupPregame(waitTime) {
    this.timeOfStart = Date.now() + 1000 * waitTime;

    this.players.forEach(player => {
      player.socket.on({
        message: Constants.messages.chooseStartingPosition,
        state: state => state.screen === "game" && state.stage === "pregame",
        input: Joi.object({
          x: Joi.number().integer().min(0).max(this.gridDimensions.width - 1).required(),
          y: Joi.number().integer().min(0).max(this.gridDimensions.height - 1).required(),
        }),
        respond: input => {
          const { x, y } = input;

          if (!isIsolatedPosition({x, y}, this.getStartingPositions(player.id))) {
            player.socket.emitError("Position is too close to someone else's.");
            return;
          }

          const tile = this.land[y][x];
          if (tile == "water" || tile == "oil") return;

          let previousPos = player.startingPos;

          if (previousPos) {
            this.territory[previousPos.y][previousPos.x] = null;
          }

          this.territory[y][x] = player.id;

          player.startingPos = { x, y };

          this.sendSyncUpdate();
        },
      })
    });

    setTimeout(this.startGame.bind(this), waitTime * 1000);
  }

  startGame() {

    this.stage = "game";

    this.day = 0;
    
    this.ensureStartingTile();

    this.spawnInitialCities();

    this.spawnInitialUnits();

    this.registerGameEvents();

    this.shop = new Shop(this);

    this.sendSyncUpdate();

    this.tickGame();
    
  }

  spawnInitialCities() {

    this.players.forEach(player => {

      const { x, y } = player.startingPos;

      const city = new City(this, x, y);

      this.cities.push(city);

    });

  }

  spawnInitialUnits() {

    if (this.config.startingTroops == 0) return;
      
    this.players.forEach(player => {

      const { x, y } = player.startingPos;

      const unit = new Unit(this, player, x, y, this.config.startingTroops);

      this.units.push(unit);

    });
  
  }

  ensureStartingTile() {
    this.players.forEach(player => {

      let startingPos = player.startingPos;

      if (!startingPos) {
        player.socket.emitError("You didn't choose your starting position. A random one has been selected for you.");
        
        let emptyPositions = getEmptyPositions(this.territory);
        
        let isolatedPositions = emptyPositions.filter(pos => isIsolatedPosition(pos, this.getStartingPositions(player.id)));

        const { x, y } = pickRandom(isolatedPositions);

        this.territory[y][x] = player.id;

        player.startingPos = { x, y };
      }

    });
  }

  registerGameEvents() {

    this.players.forEach(player => {

      player.socket.on({
        message: Constants.messages.moveUnits, 
        state: state => state.screen === "game" && state.stage === "game",
        input: Joi.object({
          from: Joi.object({
            x: Joi.number().integer().min(0).max(this.gridDimensions.width - 1).required(),
            y: Joi.number().integer().min(0).max(this.gridDimensions.height - 1).required(),
          }),
          to: Joi.object({
            x: Joi.number().integer().min(0).max(this.gridDimensions.width - 1).required(),
            y: Joi.number().integer().min(0).max(this.gridDimensions.height - 1).required(),
          }),
          quantity: Joi.number().integer().min(1).required(),
        }),
        respond: (input) => this.handleOnUnitMove(player, input),
      });

      player.socket.on({
        message: Constants.messages.retreat,
        state: state => state.screen === "game" && state.stage === "game",
        input: Joi.object({
          unitId: Joi.string().required(),
          quantity: Joi.number().integer().min(1).required(),
        }),
        respond: (input) => this.handleOnUnitRetreat(player, input),
      });

    });

  }

  handleOnUnitRetreat(player, input) {

    const { unitId, quantity } = input;

    const fromUnit = this.getUnitById(unitId);

    if (!fromUnit) return;

    if (fromUnit.player.id !== player.id) return;

    if (!fromUnit.vagrant) return;

    if (!fromUnit.fighting) return;

    let leftOver = fromUnit.quantity - quantity;
    if (leftOver < 0) return;

    if (leftOver == 0) {
      fromUnit.remove();
    } else {
      fromUnit.quantity = leftOver;
    }

    this.addVagrantUnit(player, fromUnit.vagrantData.toX, fromUnit.vagrantData.toY, quantity, fromUnit.x, fromUnit.y, true);

    this.sendSyncUpdate();

  }

  handleOnUnitMove(player, input) {
  
    const { from, to, quantity } = input;

    const fromUnit = this.getUnitAtPosition(from.x, from.y);

    if (!fromUnit) return;

    if (fromUnit.player.id !== player.id) return;

    if(!isAdjescent(from, to)) return;

    if (!landTypes[this.land[to.y][to.x]].canWalk) return;

    let leftOver = fromUnit.quantity - quantity;
    if (leftOver < 0) return;

    if (leftOver == 0) {
      fromUnit.remove();
    } else {
      fromUnit.quantity = leftOver;
    }

    this.addVagrantUnit(player, from.x, from.y, quantity, to.x, to.y);

    this.sendSyncUpdate();

  }

  addVagrantUnit(player, x, y, quantity, toX, toY, retreating=false) {
    let vagrantUnit = new Unit(this, player, x, y, quantity, true, {
      toX,
      toY,
      start: Date.now(),
      end: Date.now() + this.config.vagrantMoveTime,
    }, retreating);

    this.vagrantUnits.push(vagrantUnit);

    setTimeout(() => {
      
      vagrantUnit.handleArrival();

      this.sendSyncUpdate();

    }, this.config.vagrantMoveTime);
  }

  getUnitAtPosition(x, y) {

    return this.units.find(u => u.x === x && u.y === y);

  }

  getBuildingAtPosition(x, y) {

    return this.buildings.find(b => b.x === x && b.y === y);

  }

  getCityAtPosition(x, y) {

    return this.cities.find(c => c.x === x && c.y === y);

  }

  getPlayerAtPosition(x, y) {
    let playerId = this.territory[y][x];

    if (playerId == null) {
      return null;
    }

    return this.getPlayerById(playerId);
  }

  getCityAuraAtPosition(x, y) {

    return this.cities.find(city => {

      if (city.x == x && city.y == y) return false; //a city is not in its own aura

      return Math.abs(city.x - x) <= 1 && Math.abs(city.y - y) <= 1;

    });

  }

  getUnitById(id) {

    return this.units.find(u => u.id == id) || this.vagrantUnits.find(u => u.id == id);

  }

  tickGame() {

    this.dayStart = Date.now();

    this.day++;
    this.players.forEach(player => {
      player.pay(this.shop.multiplyCost(this.config.resourcesPerDay, -1));
    });

    
    this.buildings.forEach(building => {
      building.tick();
    });
    
    this.cities.forEach(city => {
      city.tick();
    });

    this.sendSyncUpdate();

    setTimeout(this.tickGame.bind(this), this.config.dayLength);

  }

  setStateAll(updateFunc) {
      
    this.players.forEach(player => {
      player.socket.setState(updateFunc(player));
      player.socket.emitState();
    });

  }

  getPlayerById(pid) {
    return this.players.find(p => p.id == pid);
  }

  sendSyncUpdate() {

    this.setStateAll(player => {

      let baseObj = {
        screen: "game",
        serverTime: Date.now(),
        name: player.name,
        playerId: player.id,
        stage: this.stage,
        gridDimensions: this.gridDimensions,
        players: this.players.map(p => p == player ? p.toClientSelf() : p.toClient()),
        territory: this.territory,
        units: this.units.map(unit => unit.toClient()),
        vagrantUnits: this.vagrantUnits.map(unit => unit.toClient()),
        land: this.land,
        cities: this.cities.map(c => c.toClient()),
        buildings: this.buildings.map(b => b.toClient()),
        landTypes: landTypes,
      };
  
      if (this.stage === "pregame") {
        baseObj.timeOfStart = this.timeOfStart;
      }

      if (this.stage === "game") {
        baseObj.day = this.day;

        if (this.dayStart) {
          baseObj.dayStart = this.dayStart;
          baseObj.dayEnd = this.dayStart + this.config.dayLength;
        }

        baseObj.shopItems = this.shop.getClientItems();
      }
      
      return baseObj;
    });

  }

}

function startGameFromLobby(lobby) {

  const game = new Game(
    lobby.sockets,
    lobby.id, 
    lobby.config);

  games.push(game);

  lobby.removeLobby();

  return game;

}

let games;

function makeGamesGlobal(gamesR) {
  games = gamesR;
  return gamesR;
}

module.exports = {
  Game,
  makeGamesGlobal,
  startGameFromLobby
}
