import './css/main.css';
import { initRender } from './render';
import './networking';
import { addMainMenuHandlers } from './mainMenu';
import { addUserInputHandlers } from './userInput';
import { handleNewState } from './state';
import Constants from '../shared/constants';

// we are at the main menu
handleNewState(Constants.initialState);

// start rendering lifecycle
initRender();

// make main menu work
addMainMenuHandlers();

addUserInputHandlers();
