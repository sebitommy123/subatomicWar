import { setRActionBarInternalState } from "./actionBar/actionBar";
import { setActionBarState } from "./actionBarController";
import { updateMenu } from "./mainMenu";
import { setRenderingState } from "./render";
import { setStageInfoState } from "./stageInfo";

let state = null;
let internalState = {
  quantityBar: null,
  savedQuantityPercentages: {
    unit: 0.5,
  },
  selectedUnit: null,
  draggingUnit: null
};
let me;

export function mutateInternalState(mutFunc) {
  mutFunc(internalState);

  setRActionBarInternalState({...internalState});
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

export function getTerritoryAt(territory, x, y) {
  if (x < 0 || x >= territory.length || y < 0 || y >= territory[0].length) {
    return null;
  }
  
  return territory[y][x];
}

export function getTerritoryDirPositionFrom(territory, x, y, dir) {
  if (dir === "left") {
    x--;
  } else if (dir === "right") {
    x++;
  } else if (dir === "top") {
    y--;
  } else if (dir === "bottom") {
    y++;
  } else {
    return null;
  }

  return { x, y };
}

export function getTerritoryDirFrom(territory, x, y, dir) {
  if (dir === "left") {
    x--;
  } else if (dir === "right") {
    x++;
  } else if (dir === "top") {
    y--;
  } else if (dir === "bottom") {
    y++;
  } else {
    return null;
  }

  return getTerritoryAt(territory, x, y);
}

export function getDirectionFromPosToPos(x1, y1, x2, y2) {
  if (x1 < x2) {
    return "right";
  } else if (x1 > x2) {
    return "left";
  } else if (y1 < y2) {
    return "bottom";
  } else if (y1 > y2) {
    return "top";
  } else {
    return null;
  }
}

export function flipNeighborList(neighbors) {
  return ["left", "right", "top", "bottom"].filter(dir => !neighbors.includes(dir));
}

export function clockwiseDir(dir) {
  if (dir === "left") {
    return "top";
  } else if (dir === "top") {
    return "right";
  } else if (dir === "right") {
    return "bottom";
  } else if (dir === "bottom") {
    return "left";
  } else {
    return null;
  }
}
