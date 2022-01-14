import { getAsset } from "../assets";
import { ctx, getCostRenderWidth, renderCost } from "../render";
import { getInternalState, mutateInternalState } from "../state";
import { gameMouseX, gameMouseY, mouseClicked, registerClick, registerNextUnhandledClickHandler } from "../userInput";
import { isFreeCost } from "../utils/cost";
import { mouseInRect } from "../utils/geometry";
import { stopAllPlacing } from "./placing";

export function renderContextMenu() {

  const { contextMenu } = getInternalState();

  if (!contextMenu) return;

  const { buttons, position } = contextMenu;

  const outerPadding = 10;
  const lineHeight = 30;

  const iconMarginRight = outerPadding - 2;
  const textMarginRight = outerPadding - 2;
  const extraPaddingRight = 4;
  const fontSize = 16;
  const iconWidth = fontSize;

  const maxTextWidth = buttons.reduce((acc, button) => {
    ctx.fontSize = fontSize;
    let textWidth = ctx.measureText(button.text).width;
    
    if (!isFreeCost(button.cost)) textWidth += getCostRenderWidth(button.cost) + textMarginRight;
    
    return Math.max(acc, textWidth);
  }, 0);

  const boxWidth = outerPadding * 2 + iconWidth + maxTextWidth + iconMarginRight + extraPaddingRight;
  const boxHeight = lineHeight * buttons.length;

  ctx.fillStyle = "#404040";
  ctx.fillRect(position.x, position.y, boxWidth, boxHeight);

  buttons.forEach((button, i) => {

    let x = position.x + outerPadding;
    const y = position.y + i * lineHeight;

    const rect = {
      x: position.x,
      y,
      width: boxWidth,
      height: lineHeight,
    }

    if (mouseInRect(rect)) {
      ctx.fillStyle = "#707070";
      ctx.fillRect(rect.x, rect.y, rect.width, rect.height);

      if (mouseClicked) {
        registerClick(() => {
          button.onClick();

          closeContextMenu();
        });
      }
    }

    const image = getAsset(button.image);

    ctx.drawImage(image, x, y - iconWidth/2 + lineHeight/2, iconWidth, iconWidth);

    x += iconWidth + iconMarginRight;

    ctx.fontSize = fontSize;
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    ctx.fillStyle = "#ffffff";
    ctx.fillText(button.text, x, y + lineHeight / 2 + 1);

    if (!isFreeCost(button.cost)) {

      let costX = position.x + boxWidth - outerPadding - getCostRenderWidth(button.cost) * 0.5;

      renderCost(button.cost, costX, y + iconWidth/2 - 3, true);

    }

  });

}

export function closeContextMenu() {
  mutateInternalState(state => {

    state.contextMenu = null;

  });
}

export function openContextMenu(buttons) {

  stopAllPlacing();

  console.log(buttons);

  mutateInternalState(state => {

    state.contextMenu = {
      position: {
        x: gameMouseX,
        y: gameMouseY
      },
      buttons
    };

  });

  registerNextUnhandledClickHandler(() => {
    closeContextMenu();
  });

}
