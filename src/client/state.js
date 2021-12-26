import { updateMenu } from "./mainMenu";
import { setRenderingState } from "./render";

let state = null;

export function handleNewState(newState) {
  console.log("New state:", newState);

  state = newState;

  setRenderingState(state);

  updateMenu(state);
}
