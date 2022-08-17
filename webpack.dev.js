const { merge } = require('webpack-merge');
const common = require('./webpack.common.js');
const { DefinePlugin } = require('webpack');
const { global_server_endpoint } = require("./src/globalServer/config.js");

module.exports = merge(common, {
  mode: 'development',
  devtool: "inline-source-map",
  plugins: [
    new DefinePlugin({
      "GLOBAL_SERVER_ENDPOINT_PASSED_IN_FROM_WEBPACK": JSON.stringify(global_server_endpoint.dev)
    }),
  ],
});