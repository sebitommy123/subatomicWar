import { ctx, RenderConstants } from "../render";
import { gameMouseX, gameMouseY } from "../userInput";
import { getTerritoryAt } from "./game";

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

export function getHoveringTileCoords() {
  return {
    x: Math.floor(gameMouseX / RenderConstants.CELL_WIDTH),
    y: Math.floor(gameMouseY / RenderConstants.CELL_HEIGHT)
  };
}

export function getDirections() {
  return ["left", "right", "top", "bottom"];
}

export function getTerritoryDirPositionFrom(x, y, dir) {
  if (dir === "left") {
    x--;
  } else if (dir === "right") {
    x++;
  } else if (dir === "top") {
    y--;
  } else if (dir === "bottom") {
    y++;
  } else {
    return null;
  }

  return { x, y };
}

export function getTerritoryDirFrom(x, y, dir) {
  if (dir === "left") {
    x--;
  } else if (dir === "right") {
    x++;
  } else if (dir === "top") {
    y--;
  } else if (dir === "bottom") {
    y++;
  } else {
    return null;
  }

  return getTerritoryAt(x, y);
}

export function getDirectionFromPosToPos(x1, y1, x2, y2) {
  if (x1 < x2) {
    return "right";
  } else if (x1 > x2) {
    return "left";
  } else if (y1 < y2) {
    return "bottom";
  } else if (y1 > y2) {
    return "top";
  } else {
    return null;
  }
}

export function flipNeighborList(neighbors) {
  return ["left", "right", "top", "bottom"].filter(dir => !neighbors.includes(dir));
}

export function clockwiseDir(dir) {
  if (dir === "left") {
    return "top";
  } else if (dir === "top") {
    return "right";
  } else if (dir === "right") {
    return "bottom";
  } else if (dir === "bottom") {
    return "left";
  } else {
    return null;
  }
}

export function movePositionInDir({ x, y }, dir, amount) {

  if (dir === "left") {
    x -= amount;
  } else if (dir === "right") {
    x += amount;
  } else if (dir === "top") {
    y -= amount;
  } else if (dir === "bottom") {
    y += amount;
  }
  return { x, y };
}

export function positionCenteredAt(tileX, tileY) {
  return {
    x: tileX * RenderConstants.CELL_WIDTH + RenderConstants.CELL_WIDTH / 2,
    y: tileY * RenderConstants.CELL_HEIGHT + RenderConstants.CELL_HEIGHT / 2
  };
}