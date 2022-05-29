var express = require('express');
var app = express();
const { v4: uuid } = require('uuid');

let mode = (process.env.NODE_ENV === "development") ? "development" : "production";

let config;

if (mode == "production") {

  if (["PORT", "AWS_REGION", "DDB_ENDPOINT", "AWS_ACCESS_KEY_ID", "AWS_SECRET_ACCESS_KEY"].filter(key => {
    if (!process.env[key]) {
      console.error(`Missing environment variable ${key}`);
      return true;
    }
    return false;
  }).length > 0) {
    console.error(`To start server in development mode, set NODE_ENV=development`);
    process.exit(1);
  }

  config = {
    ip: process.env.MY_IP || "unknown",
    port: process.env.PORT,
    region: process.env.AWS_REGION,
    ddbEndpoint: process.env.DDB_ENDPOINT,
    ddbRegion: process.env.AWS_REGION,
    ddbTableName: process.env.DDB_TABLE_NAME || "Game",
    ddbCredentials: {accessKeyId: process.env.AWS_ACCESS_KEY_ID, secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY},
    anonTTL: 60 * 60 * 24, // expire anon users after a day
    maxGamesPerServer: 10,
    healthyGamesPerServer: 5,
  };

} else if (mode == "development") {

  config = {...config,
    ip: 'localhost',
    port: 3000,
    region: "North America",
    ddbEndpoint: "http://localhost:8042",
    ddbRegion: 'localhost',
    ddbTableName: 'Game',
    ddbCredentials: {accessKeyId: 'tnfi8', secretAccessKey: '0dv05g'},
  }

}

var AWS = require('aws-sdk');
AWS.config.update({endpoint: config.ddbEndpoint, region: config.ddbRegion, credentials: config.ddbCredentials});
var ddb = new AWS.DynamoDB();

app.get('/identify', (req, res) => {
  // connect to DynamoDB and list all games

  res.send({
    name: "Main server for Commonwealth",
    ip: config.ip,
    port: config.port,
    region: config.region
  });
});

app.get('/listGames', async (req, res) => {
  // connect to DynamoDB and list all games

  const games = await getAllGames();

  if (games == null) return respondWithError(res, "Internal server error");

  res.send({success: true, games});

});

app.post('/loginAnon', async (req, res) => {
  // connect to DynamoDB, check username + "anon" + numbers to make it unique, make a session token, and return it

  let { name } = req.query;

  if (name == null) return respondWithError(res, "No name provided");

  name = name.toString();
  name = name.replace(/[^a-zA-Z0-9 ]/g, '.');
  if (name.length > 20) {
    name = name.substring(0, 20);
  }
  if (name.length < 3) return respondWithError(res, "Name must be at least 3 characters");

  const sessionToken = uuid();

  const ttlTimestamp = Math.floor(new Date().getTime() / 1000) + config.anonTTL;

  if (await mintNewUser(name, sessionToken, ttlTimestamp) == null) return respondWithError(res, "Internal server error");

  res.send({
    success: true, // false if no available server to provision game
    sessionToken,
    name
  });
});

app.post('/login', (req, res) => {
  // connect to DynamoDB, check username and password, make a session token, and return it

  res.send({
    success: true, // false if no available server to provision game
    serverIP: '198.244.100.114:3000' // client will then ping me repeatedly to see if the game is ready with getGameStatus
  });
});

app.post('/register', (req, res) => {
  // connect to DynamoDB, make the user if unique, make a session token, and return it

  res.send({
    success: true, // false if no available server to provision game
    serverIP: '198.244.100.114:3000' // client will then ping me repeatedly to see if the game is ready with getGameStatus
  });
});

app.post('/createGame', async (req, res) => {
  // connect to DynamoDB, add the game, add the player to it as a leader, tell the appropriate server to start up the game, and return the IP of the server

  let { name, session } = req.query;

  if (name == null || session == null) return respondWithError(res, "No name or session token provided");

  session = session.toString();
  
  name = name.toString();
  name = name.replace(/[^a-zA-Z0-9 ]/g, '.');
  if (name.length > 20) {
    name = name.substring(0, 20);
  }
  if (name.length < 3) return respondWithError(res, "Name must be at least 3 characters");

  // GET USERNAME BY SESSION
  let username = await getUsernameBySession(session);
  if (username == null) return respondWithError(res, "You have been logged out. Please refresh and log back in to continue.");
  
  // GET NEXT SERVER TO LOAD
  let nextServerAddr = await getNextServerToLoad();
  if (nextServerAddr == null) return respondWithError(res, "No available servers to provision game. Try again later.");

  // TODO all of these should be a transaction. If there are failures halfway, the database will be left in an inconsistent state.

  const gameId = uuid();

  // PUT PLAYER IN GAME
  if (await setPlayerInGame(username, gameId) == null) return respondWithError(res, "Internal server error");

  // ADD GAME TO SERVER
  if (await addGameToServer(gameId, nextServerAddr, name) == null) return respondWithError(res, "Failed to add game. Please try again later.");

  res.send({
    success: true, // false if no available server to provision game
    serverIP: nextServerAddr
  });
});

