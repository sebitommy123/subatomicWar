let state = null;
let stateHooks = [];
let internalStateHooks = [];
let internalState = {
  quantityBar: null,
  savedQuantityPercentages: {
    unit: 0.5,
    buying: 0.5,
  },
  selectedUnit: null,
  draggingUnit: null,
  buyingUnit: false,
  buyingCity: false,
  buyingBuilding: null,
  buyingStructure: null,
  deletingObject: null,
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
