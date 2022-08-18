var express = require('express');
var cors = require("cors");
var { usingHttps, expressSSLConfig } = require("../shared/ssl");
var https = require("https");

const app = express();
let listener = app;
if (usingHttps) listener = https.createServer(expressSSLConfig, app);

let config = {
  endpoint: process.env.MY_ENDPOINT || "unknown",
  port: process.env.PORT,
  clientOrigin: process.env.CLIENTORIGIN,
  regions: JSON.parse(process.env.REGIONS),
};

app.use(cors({
  origin: config.clientOrigin,
}));

app.get('/identify', (req, res) => {
  res.send({
    name: "Global server for Commonwealth",
    endpoint: config.endpoint,
    port: config.port,
    region: config.region
  });
});

app.get('/getRegions', (req, res) => {
  res.send(config.regions);
});

listener.listen(config.port, () => {
  console.log(`Listening on port ${config.port}`);
});