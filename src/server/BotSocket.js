const Constants = require("../shared/constants.js");

class BotSocket {

  constructor() {

    this.state = {
      screen: "game", stage: "pregame", name: `Bot`
    };
    this.serverHandlers = [];

    const superFunctions = ["emit", "join", "to"];

    superFunctions.forEach(func => {
      this[func] = () => {}; 
    });

  }

  clientEmit(message, data) {

    this.serverHandlers.forEach(handler => {
      if (handler.message == message) {
        handler.func(data);
      }
    });

  }

  get id() {
    return null;
  }

  onDisconnect(callback) {

    return null;

  }

  emitError(error) {
    
    console.log(`BOT ran into server error: ${error}`);
    
  }

  addServerHandler(message, func) {

    this.serverHandlers.push({
      message,
      func
    });

  }

  on({ message, state, input, respond }) {
    this.addServerHandler(message, (args) => {

      if (state) {
        if (!state(this.state)) {
          this.emitError("Invalid state for message: " + message);
          return;
        }
      }

      if (input) {
        const { error, value } = input.validate(args);

        if (error) {
          this.emitError(error.details.map(d => d.message).join("\n"));
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

    return null;

  }

  disconnect() {
    return null;
  }

}

module.exports = BotSocket;
