const { nanoid } = require("nanoid");
const { BuiltNode } = require("./BuiltNode");

class Structure extends BuiltNode{

  constructor(game, x, y, type) {

    super("structure", game, x, y, type);

  }

}

module.exports = {
  Structure
}
