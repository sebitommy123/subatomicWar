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
  getUserBySession
};