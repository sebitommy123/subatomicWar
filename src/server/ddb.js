var AWS = require('aws-sdk');

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
    my_address: process.env.MY_ADDRESS,
    endpoint: process.env.DDB_ENDPOINT,
    region: process.env.AWS_REGION,
    tableName: process.env.DDB_TABLE_NAME || "Game",
    credentials: {accessKeyId: process.env.AWS_ACCESS_KEY_ID, secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY},
  };

} else {

  config = {
    my_address: "localho.st",
    endpoint: "http://localhost:8042",
    region: 'localhost',
    tableName: 'Game',
    credentials: {accessKeyId: 'tnfi8', secretAccessKey: '0dv05g'},
  }

}

AWS.config.update({endpoint: config.endpoint, region: config.region, credentials: config.credentials});
var ddb = new AWS.DynamoDB();

console.log("Connected to DynamoDB");

async function registerServer(externalPort, internalPort) {

  const address = `${config.my_address}:${externalPort}`;
  const internalAddress = `${config.my_address}:${internalPort}`;

  await cleanOrphanGames(address);

  let result = await p(ddb.putItem, {
    TableName: config.tableName,
    Item: {
      "PK": {"S": `Server-${address}`},
      "SK": {"S": `Metadata`},
      "games": {"N": "0"},
      "internalAddress": {"S": internalAddress},
    },
  });

  return result != null;

}

async function getUserBySession(session) {

  const data = await p(ddb.query, {
    TableName: config.tableName,
    KeyConditionExpression: "#s = :sessionField",
    ExpressionAttributeNames: {
      "#s": "session"
    },
    ExpressionAttributeValues: {
      ":sessionField": {"S": session},
    },
    IndexName: "SessionsGSI"
  });

  if (data == null) return null;

  const { Items } = data;
  if (Items.length === 0) {
    return null;
  } else {
    return {
      username: Items[0].PK.S.substring(5),
      gameId: Items[0].GSI1PK ? Items[0].GSI1PK.S.substring(5) : null,
      leader: Items[0].leader.BOOL,
      temporaryUser: Items[0].temporaryUser.BOOL,
      playerData: Items[0].playerData.M,
    };
  }

}

async function getGameById(gameId) {
  const data = await p(ddb.query, {
    TableName: config.tableName,
    KeyConditionExpression: "GSI1PK = :game and begins_with(PK, :serverText)",
    ExpressionAttributeValues: {
      ":game": {"S": `Game-${gameId}`},
      ":serverText": {"S": "Server-"}
    },
    IndexName: "Games"
  });

  if (data == null) return null;

  const { Items } = data;
  if (Items.length === 0) {
    return null;
  } else {
    return {
      serverAddress: Items[0].PK.S.substring(7),
      stage: Items[0].stage.S
    };
  }
}

async function setGameStage(gameId, stage) {
  const { serverAddress } = await getGameById(gameId); //We get our own server address... We have this! TODO

  await p(ddb.updateItem, {
    TableName: config.tableName,
    Key: {
      "PK": {"S": `Server-${serverAddress}`},
      "SK": {"S": `Game-${gameId}`},
    },
    UpdateExpression: "SET stage = :stage",
    ExpressionAttributeValues: {
      ":stage": {"S": stage}
    },
  });
}

async function removeGame(gameId) {
  const { serverAddress } = await getGameById(gameId); // We get our own server address... We have this! TODO

  await p(ddb.deleteItem, {
    TableName: config.tableName,
    Key: {
      "PK": {"S": `Server-${serverAddress}`},
      "SK": {"S": `Game-${gameId}`},
    }
  });

  // TODO remove players too, low prio
}

async function cleanOrphanGames(serverAddress) {
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

  console.log(`${games.Items.length} orphan games found for ${serverAddress}`);

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
}

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

module.exports = {
  registerServer,
  getUserBySession,
  setGameStage,
  removeGame
};