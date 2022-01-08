import React from 'react';
import reactDOM from 'react-dom';
import actionBar, { setRActionBarInternalState, setRActionBarState } from './actionBar/actionBar';
import { onInternalStateChange, onStateChange } from './state';

const actionBarWrapper = document.getElementById('actionBar');
const actionBarContent = document.getElementById('actionBarContent'); 

export function hydrateActionBar() {

  onStateChange(state => {
    if (state.screen != "game") {
      actionBarWrapper.style.display = "none";
    } else {
      actionBarWrapper.style.display = "flex";
    }
  
    setRActionBarState(state);
  });
  
  onInternalStateChange(internalState => {

    setRActionBarInternalState({...internalState});

  });

  reactDOM.render(React.createElement(actionBar), actionBarContent);

}
