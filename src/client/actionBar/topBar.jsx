import React from 'react';
import styles from './topBar.module.css';

function TopBar({ day, time, gold, wood, oil }) {
  return (
    <div className={styles.topBar}>
      <div className={styles.leftSide}>
        <div className={styles.item}>
          <img className={styles.icon} src="./assets/gold.png"></img>
          <div className={styles.label}>{gold}</div>
        </div>
        <div className={styles.item}>
          <img className={styles.icon} src="./assets/wood.png"></img>
          <div className={styles.label}>{wood}</div>
        </div>
        <div className={styles.item}>
          <img className={styles.icon} src="./assets/oil.png"></img>
          <div className={styles.label}>{oil}</div>
        </div>
        <div className={styles.item}>
          <img className={styles.icon} src="./assets/calendar.png"></img>
          <div className={styles.label}>Day {day}</div>
        </div>
        <div className={styles.item}>
          <img className={styles.icon} src="./assets/clock.png"></img>
          <div className={styles.label}>Time {time}</div>
        </div>
      </div>
      <div className={styles.rightSide}></div>
    </div>
  )
}

export default TopBar

