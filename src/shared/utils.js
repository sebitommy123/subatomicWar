
function getAdjescentPositions(position) {
  let adjescentPositions = [];

  adjescentPositions.push({
    x: position.x - 1,
    y: position.y
  });

  adjescentPositions.push({
    x: position.x + 1,
    y: position.y
  });

  adjescentPositions.push({
    x: position.x,
    y: position.y - 1
  });

  adjescentPositions.push({
    x: position.x,
    y: position.y + 1
  });

  return adjescentPositions;
}

function isAdjescent(from, to) {
  return getAdjescentPositions(from).some(position => position.x == to.x && position.y == to.y);
}

function isIsolatedPosition(position, occupiedPositions) {

  // return false if position is within one of the occupied positions
  for (let i = 0; i < occupiedPositions.length; i++) {
    if (Math.abs(position.x - occupiedPositions[i].x) <= 2 && Math.abs(position.y - occupiedPositions[i].y) <= 2) {
      return false;
    }
  }

  return true;

}

module.exports = {
  isAdjescent,
  getAdjescentPositions,
  isIsolatedPosition
}