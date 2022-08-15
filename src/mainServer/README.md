# Main server

## Reason

Clients send requests to the main server to log in, register, list games, create games and join games. Part of joining a game is the client getting the address of the game server to speak to.

There is one main server per region (or multiple for load balancing, but they all act the same).

## Functionality

The main server responds with HTTP traffic:
 - `GET /identify`: Returns identification information (JSON)
 - `GET /listGames`: Returns all games registered to this region
 - `POST /loginAnon`: Logs in users with just a username, user gone forever on refresh
 - `POST /login`: Coming soon, log in with password and username
 - `POST /register`: Coming soon, log in with password and username
 - `POST /createGame`: Creates a game in this region
 - `POST /joinGame`: Joins a game in this region

## Environment variables

 - `PORT`: The port to listen to traffic from external clients (users)
 - `CLIENTORIGIN`: The domains to allow traffic from for external clients (users)
 - `INTERNAL_PORT`: The port to listen to traffic from internal clients (game servers)
 - `REGION`: The "game" region that the main server represents (e.g. North America)
 - `MY_ADDRESS`: The public address of the machine
 - `AWS_REGION`: The AWS region in which to search for the DynamoDB database
 - `DDB_ENDPOINT`: The endpoint of the DB, used for development, usually null
 - `DDB_TABLE_NAME`: Name of DB table
 - `AWS_ACCESS_KEY_ID`: Access key of IAM Role
 - `AWS_SECRET_ACCESS_KEY`: Secret access key of IAM Role