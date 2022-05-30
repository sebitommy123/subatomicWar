const Joi = require("joi");
const Constants = require("../shared/constants.js");
const { Lobby, makeLobbiesGlobal, getLobbyById } = require("./Lobby.js");
const { Game, makeGamesGlobal, startGameFromLobby } = require("./Game.js");
const { htmlentities } = require("./utils.js");
const Server = require("./Server.js");
const InternalServer = require("./InternalServer.js");

let _MODE = "prod";

if (process.argv.length > 2) {
  const type = process.argv[2];
  console.log(`Starting up server in development mode, type: ${type.toUpperCase()}`);

  _MODE = type.toLowerCase();
} else {
  console.log("Starting up server normally");
}

const lobbies = makeLobbiesGlobal([]);
const games = makeGamesGlobal([]);

const server = new Server(handleSocketConnection);

const internalServer = new InternalServer(() => {
  console.log("Received request to start game from main server");
});

temporaryInit();

function temporaryInit() {

  addLobby();

}

function addLobby() {

  const newLobby = new Lobby();

  if (_MODE == "multifast") {
    newLobby.config.waitTime = 3;
    newLobby.config.startingResources = { gold: 1000, wood: 1000, oil: 1000 };
  }

  lobbies.push(newLobby);

}

function handleSocketConnection(socket) {

  if (process.env.NODE_ENV === "development") {

    if (process.argv.length > 2) {

      if (_MODE === "fast") {

        const lobby = new Lobby();

        socket.setState({ screen: "playMenu", name: htmlentities("input.name"), lobbyAvailable: null });

        lobby.addSocket(socket);

        lobby.config.waitTime = 2;
        lobby.config.startingResources = {gold: 10000, wood: 10000, oil: 10000};
        lobby.config.resourcesPerDay = {gold: 0, wood: 0, oil: 0};
        lobby.config.vagrantMoveTime = {
          neutral: 500,
          enemy: 500,
          friendy: 500,
        };

        startGameFromLobby(lobby);

        return;

      }
    }

  }

  socket.setState({
    screen: "nameMenu",
  });
  socket.emitState();

  socket.on({
    message: Constants.messages.chooseName,
    state: state => state.screen == "nameMenu",
    input: Joi.object({
      name: Joi.string().min(3).max(20).required(),
    }),
    respond: input => {
      socket.setState({ screen: "playMenu", name: htmlentities(input.name), lobbyAvailable: lobbies.length != 0 ? lobbies[0].id : null });
      socket.emitState();
    },
  });

  socket.on({
    message: Constants.messages.joinLobby,
    state: state => state.screen == "playMenu",
    input: Joi.object({
      lobbyId: Joi.string().required(),
    }),
    respond: input => {
      const lobby = getLobbyById(input.lobbyId);
      if (!lobby) {
        socket.emitError("Lobby not found");
        return;
      }
      if (!lobby.open) {
        socket.emitError("Lobby is closed");
        return;
      }
      lobby.addSocket(socket);
    },
  });

  socket.on({
    message: Constants.messages.startLobby,
    state: state => state.screen == "lobbyMenu",
    respond: () => {
      const lobby = getLobbyById(socket.state.lobby.id);
      if (lobby && lobby.open) {
        startGameFromLobby(lobby);
        addLobby();
      }
    }
  });

}
