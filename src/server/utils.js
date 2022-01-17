const sanitizeHtml = require("sanitize-html");

const colors = [
  "#55DDE0",
  "#33658A",
  "#F6AE2D",
  "#F26419",
  "#B744B8",
  "#A379C9",
  "#ADB9E3",
  "#ACDDE7",
  "#9AD5CA",
  "#2B2D42",
  "#F7EC59",
  "#FF66D8",
  "#2F4858",
];

function htmlentities(str) {

  return sanitizeHtml(str, {
    allowedTags: [],
    allowedAttributes: {},
    disallowedTagsMode: "recursiveEscape"
  });

}



function pickRandom(list) {
  
  let index = Math.floor(Math.random() * list.length);
  return list[index];

}

function filter2dArray(array, func) {

  let positions = [];

  array.forEach((row, y) => {
    row.forEach((playerId, x) => {
      if (func(playerId, x, y)) positions.push({ x, y })
    });
  });

  return positions;

}

module.exports = {
  htmlentities,
  colors,
  pickRandom,
  filter2dArray,
}