const ASSET_NAMES = [
  "soldier.png", 
  "barracks.png", "city.png", "farm.png", "mine.png", "lumbermill.png", "university.png", "oilRig.png", "trench.png", "barracks.png",
  "gold.png", "wood.png", "oil.png",
  "grass.png", "desert.png", "plains.png", "forest.png", "mountains.png", "oilTile.png", "water.png",
  "fire.png", "info.png",
];

const assets = {};

const downloadPromise = Promise.all(ASSET_NAMES.map(downloadAsset));

function downloadAsset(assetName) {
  return new Promise(resolve => {
    const asset = new Image();
    asset.onload = () => {
      console.log(`Downloaded ${assetName}`);
      assets[assetName.split(".")[0]] = asset;
      resolve();
    };
    asset.src = `/assets/${assetName}`;
  });
}

export const downloadAssets = () => downloadPromise;

export const getAsset = assetName => assets[assetName];