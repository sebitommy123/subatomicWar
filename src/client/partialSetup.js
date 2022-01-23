import { RenderConstants } from "./render";
import { getExternalState, onStateChange } from "./state";
import { getPlayerCities, smoothScrollTo } from "./utils/game";
import { positionCenteredAt } from "./utils/geometry";

export function partialSetup() {

  
  onStateChange((state, oldState) => {

    if (oldState.screen === "game") {
      if (oldState.stage === "pregame" && state.stage === "game") {

        const { gridDimensions } = getExternalState();

        let startingCity = getPlayerCities()[0];

        let pos = positionCenteredAt(startingCity.x, startingCity.y);

        console.log("now!");
        smoothScrollTo(pos.x, pos.y, 1, 500);
      }
    }
  });

}
