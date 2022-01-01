import React from 'react'
import { getInternalState, getMe } from '../state';
import { getDayTime } from '../utils';
import styles from './actionBar.module.css';
import TopBar from './topBar';
import MainContent from './mainContent';

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

  const me = getMe();

  if (actionBarState === null) {
    return <div>Loading</div>;
  }

  if (actionBarState.screen !== "game") {
    return <div>Not available</div>;
  }

  if (actionBarState.stage === "pregame") {
    return <center className={styles.actionBar}>Select your starting position</center>;
  }

  return (
    <div className={styles.actionBar}>
      <div className={styles.actionBarTop}>
        <TopBar day={actionBarState.day} gold={me.gold} wood={0} oil={0} time={getDayTime(actionBarState.dayStart, actionBarState.dayEnd)}></TopBar>
      </div>
      <div className={styles.actionBarContent}>
        <MainContent />
      </div>
    </div>
  )
}

export default ActionBar

