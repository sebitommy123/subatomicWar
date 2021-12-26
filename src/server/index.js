const Joi = require("joi");
const Constants = require("../shared/constants.js");
const { Lobby, makeLobbiesGlobal, getLobbyById } = require("./Lobby.js");
const { htmlentities } = require("./utils.js");
const Server = require("./server.js");

const lobbies = makeLobbiesGlobal([]);
const games = [];

const server = new Server(handleSocketConnection);

temporaryInit();

function temporaryInit() {

  lobbies.push(new Lobby());

}

function handleSocketConnection(socket) {

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
      socket.setState({ screen: "playMenu", name: htmlentities(input.name,), lobbyAvailable: lobbies.length != 0 ? lobbies[0].id : null });
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
      if (lobby) {
        socket.setState(state => ({ screen: "lobbyMenu", name: state.name, lobby: lobby.toClient() }));
        socket.emitState();
        lobby.addSocket(socket);
      }
    },
  });

  /*socket.on(Constants.messages.connect, (args) => {

    socket.emit(Constants.messages.updateState, {
      screen: "game",
      gridDimensions: {
        width: 15,
        height: 15
      },
      players: [socket.id],
      territory: [
        [socket.id, socket.id, ]
      ],
      units: [
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
      ]
    })
  });*/

}
