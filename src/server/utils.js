const sanitizeHtml = require("sanitize-html");

function htmlentities(str) {

  return sanitizeHtml(str, {
    allowedTags: [],
    allowedAttributes: {},
    disallowedTagsMode: "recursiveEscape"
  });

}

module.exports = {
  htmlentities
}