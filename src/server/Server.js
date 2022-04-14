const express = require('express');
const webpack = require('webpack');
const webpackDevMiddleware = require('webpack-dev-middleware');
const socketio = require('socket.io');

const { wrapSocket } = require('./SocketWrapper');

const webpackConfig = require('../../webpack.dev.js');

const Constants = require("../shared/constants.js");

class Server {

  constructor (handleSocketConnection) {

    // Setup an Express server
    this.app = express();
    this.app.use(express.static('public'));

    if (process.env.NODE_ENV === 'development') {
      // Setup Webpack for development
      const compiler = webpack(webpackConfig);
      this.app.use(webpackDevMiddleware(compiler));
      
      console.log(`Serving client on ${this.port}`);
    }

    // Listen on port
    this.port = process.env.PORT || 3000;
    this.server = this.app.listen(this.port);

    const clientOrigin = process.env.CLIENTORIGIN || "https://commonwealth.io";
    
    console.log(`Serving game on ${this.port} to ${clientOrigin}`);

    // Setup socket.io
    this.io = socketio(this.server, {
      cors: {
        origin: clientOrigin,
        methods: ["GET", "POST"]
      }
    });

    // Listen for socket.io connections
    this.io.on('connection', socket => {
      console.log('Player connected!', socket.id);

      const augSocket = wrapSocket(socket);

      handleSocketConnection(augSocket);
    });

  }

  getSocketIo() {
    return this.io;
  }

}

module.exports = Server;
