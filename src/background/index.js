var AWS = require('aws-sdk');
const axios = require("axios").default;

const FREQUENCY = 10000/*ms*/;

let config;
if (process.argv.length == 2) {

  if (["AWS_REGION", "DDB_ENDPOINT", "AWS_ACCESS_KEY_ID", "AWS_SECRET_ACCESS_KEY"].filter(key => {
    if (!process.env[key]) {
      console.error(`Missing environment variable ${key}`);
      return true;
    }
    return false;
  }).length > 0) {
    console.error(`To start server in development mode, run with "development" argument`);
    process.exit(1);
  }

  config = {
    endpoint: process.env.DDB_ENDPOINT,
    region: process.env.AWS_REGION,
    tableName: process.env.DDB_TABLE_NAME || "Game",
    credentials: {accessKeyId: process.env.AWS_ACCESS_KEY_ID, secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY},
  };

} else {

  config = {
    endpoint: "http://localhost:8042",
    region: 'localhost',
    tableName: 'Game',
    credentials: {accessKeyId: 'tnfi8', secretAccessKey: '0dv05g'},
  }

}

AWS.config.update({endpoint: config.endpoint, region: config.region, credentials: config.credentials});
var ddb = new AWS.DynamoDB();

console.log("Connected to DynamoDB");

// Scan through each server using the Servers GSI, and ping it to make sure it's alive. If it's not:
   // Remove all the games belonging to that server
      // For each game, use the Games GSI to remove all the users from the game. Also demote the leader to non-leader.
   // Remove the server's metadata

async function background() {

  console.log("Ran...");

  try {

    const data = await p(ddb.scan, {
      ProjectionExpression: "PK, internalAddress",
      TableName: config.tableName,
      IndexName: "Servers"
    });

    data.Items.forEach(async gameServer => {
      let serverAddress = gameServer.PK.S.substring(7);
      let internalAddress = gameServer.internalAddress.S;

      try {
        let data = await axios.post(`${internalAddress}/identify`, {}, {timeout: 2000});
        console.log(`UP ${serverAddress}`);
      } catch (e) { //Server down!
        console.log(`DOWN ${serverAddress}`);
        console.log("Finding all orphaned games...");
        const games = await p(ddb.scan, {
          ProjectionExpression: "GSI1PK",
          TableName: config.tableName,
          IndexName: "Games",
          FilterExpression: "PK = :serverAddress",
          ExpressionAttributeValues: {
            ":serverAddress": { S: `Server-${serverAddress}` },
          }
        });

        console.log(`${games.Items.length} games found for ${serverAddress}`);

        games.Items.forEach(async game => {
          const gameId = game.GSI1PK.S.substring(5);

          const deletedGame = await p(ddb.deleteItem, {
            TableName: config.tableName,
            Key: {
              "PK": {"S": `Server-${serverAddress}`},
              "SK": {"S": `Game-${gameId}`},
            },
            ReturnValues: "ALL_OLD"
          });

          // TODO remove players too, low prio

          console.log(`Deleted game ${gameId}, ${deletedGame.Attributes.playerCount.N} players affected`);
        });

        await p(ddb.deleteItem, {
          TableName: config.tableName,
          Key: {
            "PK": {"S": `Server-${serverAddress}`},
            "SK": {"S": `Metadata`},
          }
        });

        console.log(`Deleted metadata for server ${serverAddress}`);
      }
    });
  
  } catch (e) {
    console.log(`Failed. Will retry in ${FREQUENCY}ms`);
  }

  setTimeout(background, FREQUENCY);

}

background();

// Add a log to the logs table signifying that the server died and that some games died with it. Give a count of all the players affected.

function p(func, config) {
  return new Promise((resolve, reject) => {
    func.bind(ddb)(config, (err, data) => {
      if (err == null) {
        resolve(data);
      } else {
        console.error(err);
        resolve(null);
      }
    });
  });
}