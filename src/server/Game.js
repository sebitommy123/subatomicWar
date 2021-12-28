const { Player } = require("./Player");
const { updateStates } = require("./SocketWrapper");

const { generateEmptyTerritory } = require("./territory");
const { generateRandomLand } = require("./land");
const Constants = require("../shared/constants");
const Joi = require("joi");

const exampleUnits = [
  {
    id: 1,
    x: 0,
    y: 0,
    quantity: 6,
  },
  {
    id: 1,
    x: 3,
    y: 5,
    quantity: 1,
  },
  {
    id: 1,
    x: 8,
    y: 2,
    quantity: 13,
  },
  {
    id: 1,
    x: 11,
    y: 1,
    quantity: 55,
  }
];

class Game {

  constructor(width, height, playerSockets) {

    this.stage = "pregame";

    this.gridDimensions = {
      width, height
    };

    this.players = playerSockets.map(s => new Player(s));

    this.territory = generateEmptyTerritory(width, height);
    this.land = generateRandomLand(width, height);

    this.setupPregame();

    this.sendSyncUpdate();

  }

  setupPregame() {
    this.timeOfStart = Date.now() + 1000 * 15;

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
        players: this.players.map(p => p.toClient()),
        territory: this.territory,
        units: exampleUnits,
        land: this.land,
      };
  
      if (this.stage === "pregame") {
        baseObj.timeOfStart = this.timeOfStart;
      }
      
      return baseObj;
    });

  }

}

function startGameFromLobby(lobby) {

  const game = new Game(lobby.config.gridDimensions.width, lobby.config.gridDimensions.height, lobby.sockets);

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
