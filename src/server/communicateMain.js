const express = require('express');
const axios = require("axios").default;

const mainServerAddress = process.env.MAIN_SERVER_ADDRESS;

class InternalServer {

  constructor(handleStartGame) {
    this.app = express();
    this.app.use(express.json());
    this.app.use(express.urlencoded({ extended: false }));

    this.handleStartGame = handleStartGame;

    this.app.post("/startGame", this.handleStartGameRequest.bind(this));

    this.port = process.env.INTERNAL_PORT || 3001;

    this.app.listen(this.port);

    console.log(`Listening to internal traffic on port ${this.port}`);
  }

  handleStartGameRequest(req, res) {

    try {
      this.handleStartGame(req.body.gameId);
      res.send("OK");
    } catch (err) {
      console.error(err);
      res.send("ERROR");
    }

  }

}

function setGameStage() {
  
  axios.get(`${mainServerAddress}/setGameStage`);

}

module.exports = {
  InternalServer,
  setGameStage
};