import { emit } from './networking';
import Constants from '../shared/constants';
import { getExternalState, getInternalState, onStateChange, mutateInternalState, handleNewState, onInternalStateChange } from './state';
import axios from 'axios';
import { displayError } from './utils/display';
import { connectToGameServer } from './networking';

const nameInput = document.getElementById('nameInput');
const startButton = document.getElementById('startButton');
const createGameButton = document.getElementById('createGameButton');
const nameMenu = document.getElementById('nameMenu');
const regionInput = document.getElementById('regionInput');
const playMenu = document.getElementById('playMenu');
const connectingMenu = document.getElementById('connectingMenu');
const lobbyMenu = document.getElementById('lobbyMenu');
const lobbyPlayers = document.getElementById('lobbyPlayers');
const startLobby = document.getElementById('startLobby');
const availableGames = document.getElementById('availableGames');
const createGameName = document.getElementById('createGameName');
const gameRefreshButton = document.getElementById('gameRefreshButton');

let addedNameHandler = false;

let openMenu = null;
let menus = {
  nameMenu, playMenu, connectingMenu, lobbyMenu
}

export function addMainMenuHandlers() {

  const handler = () => {

    const state = getExternalState();

    if (state.screen in menus) {
      menus[state.screen].classList.add("active");
      Object.keys(menus).filter(menu => menu != state.screen).forEach(menu => {
        menus[menu].classList.remove("active");
      });

      if (state.screen == "nameMenu") {
        regionInput.innerHTML = "";

        let select = document.createElement('select');
        let regions = getInternalState().regions;

        regions.forEach(region => {
          let option = document.createElement('option');
          option.value = region.mainServers[0];
          option.innerHTML = region.name;
          select.appendChild(option);
        });

        regionInput.appendChild(select);
      }

      if (state.screen == "playMenu") {

        const { gamesAvailable, chosenRegion, sessionToken } = getInternalState();

        availableGames.innerHTML = "";

        if (gamesAvailable == null) {
          availableGames.innerHTML = "Loading games...";
        } else {
          if (gamesAvailable.length == 0) {
            availableGames.innerHTML = "No games available.";
          }
          gamesAvailable.forEach(game => {
            console.log(game);
            let gameDiv = document.createElement('div');
            gameDiv.classList.add("gameContainer");
            gameDiv.innerHTML = `
            <div class="gameLeft">
              <div class="gameTitle">${game.name}</div>
              <div class="gamePlayers">${game.playerCount} players</div>
            </div>
            <div class="gameRight">
              <button class="greenBtn">Join</button>
            </div>
            `;
            let btn = gameDiv.querySelector(".greenBtn");
            btn.onclick = () => {
              axios.post(`${chosenRegion}/joinGame`, {
                session: sessionToken,
                gameId: game.gameId
              }).then(res => {
          
                const { success, message, serverAddress } = res.data;

                if (success) {

                  joinGame(serverAddress);

                } else {

                  displayError(message);

                }

              });
            };
            availableGames.appendChild(gameDiv);
          });
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
  }

  onStateChange(handler);

  onInternalStateChange(handler);

  function fetchAvailableGames() {

    mutateInternalState(state => {
      state.gamesAvailable = null;
    });

    const { chosenRegion } = getInternalState();

    axios.get(`${chosenRegion}/listGames`)
      .then(res => {

        if (res.data.success) {

          mutateInternalState(state => {
            state.gamesAvailable = res.data.games;
          });

        } else {

          displayError(res.data.message);
          
        }
      });

  }
  
  function chooseName() {

    const chosenRegion = regionInput.children[0].value;

    axios.post(`${chosenRegion}/loginAnon`, {
      name: nameInput.value
    }).then(res => {

      const { success, message, name, sessionToken } = res.data; // name is returned by server because server reserves right to modify it
      
      if (success) {

        mutateInternalState(state => {
          state.sessionToken = sessionToken;
          state.name = name;
          state.chosenRegion = chosenRegion;
        });
    
        handleNewState({ screen: "playMenu" });
    
        fetchAvailableGames();

      } else {

        displayError(message);

      }
    });
  
  }
  
  startButton.onclick = chooseName;
  nameInput.addEventListener("keydown", e => {
    if (e.key == "Enter") chooseName();
  });

  
  createGameName.addEventListener('keyup', (e) => {

    let newGameName = createGameName.value;

    if (newGameName.length == 0) {
      createGameButton.disabled = "disabled";
    } else {
      createGameButton.disabled = "";
    }
    
  });

  createGameButton.onclick = () => {

    if (createGameButton.innerHTML == "Creating game...") {
      displayError("Wait: creating game...");
      return;
    }

    const { chosenRegion, sessionToken } = getInternalState();
    
    let newGameName = createGameName.value;

    createGameButton.innerHTML = "Creating game...";

    axios.post(`${chosenRegion}/createGame`, {
      name: newGameName,
      session: sessionToken,
    }).then(res => {
        
      const { success, message, serverAddress } = res.data;

      if (success) {

        joinGame(serverAddress);

      } else {

        displayError(message);

      }

      createGameButton.innerHTML = "Creating game";

    });
    
  }

  startLobby.onclick = () => {
    emit(Constants.messages.startLobby, {});
  }

  gameRefreshButton.onclick = () => fetchAvailableGames();

  function joinGame(gameServerAddress) {

    console.log("Joining game at ", gameServerAddress);

    mutateInternalState(state => {
          
      state.gameServerAddress = gameServerAddress;

      connectToGameServer(() => {
        emit(Constants.messages.joinLobby, {
          sessionToken: state.sessionToken,
        });
      });
      
    });

  }
  
}

