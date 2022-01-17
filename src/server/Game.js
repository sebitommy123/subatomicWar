const { Player } = require("./Player");
const { Unit } = require("./Unit");
const { City } = require("./City");

const { updateStates } = require("./SocketWrapper");

const { generateEmptyTerritory, getEmptyPositions } = require("./territory");
const { generateRandomLand, landTypes } = require("./land");
const Constants = require("../shared/constants");
const Joi = require("joi");
const { colors, pickRandom, filter2dArray } = require("./utils");
const { isAdjescent, isIsolatedPosition, pathfind } = require("../shared/utils");
const { Shop } = require("./Shop");
const BotSocket = require("./BotSocket");

class Game {

  constructor(playerSockets, lobbyId, config) {

    this.stage = "pregame";

    this.config = config;
    this.lobbyId = lobbyId;

    this.gridDimensions = config.gridDimensions;

    this.players = playerSockets.map((s, i) => new Player(this, s, colors[i], config.startingResources, false));

    for (let i = 0; i < config.bots; i++) {
      let bot = new Player(this, new BotSocket(), colors[this.players.length + i], config.startingResources, true);
      this.players.push(bot);
    }

    this.territory = generateEmptyTerritory(this.gridDimensions.width, this.gridDimensions.height);
    this.land = generateRandomLand(this.gridDimensions.width, this.gridDimensions.height);
    this.units = [];
    this.vagrantUnits = [];
    this.cities = [];
    this.buildings = [];
    this.structures = [];

    this.dayStart = null;
    
    this.shop = null;

    this.setupPregame(config.waitTime);

    this.sendSyncUpdate();

  }

  getStartingPositions(playerId=null) {
    return this.players.filter(p => p.id != playerId).map(p => p.startingPos).filter(s => s != null);
  }

  getHumanPlayers() {

    return this.players.filter(p => !p.bot);

  }

