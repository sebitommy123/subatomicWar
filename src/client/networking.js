  // Learn more about this file at:
// https://victorzhou.com/blog/build-an-io-game-part-1/#4-client-networking
import io from 'socket.io-client';
import { throttle } from 'throttle-debounce';
import Constants from '../shared/constants';
import { handleNewState, mutateInternalState, getInternalState } from './state';
import { displayError } from './utils/display';

const socketProtocol = (window.location.protocol.includes('https')) ? 'wss' : 'ws';

let socket;

export function connectToGameServer(callback) {

  const { gameServerAddress } = getInternalState();

  socket = io(`${gameServerAddress}`, { reconnection: false });

  socket.on('connect', () => {
    console.log('Connected to server!');

    socket.on(Constants.messages.updateState, handleNewState);

    socket.on(Constants.messages.error, e => displayError(e.error));
    
    socket.on('disconnect', () => {
      console.log('Disconnected from server.');

      mutateInternalState(state => {
        state.disconnected = true;
      });
    });

    callback();
  });

}

export function emit(event, args, callback) {

  if (socket == null) {
    console.warn("Emit called before game server connection");
    return;
  }

  args = args || {};
  callback = callback || (() => {});

  socket.emit(event, args, callback);
}
