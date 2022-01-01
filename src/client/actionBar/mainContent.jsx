import React from 'react'
import styles from './mainContent.module.css';

function Item() {

  return (
    <div className={styles.item}>
      <div className={styles.itemHeader}>
        Soldier
      </div>
      <div className={styles.itemImageWrapper}>
        <img src="./assets/soldier.png" className={styles.itemImage}></img>
      </div>
      <div className={styles.itemCost}>
        <div className={styles.itemCostType}>
          <img src="./assets/gold.png" className={styles.icon}></img>
          <div className={styles.label}>5</div>
        </div>
        <div className={styles.itemCostType}>
          <img src="./assets/wood.png" className={styles.icon}></img>
          <div className={styles.label}>5</div>
        </div>
      </div>
    </div>
  )

}

function MainContent() {
  return (
    <div className={styles.mainContent}>
      <Item />
      <Item />
      <Item />
      <Item />
      <Item />
      <Item />
      <Item />
      <Item />
      <Item />
    </div>
  )
}

export default MainContent

