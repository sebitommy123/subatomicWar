const { nanoid } = require('nanoid');
const { updateStates } = require('./SocketWrapper');

let lobbies;

class Lobby {

  constructor() {

    this.id = nanoid();
    this.sockets = [];

  }

  addSocket(socket) {
    
    this.sockets.push(socket);
    
    socket.join(this.id);

    socket.onDisconnect(() => {
      this.removeSocket(socket);
    });

    this.updateAllStates();
  
  }

  updateAllStates() {
    
    updateStates(state => state.screen == "lobbyMenu" && state.lobby.id == this.id, state => ({
      ...state,
      lobby: this.toClient()
    }));

  }

  removeSocket(socket) {
    
    this.sockets = this.sockets.filter(s => s.id != socket.id);
    
    this.updateAllStates();

  }

  toClient() {
      
    return {
      id: this.id,
      players: this.sockets.map(socket => socket.state.name)
    };

  }

}

function makeLobbiesGlobal(lobbiesR) {
  lobbies = lobbiesR;
  return lobbiesR;
}

function getLobbyById(id) {
  return lobbies.find(lobby => lobby.id === id);
}

module.exports = {
  Lobby,
  makeLobbiesGlobal,
  getLobbyById
}