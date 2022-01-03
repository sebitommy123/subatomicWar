const Joi = require("joi");
const Constants = require("../shared/constants.js");
const { Lobby, makeLobbiesGlobal, getLobbyById } = require("./Lobby.js");
const { Game, makeGamesGlobal, startGameFromLobby } = require("./Game.js");
const { htmlentities } = require("./utils.js");
const Server = require("./Server.js");


const lobbies = makeLobbiesGlobal([]);
const games = makeGamesGlobal([]);

const server = new Server(handleSocketConnection);

temporaryInit();

function temporaryInit() {

  lobbies.push(new Lobby());

}

function handleSocketConnection(socket) {

  /*const lobby = new Lobby();

  socket.setState({ screen: "playMenu", name: htmlentities("input.name"), lobbyAvailable: null });

  lobby.addSocket(socket);

  lobby.config.waitTime = 2;

  startGameFromLobby(lobby);

  return;*/

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
      }
    }
  });

}
