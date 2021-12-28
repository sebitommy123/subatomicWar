
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

module.exports = {
  generateEmptyTerritory
}
