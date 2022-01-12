
// plains, forest, water, oil, desert, mountain

const { getAdjescentPositions } = require("../shared/utils");

const landTypes = {
  plains: {
    name: "Plains",
    combat: { attack: 1, defense: 1 },
    canWalk: true,
  },
  forest: {
    name: "Forest",
    combat: { attack: 1, defense: 1 },
    canWalk: true,
  },
  water: {
    name: "Water",
    combat: { attack: 1, defense: 1 },
    canWalk: false,
  },
  oil: {
    name: "Oil",
    combat: { attack: 1, defense: 1 },
    canWalk: true,
  },
  desert: {
    name: "Desert",
    combat: { attack: 1, defense: 1 },
    canWalk: true,
  },
  mountains: {
    name: "Mountains",
    combat: { attack: 1, defense: 1.5 },
    canWalk: true,
  },
}

function generateRandomLand(width, height) {

  let land = [];

  for (let y = 0; y < height; y++) {
    land.push([]);
    for (let x = 0; x < width; x++) {
      land[y].push("plains");
    }
  }

  // iterate 10 times
  for (let i = 0; i < 20; i++) {

    // choose a random position
    let x = Math.floor(Math.random() * width);
    let y = Math.floor(Math.random() * height);

    let neighbors = getAdjescentPositions({ x, y });

    // filter out neighbors outside the map
    neighbors = neighbors.filter(neighbor => neighbor.x >= 0 && neighbor.x < width && neighbor.y >= 0 && neighbor.y < height);

    // repeat four times
    for (let j = 0; j < 4; j++) {

      // remove a random neighbor with change 50%
      if (Math.random() > 0.5) {
        neighbors.splice(Math.floor(Math.random() * neighbors.length), 1);
      }

    }

    let resource = "forest";
    if (i > 10) resource = "desert";

    // change the land type of the neighbors
    neighbors.forEach(neighbor => {
      land[neighbor.y][neighbor.x] = resource;
    });

    // change the land type of the position
    land[y][x] = resource;

  }

  // iterate 7 times
  for (let i = 0; i < 7; i++) {
    // choose a random position
    let x = Math.floor(Math.random() * width);
    let y = Math.floor(Math.random() * height);

    // put a mountain
    land[y][x] = "mountains";
  }

  // iterate 7 times
  for (let i = 0; i < 7; i++) {
    // choose a random position
    let x = Math.floor(Math.random() * width);
    let y = Math.floor(Math.random() * height);

    // put oil
    //land[y][x] = "oil";
  }

  // calculate middle position
  const middleX = Math.floor(width / 2);
  const middleY = Math.floor(height / 2);

  // make a random lake in the middle of the map of size 3 with random shape
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (Math.abs(x - middleX) + Math.abs(y - middleY) < 3) {
        //land[y][x] = "water";
      }
    }
  }

  return land;

}

module.exports = {
  generateRandomLand,
  landTypes
}
