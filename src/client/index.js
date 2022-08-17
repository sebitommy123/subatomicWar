import './css/main.css';
import { initRender } from './render';
import './networking';
import { addMainMenuHandlers } from './mainMenu';
import { addUserInputHandlers } from './userInput';
import { handleNewState, mutateInternalState } from './state';
import Constants from '../shared/constants';
import { hydrateActionBar } from './actionBarController';
import { hydrateStageInfo } from './stageInfo';
import { ensureServerSync } from './utils/general';
import { partialSetup } from './partialSetup';
import axios from 'axios';

const GLOBAL_SERVER_ENDPOINT = GLOBAL_SERVER_ENDPOINT_PASSED_IN_FROM_WEBPACK;

// initialize the state to something the app won't crash with
handleNewState(Constants.initialState);

ensureServerSync();

partialSetup();

// start rendering lifecycle
initRender();

// make main menu work
addMainMenuHandlers();

addUserInputHandlers();

hydrateActionBar();

hydrateStageInfo();

axios.get(`${GLOBAL_SERVER_ENDPOINT}/getRegions`)
  .then(res => {
    mutateInternalState(state => {
      state.regions = res.data;
    });

    handleNewState({ screen: "nameMenu" });
  });