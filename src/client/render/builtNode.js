import { registerClick, mouseClicked, registerNextUnhandledClickHandler, mouseRightClicked } from '../userInput';

import { emit } from '../networking';

import Constants from '../../shared/constants';
import { getExternalState, getInternalState, mutateInternalState } from '../state';
import { mouseInLastCircle, mouseInRect } from '../utils/geometry';
import { renderProperty } from './property';
import { ctx, renderAtTop } from '../render';
import { openContextMenu } from './contextMenu';
import { isFriendlyTerritory } from '../utils/game';
import { pluralize } from '../../shared/utils';
import { getAsset } from '../assets';


export function renderBuiltNode(builtNode, superType) {

  const { deletingObject } = getInternalState();

  let { x, y, type } = builtNode;

  let rect = renderProperty(x, y, type);

  if (builtNode.razeEnd != null) {

    ctx.drawImage(getAsset('fire'), rect.x, rect.y, rect.width, rect.height);

    let delta = Date.now() - builtNode.razeStart;
    let total = builtNode.razeEnd - builtNode.razeStart;

    let progress = delta / total;

    progress = Math.min(progress, 1);

    renderAtTop(() => {

      const width = 8;

      ctx.fillStyle = "#404040";
      ctx.fillRect(rect.x + rect.width - 3, rect.y, width, rect.height);

      let overlapHeight = rect.height * progress;

      ctx.fillStyle = "#ff0000";
      ctx.fillRect(rect.x + rect.width - 3, rect.y + rect.height - overlapHeight, width, overlapHeight);

      let imgSize = 7;

      ctx.drawImage(getAsset('fire'), rect.x + rect.width - 3 - imgSize/2 + width/2, rect.y + rect.height - overlapHeight - imgSize, imgSize, imgSize);

    });

  }

  if (isFriendlyTerritory(x, y)) {

    let razeButton = {
      image: "fire",
      text: `Raze ${type.name.toLowerCase()}`,
      cost: type.razeCost,
      onClick: () => {
        emit(Constants.messages.razeBuiltNode, {
          x,
          y
        });
      },
    };

    if (builtNode.razeEnd != null) {
      razeButton = {
        image: "fire",
        text: `Stop razing ${type.name.toLowerCase()}`,
        cost: {},
        onClick: () => {
          emit(Constants.messages.stopRazingBuiltNode, {
            x,
            y
          });
        },
      };
    }

    if (mouseRightClicked && mouseInRect(rect)) {
      registerClick(() => {
        openContextMenu([
          razeButton,
          {
            image: "info",
            text: `More info about ${pluralize(type.name).toLowerCase()}`,
            cost: {},
            onClick: () => {
              console.log("Info!!");
            },
          }
        ]);
      });
      
    }

  }

}
