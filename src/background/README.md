# Game server

## Reason

The background process runs constantly in the background. There can be many, they shouldn't interfere with each other.

## Functionality

The functionality of the background process right now is:
 - Scan all servers and ping them to see if they are dead. If so, delete them and their games from the database.

It seems like the current functionality will be able to be easily removed by kubernetes "hooks", since kubernetes does these checks itself.

## Environment variables

 - `AWS_REGION`: The AWS region in which to search for the DynamoDB database
 - `DDB_ENDPOINT`: The endpoint of the DB
 - `DDB_TABLE_NAME`: Name of DB table
 - `AWS_ACCESS_KEY_ID`: Access key of IAM Role
 - `AWS_SECRET_ACCESS_KEY`: Secret access key of IAM Role