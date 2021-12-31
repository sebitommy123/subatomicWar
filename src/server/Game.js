const { Player } = require("./Player");
const { Unit } = require("./Unit");
const { updateStates } = require("./SocketWrapper");

const { generateEmptyTerritory, getEmptyPositions } = require("./territory");
const { generateRandomLand } = require("./land");
const Constants = require("../shared/constants");
const Joi = require("joi");
const { colors, pickRandom } = require("./utils");
const { isAdjescent } = require("../shared/utils");

class Game {

  constructor(playerSockets, lobbyId, config) {

    this.stage = "pregame";

    this.config = config;
    this.lobbyId = lobbyId;

    this.gridDimensions = config.gridDimensions;

    this.players = playerSockets.map((s, i) => new Player(this, s, colors[i], config.startingGold));

    this.territory = generateEmptyTerritory(this.gridDimensions.width, this.gridDimensions.height);
    this.land = generateRandomLand(this.gridDimensions.width, this.gridDimensions.height);
    this.units = [];
    this.vagrantUnits = [];

    this.setupPregame(config.waitTime);

    this.sendSyncUpdate();

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

          if (this.territory[y][x] !== null) {
            player.socket.emitError("Position is already occupied.");
            return;
          }

          this.territory.forEach(row => {
            row.forEach((val, i) => {
              if (val === player.id) {
                row[i] = null;
              }
            });
          });
          this.territory[y][x] = player.id;

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

    this.registerGameEvents();

    this.sendSyncUpdate();

    this.tickGame();
    
  }

  ensureStartingTile() {
    this.players.forEach(player => {

      let startingPos;

      for (let y = 0; y < this.gridDimensions.height; y++) {
        for (let x = 0; x < this.gridDimensions.width; x++) {
          if (this.territory[y][x] === player.id) {
            startingPos = { x, y };
          }
        }
      }

      if (!startingPos) {
        player.socket.emitError("You didn't choose your starting position. A random one has been selected for you.");
        
        const { x, y } = pickRandom(getEmptyPositions(this.territory));

        this.territory[y][x] = player.id;

        startingPos = { x, y };
      }

      player.startingPos = startingPos;

      this.units.push(new Unit(this, player, startingPos.x, startingPos.y, 10));

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

  getUnitById(id) {

    return this.units.find(u => u.id == id) || this.vagrantUnits.find(u => u.id == id);

  }

  tickGame() {

    this.day++;
    this.players.forEach(player => {
      player.gold += this.config.goldPerDay;
    });

    this.sendSyncUpdate();

    setTimeout(this.tickGame.bind(this), 3000);

  }

  setStateAll(updateFunc) {
      
    this.players.forEach(player => {
      player.socket.setState(updateFunc(player));
      player.socket.emitState();
    });

  }

  sendSyncUpdate() {

    this.setStateAll(player => {

      let baseObj = {
        screen: "game",
        name: player.name,
        playerId: player.id,
        stage: this.stage,
        gridDimensions: this.gridDimensions,
        players: this.players.map(p => p == player ? p.toClientSelf() : p.toClient()),
        territory: this.territory,
        units: this.units.map(unit => unit.toClient()),
        vagrantUnits: this.vagrantUnits.map(unit => unit.toClient()),
        land: this.land,
      };
  
      if (this.stage === "pregame") {
        baseObj.timeOfStart = this.timeOfStart;
      }

      if (this.stage === "game") {
        baseObj.day = this.day;
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
