var express = require('express');
var cors = require("cors");
var app = express();

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

app.listen(config.port, () => {
  console.log(`Listening on port ${config.port}`);
});