  getBotPlayers() {

    return this.players.filter(p => p.bot);

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

    this.shop = new Shop(this); // this has to go before because many things expect the shop items list to exist
    
    this.ensureStartingTile();

    this.spawnInitialCities();

    this.spawnInitialUnits();

    this.registerGameEvents();

    this.setupBotCycle();

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

        let validPositions = isolatedPositions.filter(pos => this.shop.canPlaceBuiltNode("City", pos.x, pos.y));

        const { x, y } = pickRandom(validPositions);

        this.territory[y][x] = player.id;

        player.startingPos = { x, y };
      }

    });
  }

  setupBotCycle() {

    this.getBotPlayers().forEach(bot => {

      let botAgent = bot.botAgent;

      botAgent.handleGameStarted();

    });

    this.botLoop();

  }

  botLoop() {

    let anyActions = false;

    this.getBotPlayers().forEach(bot => {

      let botAgent = bot.botAgent;

      let performedAction = botAgent.chanceToPerformAction();

      if (performedAction) {
        anyActions = true;
      }

    });
    
    if (anyActions) {
      this.sendSyncUpdate();
    }

    setTimeout(this.botLoop.bind(this), 100);

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

      player.socket.on({
        message: Constants.messages.razeBuiltNode,
        state: state => state.screen === "game" && state.stage === "game",
        input: Joi.object({
          id: Joi.string().required(),
        }),
        respond: (input) => this.handleOnRaze(player, input),
      });

      player.socket.on({
        message: Constants.messages.stopRazingBuiltNode,
        state: state => state.screen === "game" && state.stage === "game",
        input: Joi.object({
          id: Joi.string().required(),
        }),
        respond: (input) => this.handleOnStopRazing(player, input),
      });

    });

  }

  handleOnStopRazing(player, input) {

    const { id } = input;

    const builtNode = this.getBuiltNodeById(id);

    if (!builtNode) return;

    if (!builtNode.ownedBy(player)) {
      player.socket.emitError(`You don't own this ${builtNode.type.name}`);
      return;
    }

    if (!builtNode.razingCollaterally) {
      builtNode.stopRaze();
    } else {
      builtNode.getCity().stopRaze();
    }

    this.sendSyncUpdate();

  }

  handleOnRaze(player, input) {

    const { id } = input;

    const builtNode = this.getBuiltNodeById(id);

    if (!builtNode) return;

    if (!builtNode.ownedBy(player)) {
      player.socket.emitError(`You don't own this ${builtNode.type.name}`);
      return;
    }

    const cost = builtNode.type.razeCost;

    if (!player.canAfford(cost)) {
      player.socket.emitError(`You don't have enough resources to raze this ${builtNode.type.name}`);
      return;
    }

    player.pay(cost);

    builtNode.raze();

    this.sendSyncUpdate();

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

    if (!landTypes[this.land[to.y][to.x]].canWalk) return;

    if (!isAdjescent(from, to)) {
      let playerAtPos = this.getPlayerAtPosition(to.x, to.y);
      if (playerAtPos == null) return;
      if (playerAtPos.id !== player.id) return;
    }

    let leftOver = fromUnit.quantity - quantity;
    if (leftOver < 0) return;

    let success = this.addVagrantUnit(player, from.x, from.y, quantity, to.x, to.y);

    if (!success) return;

    if (leftOver == 0) {
      fromUnit.remove();
    } else {
      fromUnit.quantity = leftOver;
    }

    this.sendSyncUpdate();

  }

  addVagrantUnit(player, x, y, quantity, toX, toY, retreating=false) {

    if (x == toX && y == toY) return false;

    let path = [{x: toX, y: toY}];

    if (!isAdjescent({x, y}, {x: toX, y: toY})) {
      console.log("Not adjescent", x, y, toX, toY);
      path = pathfind({x, y}, {x: toX, y: toY}, filter2dArray(this.territory, pid => pid === player.id));

      if (path == null) return false;

      path.splice(0, 1);
    }

    let moveTime = this.config.vagrantMoveTime.neutral;

    let playerAtDestination = this.getPlayerAtPosition(toX, toY);

    if (playerAtDestination != null) {

      if (playerAtDestination.id == player.id){
        moveTime = this.config.vagrantMoveTime.friendy;
      } else {
        moveTime = this.config.vagrantMoveTime.enemy;
      }

    }

    let vagrantUnit = new Unit(this, player, x, y, quantity, true, {
      toX: path[0].x,
      toY: path[0].y,
      start: Date.now(),
      end: Date.now() + moveTime,
      finalX: toX,
      finalY: toY,
    }, retreating);

    this.vagrantUnits.push(vagrantUnit);

    setTimeout(() => {
      
      vagrantUnit.handleArrival();

      this.sendSyncUpdate();

    }, moveTime);

    return true;
  }

  inBounds(x, y) {
    return x >= 0 && x < this.config.gridDimensions.width && y >= 0 && y < this.config.gridDimensions.height;
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

  getLandAt(x, y) {
    return this.land[y][x];
  }

  tickGame() {

    this.dayStart = Date.now();

    this.day++;
    this.players.forEach(player => {
      player.pay(this.shop.multiplyCost(this.config.resourcesPerDay, -1));
    });
    
    this.structures.forEach(structure => {
      structure.tick();
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

  getStructuresAtPosition(x, y) {
    return this.structures.filter(s => s.x == x && s.y == y);
  }

  getBuiltNodeById(id) {

    return this.getBuiltNodes().find(b => b.id == id);

  }

  getBuiltNodesAtPosition(x, y) {

    return this.getBuiltNodes().filter(b => b.x == x && b.y == y);

  }

  getBuiltNodes() {

    return [...this.buildings, ...this.cities, ...this.structures];

  }

  getCentralBuiltNodePosition(x, y) {

    return this.getBuiltNodes().find(builtNode => !builtNode.type.isOnBorder && builtNode.x == x && builtNode.y == y);

  }

  getBorderBuiltNodePosition(x, y) {

    return this.getBuiltNodes().find(builtNode => builtNode.type.isOnBorder && builtNode.x == x && builtNode.y == y);

  }

  isAnythingAtPos(x, y) {

    return this.getBuiltNodesAtPosition(x, y).length > 0;

  }

  isCentralBuiltNodePosition(x, y) {

    return !!this.getCentralBuiltNodePosition(x, y);

  }

  isBorderBuiltNodePosition(x, y) {

    return !!this.getBorderBuiltNodePosition(x, y);

  }

  fightingOccuringAt(x, y) {
    let unitAtPos = this.getUnitAtPosition(x, y);

    return unitAtPos && unitAtPos.fighting;
  }

  addUnitsAnimating(x, y, quantity) {

    let existingUnit = this.getUnitAtPosition(x, y);

    if (existingUnit) {
      existingUnit.setQuantityAnimating(existingUnit.quantity + quantity);
    } else {
      let newUnit = new Unit(this, this.getPlayerAtPosition(x, y), x, y, quantity);
      this.units.push(newUnit);
    }

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

  seizeTerritory(x, y, player) {

    let lastOwner = this.territory[y][x];

    this.territory[y][x] = player.id;

    if (lastOwner != null && lastOwner !== player.id) {
      let borderBuiltNode = this.getBorderBuiltNodePosition(x, y);
      if (borderBuiltNode) {
        borderBuiltNode.remove();
      }
      let centralBuiltNode = this.getCentralBuiltNodePosition(x, y);
      if (centralBuiltNode) {
        if (centralBuiltNode.isRazing()) {
          if (!centralBuiltNode.razingCollaterally) {
            centralBuiltNode.stopRaze();
          }
        }
      }
    }

  }

  getBuiltNodeArray(builtNodeType) {
    switch (builtNodeType) {
      case "city":
        return this.cities;
      case "building":
        return this.buildings;
      case "structure":
        return this.structures;
    }
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
        structures: this.structures.map(s => s.toClient()),
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
