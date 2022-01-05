import React from 'react'
import { mutateInternalState } from '../state';
import { stopAllPlacing } from '../userInput';
import styles from './mainContent.module.css';

function Item({ id, name, imageSrc, cost, type, description }) {

  let resourceTypes = {
    gold: "./assets/gold.png",
    wood: "./assets/wood.png",
  }

  function handleClick() {

    mutateInternalState(state => {
      if (type == "unit") {
        stopAllPlacing();
        state.buyingUnit = true;
      } else if (type == "building") {
        stopAllPlacing();
        state.buyingBuilding = id;
      } else if (type == "city") {
        stopAllPlacing();
        state.buyingCity = true;
      } else if (type == "structure") {
        stopAllPlacing();
        state.buyingStructure = id;
      }
    });

  }

  function handleDragStart(event) {

    event.preventDefault();

    handleClick();

  }

  return (
    <div className={styles.item} onClick={handleClick} onDragStart={handleDragStart}>
      <div className={styles.itemHeader}>
        <div className={styles.title}>{name}</div>
        <div className={styles.description}>{description}</div>
      </div>
      <div className={styles.itemImageWrapper}>
        <img src={imageSrc} className={styles.itemImage}></img>
      </div>
      <div className={styles.itemCost}>
        {
          Object.keys(cost).map(type => {
            let amount = cost[type];
            return (
              <div key={type} className={styles.itemCostType}>
                <img src={resourceTypes[type]} className={styles.icon}></img>
                <div className={styles.label}>{amount}</div>
              </div>
            )
          })
        }
      </div>
    </div>
  )

}

function MainContent({shopItems}) {
  return (
    <div className={styles.mainContent}>
      {shopItems.map(item =>  {
        return <Item key={item.id} id={item.id} name={item.name} type={item.type} description={item.desc} imageSrc={"./assets/" + item.image} cost={item.cost}/>
      })}
    </div>
  )
}

export default MainContent

