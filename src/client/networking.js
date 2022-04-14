  // Learn more about this file at:
// https://victorzhou.com/blog/build-an-io-game-part-1/#4-client-networking
import io from 'socket.io-client';
import { throttle } from 'throttle-debounce';
import Constants from '../shared/constants';
import { handleNewState, mutateInternalState } from './state';
import { displayError } from './utils/display';

const gameEndpoint = "localho.st:3000";// window.location.host;

const socketProtocol = (window.location.protocol.includes('https')) ? 'wss' : 'ws';
const socket = io(`${socketProtocol}://${gameEndpoint}`, { reconnection: false });

socket.on('connect', () => {
  console.log('Connected to server!');

  socket.on(Constants.messages.updateState, handleNewState);

  socket.on(Constants.messages.error, e => displayError(e.error));
  
  socket.on('disconnect', () => {
    console.log('Disconnected from server.');

    mutateInternalState(state => {
      state.disconnected = true;
    })
  });
});

export function emit(event, args, callback) {

  args = args || {};
  callback = callback || (() => {});

  socket.emit(event, args, callback);
}
