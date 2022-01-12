import { mutateInternalState } from "../state";

export function renderContextMenu() {

}

export function openContextMenu(buttons) {

  console.log(buttons);

  mutateInternalState(state => {

    state.contextMenu = {
      buttons
    };

  });

}
