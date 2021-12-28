import React from 'react';
import reactDOM from 'react-dom';
import actionBar, { setRActionBarState } from './actionBar/actionBar';

const actionBarWrapper = document.getElementById('actionBar');
const actionBarContent = document.getElementById('actionBarContent'); 

export function setActionBarState(newState) {
  if (newState.screen != "game") {
    actionBarWrapper.style.display = "none";
  } else {
    actionBarWrapper.style.display = "flex";
  }

  setRActionBarState(newState);
}

export function hydrateActionBar() {

  reactDOM.render(React.createElement(actionBar), actionBarContent);

}
