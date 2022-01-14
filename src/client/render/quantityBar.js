import { ctx } from "../render";
import { getInternalState, mutateInternalState } from "../state";
import { mouseClicked, mouseX, mouseY, registerClick, registerDraggableSurface, registerNonDraggableSurface, registerNonScrollableSurface, registerScrollableSurface } from "../userInput";
import { getMaxUnitPurchase } from "../utils/general";
import { pointInRect } from "../utils/geometry";

export const shortcuts = {
  "1": 0.1,
  "2": 0.2,
  "3": 0.3,
  "4": 0.4,
  "5": 0.5,
  "6": 0.6,
  "7": 0.7,
  "8": 0.8,
  "9": 0.9,
  "w": 1,
  "s": 0,
};

export function isQuantityBarOpen() {

  const { quantityBar } = getInternalState();

  return quantityBar.currentQuantityBar != null;

}

export function setQuantityBarQuantity(newQuantity) {

  if (!isQuantityBarOpen()) return;

  const { quantityBar } = getInternalState();

  quantityBar.currentPercentage = newQuantity;

}

export function setQuantityBar(quantityBarConfig) {

  removeQuantityBar();

  mutateInternalState(state => {

    const tag = quantityBarConfig.tag;

    if (!tag) return;

    state.quantityBar.currentQuantityBar = quantityBarConfig; // tag, max, tip, color, units
    if (state.quantityBar.savedQuantityPercentages[tag] == null) {
      state.quantityBar.savedQuantityPercentages[tag] = 0.5;
    }
    state.quantityBar.currentPercentage = state.quantityBar.savedQuantityPercentages[tag];
  });

}

export function removeQuantityBar() {

  mutateInternalState(state => {

    if (!state.quantityBar.currentQuantityBar) return;

    const tag = state.quantityBar.currentQuantityBar.tag;

    state.quantityBar.savedQuantityPercentages[tag] = state.quantityBar.currentPercentage;

    state.quantityBar.currentQuantityBar = null;
    state.quantityBar.currentPercentage = null;

  });

}

export function getQuantityBarQuantity() {

  if (!getInternalState().quantityBar.currentQuantityBar) return;

  const { quantityBar } = getInternalState();
  const { currentQuantityBar, currentPercentage } = quantityBar;
  const { max: maxFunc } = currentQuantityBar;

  return Math.max(1, Math.floor(currentPercentage * maxFunc()));;

}

