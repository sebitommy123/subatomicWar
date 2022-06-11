var express = require('express');
var cors = require("cors");
var app = express();

let mode = (process.env.NODE_ENV === "development") ? "development" : "production";

let config = {
  ip: process.env.MY_IP || "unknown",
  port: process.env.PORT,
  clientOrigin: process.env.CLIENTORIGIN,
  regions: [],
};

app.use(cors({
  origin: config.clientOrigin,
}));

if (mode == "development") {
  config.ip = "localhost";
  config.regions = [
    {
      name: "Localhost",
      mainServers: [process.env.DEV_MAIN_ADDR],
    }
  ]
}

app.get('/identify', (req, res) => {
  res.send({
    name: "Global server for Commonwealth",
    ip: config.ip,
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