app.post('/joinGame', async (req, res) => {
  // connect to DynamoDB, add the player to it in the database, and return the IP of the server

  let { session, gameId } = req.query;

  if (session == null || gameId == null) return respondWithError(res, "No session or game ID provided");

  session = session.toString();
  gameId = gameId.toString();

  let username = await getUsernameBySession(session);
  if (username == null) return respondWithError(res, "You have been logged out. Please refresh and log back in to continue.");

  const game = await getGameById(gameId);
  if (game == null) return respondWithError(res, "Game not found");

  const { serverAddress, stage } = game;

  if (stage != "lobby") return respondWithError(res, "Game is already in progress");

  if (await setPlayerInGame(username, gameId, false) == null) return respondWithError(res, "Internal server error");

  if (await incrementPlayerCount(serverAddress, gameId) == null) return respondWithError(res, "Internal server error");

  res.send({
    success: true,
    serverAddress
  });
});

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


async function getAllGames() {
  const data = await p(ddb.scan, {
    ProjectionExpression: "GSI1PK, playerCount, #n",
    TableName: config.ddbTableName,
    IndexName: "Games",
    FilterExpression: "begins_with(SK, :gamePrefix)",
    ExpressionAttributeValues: {
      ":gamePrefix": { S: "Game-" }
    },
    ExpressionAttributeNames: {
      "#n": "name"
    }
  });

  if (data == null) return null;

  const { Items } = data;
  let games = Items.map(item => {
    return {
      gameId: item.GSI1PK.S.substring(5),
      playerCount: parseInt(item.playerCount.N),
      name: item.name.S
    }
  });

  return games;
}

function mintNewUser(name, sessionToken, ttlTimestamp) {
  return p(ddb.putItem, {
    TableName: config.ddbTableName,
    Item: {
      "PK": {"S": `User-${name}-${uuid()}`},
      "SK": {"S": `Metadata`},
      "playerData": {"M": {
        nickname: {"S": name},
        gold: {"N": "0"},
      }},
      "leader": {"BOOL": false},
      "session": {"S": sessionToken},
      "temporaryUser": {"BOOL": true},
      "ttl": {"N": ttlTimestamp.toString()}
    },
  });
}


async function getNextServerToLoad() {
  const data = await p(ddb.scan, {
    ProjectionExpression: "PK, games",
    TableName: config.ddbTableName,
    IndexName: "Servers"
  });

  if (data == null) return null;

  const { Items } = data;
  let servers = Items.map(item => {
    return {
      serverAddress: item.PK.S.substring(7),
      games: parseInt(item.games.N)
    }
  });

  let healthyServers = servers.filter(server => server.games <= config.healthyGamesPerServer);
  let unhealthyServers = servers.filter(server => server.games > config.healthyGamesPerServer);

  if (healthyServers.length > 0) {
    return healthyServers[healthyServers.length - 1].serverAddress;
  } else if (unhealthyServers.length > 0 && unhealthyServers[0].games < config.maxGamesPerServer) {
    return unhealthyServers[0].serverAddress;
  } else {
    return null;
  }

}

function addGame(gameId, serverAddr, gameName) {
  return p(ddb.putItem, {
    TableName: config.ddbTableName,
    Item: {
      "PK": {"S": `Server-${serverAddr}`},
      "SK": {"S": `Game-${gameId}`},
      "GSI1PK": {"S": `Game-${gameId}`},
      "name": {"S": gameName},
      "stage": {"S": "lobby"},
      "playerCount": {"N": "1"},
      "timestamp": {"N": Date.now().toString()},
    },
  });
}

function incrementServerGameCount(serverAddr) {
  return p(ddb.updateItem, {
    TableName: config.ddbTableName,
    Key: {
      "PK": {"S": `Server-${serverAddr}`},
      "SK": {"S": `Metadata`}
    },
    UpdateExpression: "ADD games :inc",
    ExpressionAttributeValues: {
      ":inc": {"N": "1"}
    },
  });
}

async function addGameToServer(gameId, serverAddr, gameName) {
  // TODO: Actually tell server to add game

  if (await addGame(gameId, serverAddr, gameName) == null) {
    return false;
  }

  return await incrementServerGameCount(serverAddr);
}

async function getUsernameBySession(session) {

  const data = await p(ddb.query, {
    TableName: config.ddbTableName,
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
    return Items[0].PK.S.substring(5);
  }

}

function setPlayerInGame(username, gameId, leader=true) {
  return p(ddb.updateItem, {
    TableName: config.ddbTableName,
    Key: {
      "PK": {"S": `User-${username}`},
      "SK": {"S": `Metadata`},
    },
    UpdateExpression: "SET GSI1PK = :gameId, leader = :isLeader",
    ExpressionAttributeValues: {
      ":gameId": {"S": `Game-${gameId}`},
      ":isLeader": {"BOOL": leader}
    },
  });
}

async function getGameById(gameId) {
  const data = await p(ddb.query, {
    TableName: config.ddbTableName,
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

function incrementPlayerCount(serverAddress, gameId) {
  return p(ddb.updateItem, {
    TableName: config.ddbTableName,
    Key: {
      "PK": {"S": `Server-${serverAddress}`},
      "SK": {"S": `Game-${gameId}`},
    },
    UpdateExpression: "ADD playerCount :inc",
    ExpressionAttributeValues: {
      ":inc": {"N": "1"}
    },
  });
}

function respondWithError(resObject, err) {
  resObject.send({
    success: false,
    message: err
  });
  return null;
}

app.listen(config.port, () => {
  console.log(`Listening on port ${config.port}`);
});