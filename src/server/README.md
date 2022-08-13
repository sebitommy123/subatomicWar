# Game server

## Reason

Clients mantain an open socket connection with the game server for the duration of the game. By sending and receiving various messages, they can do actions in the game and stay updated of actions that others players do or general events that happen. 

Each game server can run multiple games, and they have no built-in limit, they will ran as many games as told. Instructions to start games come from the main server.

They accept incoming players only if they are registered in the DynamoDB Database, which requires that the main server have added them.

## Functionality

The game server responds to socket traffic. It is not documented and very obscure. Whatever works, works by miracle. You will find many useful abstractions that are misused in every conceivable way. 

However, since it is based on sending the entire state to users over and over (it does not do partial updates), it is not too hard to understand. Essentially, the client is just a puppet of the game server that happens to have a rendering engine. (e.g. Point-in-time rollback is technically possible from the client point of view).

## Environment variables

 - `PORT`: The port to listen to traffic from external clients (users)
 - `CLIENTORIGIN`: The domains to allow traffic from for external clients (users)
 - `INTERNAL_PORT`: The port to listen to traffic from internal clients (game servers)
 - `MAIN_SERVER_ADDRESS`: The address of the main server of this game server's region
 - `MY_ADDRESS`: The public address to reach the external port of the machine
 - `MY_INTERNAL_ADDRESS`: The address to reach the internal port of the machine
 - `AWS_REGION`: The AWS region in which to search for the DynamoDB database
 - `DDB_ENDPOINT`: The endpoint of the DB
 - `DDB_TABLE_NAME`: Name of DB table
 - `AWS_ACCESS_KEY_ID`: Access key of IAM Role
 - `AWS_SECRET_ACCESS_KEY`: Secret access key of IAM Role
