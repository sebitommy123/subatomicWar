import { registerClick, mouseClicked, registerNextUnhandledClickHandler, mouseRightClicked } from '../userInput';

import { emit } from '../networking';

import Constants from '../../shared/constants';
import { getExternalState, getInternalState, mutateInternalState } from '../state';
import { mouseInLastCircle, mouseInRect } from '../utils/geometry';
import { renderProperty } from './property';
import { ctx } from '../render';
import { openContextMenu } from './contextMenu';
import { isFriendlyTerritory } from '../utils/game';


export function renderBuiltNode(builtNode, superType) {

  const { deletingObject } = getInternalState();

  let { x, y, type } = builtNode;

  let rect = renderProperty(x, y, type);

  if (isFriendlyTerritory(x, y)) {

    if (mouseRightClicked && mouseInRect(rect)) {
      openContextMenu([
        {
          image: "fire",
          text: `Raze ${type.name}`,
          cost: type.razeCost,
          onClick: () => {
            console.log("Raze!!");
          },
        }
      ]);
    }

    if (mouseClicked && mouseInRect(rect)) {
      registerClick(() => {
        mutateInternalState(state => {
          state.deletingObject = builtNode.id;
        })
      });

      registerNextUnhandledClickHandler(() => {
        mutateInternalState(state => {
          state.deletingObject = null;
        })
      });
    }

    if (deletingObject == builtNode.id) {
      ctx.fillStyle = "#ff0000";
      ctx.fillCircle(rect.x + rect.width, rect.y, 8);
      ctx.fontSize = 11;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillStyle = "#ffffff";
      ctx.fillText("X", rect.x + rect.width, rect.y);

      if (mouseClicked && mouseInLastCircle()) {
        registerClick(() => {
          emit(superType == "building" ? Constants.messages.deleteBuilding : Constants.messages.deleteStructure, {
            [superType == "building" ? "buildingId" : "structureId"]: builtNode.id,
          });
        });
      }
    }

  }

}
