import React from 'react'
import { getInternalState, getMe } from '../state';
import styles from './actionBar.module.css';

let setGlobalActionBarState;
let setGlobalActionBarInternalState;

export function setRActionBarState(state) {
  if (!setGlobalActionBarState) return;
  setGlobalActionBarState(state);
}

export function setRActionBarInternalState(state) {
  if (!setGlobalActionBarInternalState) return;
  setGlobalActionBarInternalState(state);
}

const ActionBar = () => {
  const [ actionBarState, setReactActionBarState ] = React.useState(null);
  const [ actionBarInternalState, setReactActionBarInternalState ] = React.useState({});

  setGlobalActionBarState = setReactActionBarState;
  setGlobalActionBarInternalState = setReactActionBarInternalState;

  if (actionBarState === null) {
    return <div>Loading</div>;
  }

  if (actionBarState.screen !== "game") {
    return <div>Not available</div>;
  }

  if (actionBarState.stage === "pregame") {
    return <div>Select your starting position</div>;
  }

  return (
    <div className={styles.actionBar}>
      Day: {actionBarState.day}
      <br />
      Gold: {getMe().gold}
    </div>
  )
}

export default ActionBar

