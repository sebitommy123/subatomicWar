const sanitizeHtml = require("sanitize-html");

const colors = [
  "#55DDE0",
  "#33658A",
  "#2F4858",
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

module.exports = {
  htmlentities,
  colors,
  pickRandom
}