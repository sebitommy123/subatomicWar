import { ctx } from "./render";
import { gameMouseX, gameMouseY } from "./userInput";

const errors = document.getElementById('errors');

export function displayError(error) {

  // create div.error
  const div = document.createElement('div');
  div.classList.add('error');
  div.innerText = error;

  // append div.error to the top of #errors
  errors.insertBefore(div, errors.firstChild);

  // remove div.error after 5 seconds
  let timerTimeout = setTimeout(() => {
    div.remove();
  }, 5000);

  // scroll to the top of #errors
  errors.scrollTop = 0;

  // if the user clicks on the error, remove it and clear the timer
  div.onclick = () => {
    div.remove();
    clearTimeout(timerTimeout);
  };

}

export function pointInRect(point, rect) {
  return point.x > rect.x && point.x < rect.x + rect.width &&
    point.y > rect.y && point.y < rect.y + rect.height;
}

export function mouseInRect(rect) {
  return pointInRect({
    x: gameMouseX,
    y: gameMouseY
  }, rect);
}

export function mouseInLastRect() {
  if (!ctx.lastRect) return falses;

  return mouseInRect(ctx.lastRect);
}

export function pointInCircle(point, circle) {
  return Math.sqrt(Math.pow(point.x - circle.x, 2) + Math.pow(point.y - circle.y, 2)) < circle.radius;
}

export function mouseInCircle(circle) {
  return pointInCircle({
    x: gameMouseX,
    y: gameMouseY
  }, circle);
}

export function mouseInLastCircle() {
  if (!ctx.lastCircle) return false;

  return mouseInCircle(ctx.lastCircle);
}