export function drawQuantityBar() {

  if (!getInternalState().quantityBar.currentQuantityBar) return;

  const { quantityBar } = getInternalState();
  const { currentQuantityBar, currentPercentage } = quantityBar;
  const { max: maxFunc, tip: tipFunc, color, units } = currentQuantityBar;

  const currentQuantity = getQuantityBarQuantity();

  const tip = tipFunc(currentQuantity);
  const max = maxFunc();

  const marginRight = 75;
  const barWidth = 50;

  const marginTop = 150;
  const marginBottom = 200;

  const barHeight = canvas.height - marginBottom - marginTop;

  // light blue background
  const backgroundPadding = 3;
  ctx.fillStyle = "#d4f1f9";
  ctx.abs.fillRect(canvas.width - marginRight - barWidth - backgroundPadding, marginTop - backgroundPadding, barWidth + backgroundPadding*2, barHeight + backgroundPadding*2)
  
  // dark gray bar
  ctx.fillStyle = "#404040";
  ctx.abs.fillRect(canvas.width - marginRight - barWidth, marginTop, barWidth, barHeight);

  let hoveringOverBar = false;

  if (pointInRect({ x: mouseX, y: mouseY }, {
    x: canvas.width - marginRight - barWidth, 
    y: marginTop, 
    width: barWidth, 
    height: barHeight
  })) {

    hoveringOverBar = true;

    function update() {
      const newFillAbs = barHeight - (mouseY - marginTop);
      let newFillPercent = newFillAbs / barHeight;

      newFillPercent = Math.floor(newFillPercent * 100) / 100;

      if (newFillPercent > 1) newFillPercent = 1;
      if (newFillPercent < 0) newFillPercent = 0;

      mutateInternalState(state => {
        state.quantityBar.currentPercentage = newFillPercent;
      });
    }

    registerDraggableSurface(update);
    if (mouseClicked) registerClick(update);

    registerScrollableSurface(dy => {

      mutateInternalState(state => {
        let newVal = state.quantityBar.currentPercentage - dy * 0.003;

        if (newVal > 1) newVal = 1;
        if (newVal < 0) newVal = 0;

        state.quantityBar.currentPercentage = newVal;
      });
      
    });
  }

  const filledHeight = barHeight * currentPercentage;

  // green bar
  ctx.fillStyle = color;
  ctx.abs.fillRect(canvas.width - marginRight - barWidth, marginTop + (barHeight - filledHeight), barWidth, filledHeight)

  // separating line
  ctx.strokeStyle = "#d4f1f9";
  ctx.abs.beginPath();
  ctx.abs.lineWidth = 3;
  ctx.abs.moveTo(canvas.width - marginRight - barWidth, marginTop + (barHeight - filledHeight));
  ctx.abs.lineTo(canvas.width - marginRight, marginTop + (barHeight - filledHeight));
  ctx.abs.stroke();

  // text
  const value = currentQuantity;
  const percentText = Math.floor(currentPercentage * 100) + "%";

  if (filledHeight < barHeight - 40) {

    ctx.fillStyle = "#dddddd";
    ctx.abs.font = "9px Arial";
    ctx.abs.textAlign = "center";
    ctx.abs.textBaseline = "bottom";
    ctx.abs.fillText(percentText, canvas.width - marginRight - barWidth/2 + 1, marginTop + (barHeight - filledHeight) - 18);
    ctx.fillStyle = "#ffffff";
    ctx.abs.font = "13px Arial";
    ctx.abs.fillText(value, canvas.width - marginRight - barWidth/2, marginTop + (barHeight - filledHeight) - 4);
 
  } else {

    ctx.fillStyle = "#dddddd";
    ctx.abs.font = "9px Arial";
    ctx.abs.textAlign = "center";
    ctx.abs.textBaseline = "top";
    ctx.abs.fillText(percentText, canvas.width - marginRight - barWidth/2 + 1, marginTop + (barHeight - filledHeight) + 20);
    ctx.fillStyle = "#ffffff";
    ctx.abs.font = "13px Arial";
    ctx.abs.fillText(value, canvas.width - marginRight - barWidth/2, marginTop + (barHeight - filledHeight) + 6);

  }

  ctx.fillStyle = "#000000";
  ctx.abs.font = "bold 9px Arial";
  ctx.abs.textBaseline = "bottom";
  ctx.abs.fillText(max + " " + units, canvas.width - marginRight - barWidth/2, marginTop - backgroundPadding - 2);
  
  ctx.abs.font = "bold 14px Arial";
  ctx.abs.fillText("100%", canvas.width - marginRight - barWidth/2, marginTop - backgroundPadding - 13);

  ctx.fillStyle = "#000000";
  ctx.abs.font = "bold 14px Arial";
  ctx.abs.textBaseline = "top";
  ctx.abs.fillText("0%", canvas.width - marginRight - barWidth/2 + 2, marginTop + barHeight + backgroundPadding + 4);

  const separation = 40;
  const lines = tip.length;
  const lineHeight = 20;
  const tipPadding = 10;
  const tipHeight = lines * lineHeight + tipPadding*2;
  const tipWidth = 140;
  
  ctx.fillStyle = "#404040";
  ctx.abs.fillRect(canvas.width - marginRight - barWidth/2 - tipWidth/2, marginTop - separation - tipHeight, tipWidth, tipHeight);
  if (pointInRect({x: mouseX, y: mouseY}, {
    x: canvas.width - marginRight - barWidth/2 - tipWidth/2, 
    y: marginTop - separation - tipHeight, 
    width: tipWidth, 
    height: tipHeight
  })) {
    registerNonDraggableSurface();
    registerNonScrollableSurface();
  }

  tip.forEach((tip, i) =>  {
    ctx.fillStyle = "white";
    ctx.abs.font = "13px Arial";
    ctx.abs.textAlign = "center";
    ctx.abs.textBaseline = "middle";
    ctx.abs.fillText(tip, canvas.width - marginRight - barWidth/2, marginTop - separation - tipHeight + i * lineHeight + lineHeight/2 + tipPadding);
  });

}