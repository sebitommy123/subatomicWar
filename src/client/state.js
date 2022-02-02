let state = null;
let stateHooks = [];
let internalStateHooks = [];
let internalState = {
  quantityBar: {
    savedQuantityPercentages: {},
    currentQuantityBar: null,
    currentPercentage: null
  },
  contextMenu: null,
  movingObject: null,
  placingObject: null,
  smoothScrolling: null,
  pathfindCache: null,
};
let me;

export function mutateInternalState(mutFunc) {
  mutFunc(internalState);

  internalStateHooks.forEach(hook => hook(internalState));
}

export function getInternalState() {
  return internalState;
}

export function getExternalState() {
  return state;
}

export function onStateChange(callback) {
  stateHooks.push(callback);
}

export function onInternalStateChange(callback) {
  internalStateHooks.push(callback);
}

export function handleNewState(newState) {
  console.log("New state:", newState);

  let oldState = state;

  state = newState;

  stateHooks.forEach(hook => hook(state, oldState));
}

