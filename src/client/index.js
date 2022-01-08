import './css/main.css';
import { initRender } from './render';
import './networking';
import { addMainMenuHandlers } from './mainMenu';
import { addUserInputHandlers } from './userInput';
import { handleNewState } from './state';
import Constants from '../shared/constants';
import { hydrateActionBar } from './actionBarController';
import { hydrateStageInfo } from './stageInfo';
import { ensureServerSync } from './utils/general';

// initialize the state to something the app won't crash with (screen is enough)
handleNewState(Constants.initialState);


ensureServerSync();

// start rendering lifecycle
initRender();

// make main menu work
addMainMenuHandlers();

addUserInputHandlers();

hydrateActionBar();

hydrateStageInfo();