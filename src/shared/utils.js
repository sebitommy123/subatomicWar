
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

module.exports = {
  isAdjescent,
  getAdjescentPositions
}