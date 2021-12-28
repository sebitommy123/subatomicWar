
const stageInfo = document.getElementById('stageInfo');
const stageInfoText = document.getElementById('stageInfoText');

let stageInfoState = null;

export function updateStageInfo() {
  if (stageInfoState.screen != "game") {
    stageInfo.style.display = "none";
  } else {
    if (stageInfoState.stage == "pregame") {
      stageInfo.style.display = "flex";

      const timeLeft = Math.floor((stageInfoState.timeOfStart - Date.now()) / 1000);

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

export function setStageInfoState(newState) {
  stageInfoState = newState;
  updateStageInfo();
}
