const express = require('express');
const webpack = require('webpack');
const webpackDevMiddleware = require('webpack-dev-middleware');

const webpackConfig = require('../../webpack.dev.js');

class Server {

  constructor () {

    // Setup an Express server
    this.app = express();
    this.app.use(express.static('public'));

    if (process.env.NODE_ENV === 'development') {
      // Setup Webpack for development
      const compiler = webpack(webpackConfig);
      this.app.use(webpackDevMiddleware(compiler));
    } else {
      // Static serve the dist/ folder in production
      this.app.use(express.static('dist'));
    }

    // Listen on port
    this.port = process.env.PORT || 3000;
    this.server = this.app.listen(this.port);
    console.log(`Server listening on port ${this.port}`);

  }

}

module.exports = Server;
