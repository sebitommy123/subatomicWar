const { Player } = require("./Player");
const { updateStates } = require("./SocketWrapper");

const { generateEmptyTerritory, getEmptyPositions } = require("./territory");
const { generateRandomLand } = require("./land");
const Constants = require("../shared/constants");
const Joi = require("joi");
const { colors, pickRandom } = require("./utils");

class Game {

  constructor(playerSockets, lobbyId, config) {

    this.stage = "pregame";

    this.config = config;
    this.lobbyId = lobbyId;

    this.gridDimensions = config.gridDimensions;

    this.players = playerSockets.map((s, i) => new Player(this, s, colors[i], config.startingGold));

    this.territory = generateEmptyTerritory(this.gridDimensions.width, this.gridDimensions.height);
    this.land = generateRandomLand(this.gridDimensions.width, this.gridDimensions.height);

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

    this.players.forEach(player => {

      let playerPlaced = false;

      for (let y = 0; y < this.gridDimensions.height; y++) {
        for (let x = 0; x < this.gridDimensions.width; x++) {
          if (this.territory[y][x] === player.id) {
            playerPlaced = true;
          }
        }
      }

      if (!playerPlaced) {
        player.socket.emitError("You didn't choose your starting position. A random one has been selected for you.");
        
        const { x, y } = pickRandom(getEmptyPositions(this.territory));

        this.territory[y][x] = player.id;
      }

    });

    this.day = 0;

    this.sendSyncUpdate();

    this.tickGame();
    
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
        units: [],
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
