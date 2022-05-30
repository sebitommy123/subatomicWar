const express = require('express');

class InternalServer {

  constructor(handleStartGame) {
    this.app = express();

    this.app.post("/startGame", handleStartGame);

    this.port = process.env.INTERNAL_PORT || 3001;

    this.app.listen(this.port);

    console.log(`Serving internal traffic on port ${this.port}`);
  }

}

module.exports = InternalServer;