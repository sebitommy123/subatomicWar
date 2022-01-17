
function generateEmptyTerritory(width, height) {

  let territory = [];

  for (let y = 0; y < height; y++) {
    territory.push([]);
    for (let x = 0; x < width; x++) {
      territory[y].push(null);
    }
  }

  return territory;

}

function getEmptyPositions(territory) {

  let positions = [];

  territory.forEach((row, y) => {
    row.forEach((playerId, x) => {
      if (playerId === null) positions.push({ x, y })
    });
  });

  return positions;

}

module.exports = {
  generateEmptyTerritory,
  getEmptyPositions,
}
