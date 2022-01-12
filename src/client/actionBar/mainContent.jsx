import React from 'react'
import Constants from '../../shared/constants';
import { getAsset } from '../assets';
import { emit } from '../networking';
import { setPlacing } from '../render/placing';
import { drawAllCityAuras, drawAuraAt, drawBuilding } from '../render/property';
import { renderSoldierAndQuantity } from '../render/soldier';
import { mutateInternalState } from '../state';
import { getQuantityAtPosition, getUnitAtPosition, ownedUnitAtPosition } from '../utils/game';
import { getMaxUnitPurchase, multiplyCost } from '../utils/general';
import { positionCenteredAt } from '../utils/geometry';
import { getValidTilesPlaceBuilding, getValidTilesPlaceCity, getValidTilesPlaceStructure, getValidTilesPlaceUnit } from '../utils/tileValidation';
import styles from './mainContent.module.css';

function Item({ id, name, imageSrc, asset, cost, type, description, objectType }) {

  let resourceTypes = {
    gold: "./assets/gold.png",
    wood: "./assets/wood.png",
  }

  function handleClick() {

    const assetObj = getAsset(asset.split(".")[0]);

    const onPlace = (x, y, quantity) => {
      emit(Constants.messages.buyFromShop, {
        itemId: id,
        quantity: quantity,
        x,
        y
      });
    };

    const canPlace = (x, y, quantity) => {
      if (type == "unit") return getValidTilesPlaceUnit(objectType);
      if (type == "structure") return getValidTilesPlaceStructure(objectType);
      if (type == "building") return getValidTilesPlaceBuilding(objectType);
      if (type == "city") return getValidTilesPlaceCity(objectType);
    };

    if (type == "unit") {
      setPlacing("unit", id, cost, (x, y, quantity) => renderSoldierAndQuantity({ ...positionCenteredAt(x, y), c: 0 }, quantity + getQuantityAtPosition(x, y), true), canPlace, onPlace, {
        tag: "buyingUnit", 
        max: getMaxUnitPurchase, 
        tip: (quantity) => [
          `BUYING UNITS`,
          `Units to buy: ${quantity}`,
          `Cost: ${multiplyCost(cost, quantity).gold}`,
          `Click on tile to buy`
        ],
        color: "#adad47",
        units: "units",
      });
    } else {

      let renderFunc = (x, y) => drawBuilding(assetObj, x, y);

      if (type === "city") {
        renderFunc = (x, y) => {
          drawAuraAt(x, y);
          drawAllCityAuras();

          return drawBuilding(assetObj, x, y);
        }
      }

      setPlacing(type, id, cost, renderFunc, canPlace, onPlace, null, {
        hideAfter: type != "structure",
      });
    }

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
        return <Item key={item.id} id={item.id} name={item.name} type={item.type} description={item.desc} imageSrc={"./assets/" + item.image} asset={item.image} cost={item.cost} objectType={item}/>
      })}
    </div>
  )
}

export default MainContent

