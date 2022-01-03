
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

function getRingPositions(position) {

  let ringPositions = [];

  ringPositions.push({ x: position.x - 1, y: position.y - 1 });
  ringPositions.push({ x: position.x - 1, y: position.y });
  ringPositions.push({ x: position.x - 1, y: position.y + 1 });
  ringPositions.push({ x: position.x, y: position.y - 1 });
  ringPositions.push({ x: position.x, y: position.y + 1 });
  ringPositions.push({ x: position.x + 1, y: position.y - 1 });
  ringPositions.push({ x: position.x + 1, y: position.y });
  ringPositions.push({ x: position.x + 1, y: position.y + 1 });

  return ringPositions;

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

function getAuraPositions(cityPositions) {

  let auraPositions = [];

  cityPositions.forEach(city => {

    auraPositions = auraPositions.concat(getRingPositions(city));

  });

  return auraPositions;

}

function positionInPositionList(position, positionList) {

  return positionList.some(positionInList => positionInList.x == position.x && positionInList.y == position.y);
  
}

function resolveTerritoryBlacklist(blacklist, tile) {

  let elm = blacklist[tile];

  if (!elm) return {
    allowed: true,
  };

  return elm;
  
}

module.exports = {
  isAdjescent,
  getAdjescentPositions,
  isIsolatedPosition,
  getAuraPositions,
  positionInPositionList,
  resolveTerritoryBlacklist,
  getRingPositions
}