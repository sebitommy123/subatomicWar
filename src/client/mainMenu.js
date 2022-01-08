import { emit } from './networking';
import Constants from '../shared/constants';
import { getExternalState, onStateChange } from './state';

const nameInput = document.getElementById('nameInput');
const startButton = document.getElementById('startButton');
const joinLobby = document.getElementById('joinLobby');
const nameMenu = document.getElementById('nameMenu');
const playMenu = document.getElementById('playMenu');
const connectingMenu = document.getElementById('connectingMenu');
const lobbyMenu = document.getElementById('lobbyMenu');
const lobbyPlayers = document.getElementById('lobbyPlayers');
const startLobby = document.getElementById('startLobby');

let openMenu = null;
let menus = {
  nameMenu, playMenu, connectingMenu, lobbyMenu
}

export function addMainMenuHandlers() {

  onStateChange(state => {
    if (state.screen in menus) {
      menus[state.screen].classList.add("active");
      Object.keys(menus).filter(menu => menu != state.screen).forEach(menu => {
        menus[menu].classList.remove("active");
      });

      if (state.screen == "playMenu") {
        if (!state.lobbyAvailable) {
          joinLobby.disabled = "disabled";
          joinLobby.innerHTML = "Start game (no lobbies available)";
        } else {
          joinLobby.disabled = "";
          joinLobby.innerHTML = "Start game";
        }
      }

      if (state.screen == "lobbyMenu") {
        lobbyPlayers.innerHTML = `
          ${state.lobby.players.length} player(s): 
          ${state.lobby.players.join(", ")}
        `;
      }
    } else {
      Object.keys(menus).forEach(menu => {
        menus[menu].classList.remove("active");
      });
    }
  });
  
  function chooseName() {
  
    emit(Constants.messages.chooseName, { name: nameInput.value });
  
  }
  
  startButton.onclick = chooseName;
  nameInput.addEventListener("keydown", e => {
    if (e.key == "Enter") chooseName();
  });

  joinLobby.onclick = () => {

    const { lobbyAvailable } = getExternalState();

    if (lobbyAvailable) {
      emit(Constants.messages.joinLobby, {lobbyId: lobbyAvailable});
    }
  }

  startLobby.onclick = () => {
    emit(Constants.messages.startLobby, {});
  }
  
}

