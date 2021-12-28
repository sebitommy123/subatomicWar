
function generateRandomLand(width, height) {

  let land = [];

  for (let y = 0; y < height; y++) {
    land.push([]);
    for (let x = 0; x < width; x++) {
      land[y].push("grass");
    }
  }

  // calculate middle position
  const middleX = Math.floor(width / 2);
  const middleY = Math.floor(height / 2);

  // make a random lake in the middle of the map of size 3 with random shape
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (Math.abs(x - middleX) + Math.abs(y - middleY) < 3) {
        land[y][x] = "water";
      }
    }
  }

  return land;

}

module.exports = {
  generateRandomLand
}
