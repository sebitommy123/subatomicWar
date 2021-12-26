const Constants = require("../shared/constants.js");

class SocketWrapper {

  constructor(socket) {

    this.socket = socket;

    this.connected = true;
    this.state = null;

    const superFunctions = ["emit", "join", "to"];

    superFunctions.forEach(func => {
      this[func] = this.socket[func].bind(this.socket); 
    });

  }

  onDisconnect(callback) {

    this.socket.on("disconnect", callback);

  }

  on({ message, state, input, respond }) {
    this.socket.on(message, (args) => {

      if (state) {
        if (!state(this.state)) {
          console.log("Invalid state for message: " + message);
          return;
        }
      }

      if (input) {
        const { error, value } = input.validate(args);

        if (error) {
          console.log(error.annotate());
          return;
        }
      }

      respond(args);
    });
  }

  setState(state) {

    if (typeof state == 'function') {
    
      this.state = state(this.state);
    
    } else {

      this.state = state;

    }
  }

  emitState() {

    this.socket.emit(Constants.messages.updateState, this.state);

  }

  disconnect() {
    this.connected = false;
  }

}

let sockets = {};

function wrapSocket(socket) {
  /**
   * Augments socket functionality, and gives it a state.
   */

  if (!sockets[socket.id]) {
    sockets[socket.id] = new SocketWrapper(socket);

    socket.on('disconnect', () => {
      sockets[socket.id].disconnect();
      delete sockets[socket.id];
    });
  }

  return sockets[socket.id];

}

function updateStates(condition, newState, shouldEmit=true) {
  /**
   * Updates the state of all sockets.
   * 
   * */

  Object.keys(sockets).forEach(socketId => {
    const socket = sockets[socketId];
    if (socket.connected && condition(socket.state)) {
      socket.setState(newState);
      if (shouldEmit) socket.emitState();
    }
  });

}

module.exports = {
  wrapSocket,
  sockets,
  updateStates
};
