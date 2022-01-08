import { getExternalState, onStateChange } from "./state";

const stageInfo = document.getElementById('stageInfo');
const stageInfoText = document.getElementById('stageInfoText');

export function hydrateStageInfo() {
  onStateChange(() => {
    updateStageInfo();
  });
}

setInterval(updateStageInfo, 200);

function updateStageInfo() {
  const { screen, stage, timeOfStart } = getExternalState();

  if (screen != "game") {
    stageInfo.style.display = "none";
  } else {
    if (stage == "pregame") {
      stageInfo.style.display = "flex";

      const timeLeft = Math.floor((timeOfStart - Date.now()) / 1000);

      if (timeLeft > 0) {
        stageInfoText.innerText = "Pick a location to start your commonwealth (" + timeLeft + ").";
      } else {
        stageInfoText.innerText = "Pick a location to start your commonwealth (starting...)";
      }
    } else {
      stageInfo.style.display = "none";
    }
  }
}
