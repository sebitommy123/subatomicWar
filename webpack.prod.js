const { merge } = require('webpack-merge');
const common = require('./webpack.common.js');
const TerserJSPlugin = require('terser-webpack-plugin');
const CssMinimizerPlugin = require("css-minimizer-webpack-plugin");
const CopyPlugin = require("copy-webpack-plugin");
const { DefinePlugin } = require('webpack');
const { global_server_endpoint } = require("./src/globalServer/config.js");

module.exports = merge(common, {
  mode: 'production',
  optimization: {
    minimizer: [new TerserJSPlugin({}), new CssMinimizerPlugin({})],
  },
  plugins: [
    new CopyPlugin({
      patterns: [
        { from: "public/", to: "./" },
      ],
    }),
    new DefinePlugin({
      "GLOBAL_SERVER_ENDPOINT_PASSED_IN_FROM_WEBPACK": JSON.stringify(global_server_endpoint.prod)
    }),
  ],
});