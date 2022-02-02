
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

  return !!getPositionInPositionList(position, positionList);
  
}

function getPositionInPositionList(position, positionList) {

  return positionList.find(positionInList => positionInList.x == position.x && positionInList.y == position.y);
  
}


function resolveTerritoryBlacklist(blacklist, tile) {

  let elm = blacklist[tile];

  if (!elm) return {
    allowed: true,
  };

  return elm;
  
}

// make word prural
function pluralize(word) {

  if (word.endsWith("y")) {
    return word.slice(0, -1) + "ies";
  }

  if (word.endsWith("s")) {
    return word + "es";
  }

  return word + "s";

}

function pathfind(from, to, validPositions) {

  let open = [{
    path: [],
    position: from,
    distance: 0
  }];

  let closed = [];

  let result = null;

  while (open.length > 0) {

    let current = open.shift();

    if (current.position.x == to.x && current.position.y == to.y) {
      result = current;
      break;
    }

    let adjescentPositions = getAdjescentPositions(current.position);

    adjescentPositions.forEach(position => {

      if (getPositionInPositionList(position, validPositions) == null) return;

      let elm = getPositionInPositionList(position, closed);

      if (elm) return;

      open.push({
        path: [...current.path, current.position],
        position: position,
        distance: current.distance + 1
      });

    });

    closed.push(current.position);

  }

  if (result == null) {
    return null;
  }

  return [...result.path, to];

}

function randomIntBetween(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomNumberBetween(min, max) {
  return Math.random() * (max - min) + min;
}

function positionListEquals(positionList1, positionList2) {

  if (positionList1.length != positionList2.length) return false;

  for (let i = 0; i < positionList1.length; i++) {

    let match = positionList2.find(position => positionEquals(position, positionList1[i]));

    if (match == null) return false;

  }

  return true;

}

function positionEquals(pos1, pos2) {

  return pos1.x == pos2.x && pos1.y == pos2.y;

}

module.exports = {
  isAdjescent,
  getAdjescentPositions,
  isIsolatedPosition,
  getAuraPositions,
  positionInPositionList,
  getPositionInPositionList,
  resolveTerritoryBlacklist,
  getRingPositions,
  pluralize,
  pathfind,
  randomIntBetween,
  randomNumberBetween,
  positionListEquals,
  positionEquals
}