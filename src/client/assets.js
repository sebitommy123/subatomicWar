const ASSET_NAMES = [
  "soldier.png", "soldierWalkingUp.png", "soldierWalkingDown.png", "soldierWalkingLeft.png", "soldierWalkingRight.png",
  "barracks.png", "city.png", "farm.png", "mine.png", "lumbermill.png", "university.png", "oilRig.png", "trench.png", "barracks.png",
  "gold.png", "wood.png", "oil.png",
  "grass.png", "desert.png", "plains.png", "forest.png", "mountains.png", "oilTile.png", "water.png",
  "fire.png", "info.png", "population.png",
  "trenchFull.png",
];

const SPRITESHEET_CONFIGS = {
  "soldierWalkingUp": {
    startPos: {x: 0, y: 0}, 
    framesPerRow: 2, 
    rowCount: 1, 
    frameWidth: 280, 
    frameHeight: 390
  },
  "soldierWalkingDown": {
    startPos: {x: 0, y: 0}, 
    framesPerRow: 2, 
    rowCount: 1, 
    frameWidth: 280, 
    frameHeight: 390
  },
  "soldierWalkingLeft": {
    startPos: {x: 0, y: 0}, 
    framesPerRow: 2, 
    rowCount: 1,
    frameWidth: 280,
    frameHeight: 390
  },
  "soldierWalkingRight": {
    startPos: {x: 0, y: 0}, 
    framesPerRow: 2, 
    rowCount: 1, 
    frameWidth: 280, 
    frameHeight: 390
  },
}

const assets = {};
const spritesheets = {};

const downloadPromise = Promise.all(ASSET_NAMES.map(downloadAsset));

function downloadAsset(assetName) {
  return new Promise(resolve => {
    const asset = new Image();
    asset.onload = () => {
      console.log(`Downloaded ${assetName}`);
      let shortName = assetName.split(".")[0];

      assets[shortName] = asset;

      if (SPRITESHEET_CONFIGS[shortName]) {
        const { startPos, framesPerRow, rowCount, frameWidth, frameHeight } = SPRITESHEET_CONFIGS[shortName];

        addSpritesheet(shortName, asset, startPos, framesPerRow, rowCount, frameWidth, frameHeight);
      }

      resolve();
    };
    asset.src = `/assets/${assetName}`;
  });
}

function addSpritesheet(spritesheetName, asset, startPos, framesPerRow, rowCount, frameWidth, frameHeight) {

  let frames = [];
  
  for (let row = 0; row < rowCount; row++) {
    for (let frame = 0; frame < framesPerRow; frame++) {
      let x = startPos.x + (frame * frameWidth);
      let y = startPos.y + (row * frameHeight);
      frames.push({x, y, width: frameWidth, height: frameHeight});
    }
  }

  spritesheets[spritesheetName] = {
    frames,
    asset,
    width: frameWidth,
    height: frameHeight
  };
}

export const downloadAssets = () => downloadPromise;

export const getAsset = assetName => assets[assetName];

export const getSpritesheet = spritesheetName => spritesheets[spritesheetName];