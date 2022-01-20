const { nanoid } = require('nanoid');
const { updateStates } = require('./SocketWrapper');

let lobbies;

class Lobby {

  constructor() {

    this.id = nanoid();
    this.sockets = [];
    this.open = true;

    this.config = {
      gridDimensions: { // size of the playing area in tiles
        width: 9,
        height: 9
      },
      waitTime: 15, // time for players to choose starting positions
      dayLength: 5 * 1000, // length of a day in milliseconds
      startingResources: { gold: 0, wood: 100, oil: 0 }, // starting resources
      resourcesPerDay: { gold: 10, wood: 10, oil: 0 }, // resources per day naturally
      vagrantMoveTime: {
        neutral: 2000,
        enemy: 4000,
        friendy: 500,
      }, // time required for unit to move from tile to tile
      fightTime: 1000, // i have no idea??????????
      fightSpeed: 2000, // ms in between fighting turns
      fightInitialDelay: 1000, //time to wait before starting fight
      startingTroops: 10, //starting troops at starting location
      baseCityGrowth: 8, //turns required for city growth
      damageMultiplier: 0.1, //damage dealt = quantity * damageMultiplier
      bots: 1, // number of bots to start with
      botSpeed: 1000, // ms in between bot actions
    };

  }

  addSocket(socket) {

    socket.setState(state => ({ screen: "lobbyMenu", name: state.name, lobby: this.toClient() }));
    socket.emitState();
    
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

  removeLobby() {

    this.open = false;

    // get index of lobby
    const index = lobbies.indexOf(this);

    // remove lobby
    lobbies.splice(index, 1);

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