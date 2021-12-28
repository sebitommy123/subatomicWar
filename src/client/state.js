import { setActionBarState } from "./actionBarController";
import { updateMenu } from "./mainMenu";
import { setRenderingState } from "./render";
import { setStageInfoState } from "./stageInfo";

let state = null;
let internalState = {};
let me;

export function mutateInternalState(mutFunc) {
  mutFunc(internalState);
}

export function getInternalState() {
  return internalState;
}

export function handleNewState(newState) {
  console.log("New state:", newState);

  state = newState;

  setRenderingState(state);

  updateMenu(state);

  setActionBarState(state);

  setStageInfoState(state);

  if (newState.playerId && newState.players) {
    me = getById(newState.playerId, state.players);
  }
}

export function getById(id, identifiedList) {
  return identifiedList.find(element => element.id === id);
}

export function getMe() {
  return me;
}