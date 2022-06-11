const Joi = require("joi");
const Constants = require("../shared/constants.js");
const { Lobby, makeLobbiesGlobal, getLobbyById, getLobbyByGID } = require("./Lobby.js");
const { Game, makeGamesGlobal, startGameFromLobby } = require("./Game.js");
const { htmlentities } = require("./utils.js");
const Server = require("./Server.js");
const { InternalServer } = require("./communicateMain.js");
const { registerServer, getUserBySession } = require("./ddb.js");

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

const internalServer = new InternalServer(id => {
  console.log(`Received request to start game ${id} from main server`);

  const newLobby = new Lobby(id);

  lobbies.push(newLobby);
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
    screen: "playMenu",
  });
  socket.emitState();

  /*socket.on({
    message: Constants.messages.chooseName,
    state: state => state.screen == "nameMenu",
    input: Joi.object({
      name: Joi.string().min(3).max(20).required(),
    }),
    respond: input => {
      socket.setState({ screen: "playMenu", name: htmlentities(input.name), lobbyAvailable: lobbies.length != 0 ? lobbies[0].id : null });
      socket.emitState();
    },
  });*/

  socket.on({
    message: Constants.messages.joinLobby,
    state: state => state.screen == "playMenu",
    input: Joi.object({
      sessionToken: Joi.string().required(),
    }),
    respond: async input => {

      const user = await getUserBySession(input.sessionToken);
      if (!user) {
        socket.emitError("Invalid session token");
        return;
      }
      if (!user.gameId) {
        socket.emitError("User not in a game");
        return;
      }

      const lobby = getLobbyByGID(user.gameId);
      if (!lobby) {
        socket.emitError("Lobby not found. Is this the wrong gameServer?");
        return;
      }
      if (!lobby.open) {
        socket.emitError("Lobby is closed");
        return;
      }
      lobby.addSocket(socket, htmlentities(user.username));
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

registerServer(server.port, internalServer.port)
.then(success => {
  if (!success) {
    console.error("Failed to register server");
    process.exit(1);
  } else {
    console.log("Successfully registered server")
  }
})