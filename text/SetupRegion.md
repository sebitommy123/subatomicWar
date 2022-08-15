# Setup all the necessary resources to bring up a region

## Prerequisites

### Global server

The global server must be up and running. If not, follow the instructions at SetupGlobal.md.

### Client server

The server that actually hosts the client (that users go to to play the game) must be up.

## Dockerize

You must dockerize the game server, the main server and the background.

You may find they are already dockerized at `docker.io/sebitommy123/background`, `docker.io/sebitommy123/main_server`, `docker.io/sebitommy123/game_server`

If not, build all containers by running `npm run buildImages`

Then, push each server image to the container registry as you otherwise would:
 - Run `docker images` and find the image ID of the global server image you just created
 - Run `docker tag 66463ec07e05 sebitommy123/main_server:latest` to tag it (inserting the correct image ID and writting whichever server you are doing instead of main_server)
   - This may work: `docker tag subatomicwar_background sebitommy123/background ; docker tag subatomicwar_mainserver sebitommy123/main_server ; docker tag subatomicwar_globalserver sebitommy123/global_server ; docker tag subatomicwar_gameserver sebitommy123/game_server`
 - Run `docker push sebitommy123/main_server:latest` to push it to the `sebitommy123` docker hub container registry. (Again, replacing main_server)
   - This may work: `docker push sebitommy123/main_server:latest ; docker push sebitommy123/game_server:latest ; docker push sebitommy123/global_server:latest ; docker push sebitommy123/background:latest`

## Create the DynamoDB database

 1. Log in to the AWS console
 2. Choose the appropriate AWS region (e.g. Paris)
 3. Go to AWS CloudFormation
 4. Click "Create stack"
 5. Upload the template file found in `dynamodbLocal/GameV2_cloudformation.json` (in this repo)
 6. Click next, call the stack "Commonwealth"
 7. Leave everything else as is and click "Create stack"
 8. Go to AWS DynamoDB
 9. Check that a new table has been created called "Game" with three GSIs

Done! The database is now live.

### Allow access to the database

 1. Go to AWS IAM and create a new User
 2. Call it commonwealth_ddb
 3. Give it an access key, but no password
 4. Attach existing policies directly, namely `AmazonDynamoDBFullACcess`
 5. Take note of the secret access key

## Create a EC2 instance exposed on the adequate ports

### Start up the EC2 instance

 1. Go to AWS EC2
 2. Launch an instance called "commonwealth" with Amazon Linux 2. Leave the defaults.
    1. Create a new key pair when prompted. Keep it safe.
 3. Click on the EC2 instance
 4. Go to Securiy and click on the assigned security group
 5. Add a Inbound traffic rule to allow `Custom TCP` inbound traffic on port `3010`, or whichever port you choose for the main server later on. Set the source to be anywhere.
 6. Add another Inbound traffic rule to allow from `3000`, or whichever you choose for the game server.
 7. This is INSECURE but easier for now:
    1. Add inbound traffic rules for ports `3042` and `3011` or whichever you choose below.

### Install prerequisites

Run `sudo -i` to stay in sudo mode

Run
 1. `yum update -y`
 2. `amazon-linux-extras install docker`

### Set up docker

 1. Start docker: `systemctl start docker`
 2. Clear all currently running docker containers and images just in case:
    1. `docker stop $(docker ps -aq)`
    2. `docker rm $(docker ps -aq)`
    3. `docker rmi $(docker images -q)`

### Run the appropriate docker containers

 1. `service docker start`
 2. Pull all containers
    1. `docker pull sebitommy123/main_server:latest`
    2. `docker pull sebitommy123/game_server:latest`
    3. `docker pull sebitommy123/background:latest`
 3. Run them, replacing values with desired ones (add an `&` at the end to run in the background)
    1. `docker run --env PORT=3010 --env INTERNAL_PORT=3011 --env CLIENTORIGIN=http://zubatomic.com:8000 --env MY_ADDRESS=http://13.39.17.163:3010 --env REGION=Europe --env AWS_REGION=eu-west-3 --env DDB_TABLE_NAME=Game --env AWS_ACCESS_KEY_ID=AKIA6KXWBHYYTCNQB6FH --env AWS_SECRET_ACCESS_KEY=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 -p 3010:3010 -p 3011:3011 sebitommy123/main_server:latest`
    2. `docker run --env PORT=3000 --env INTERNAL_PORT=3042 --env CLIENTORIGIN=http://zubatomic.com:8000 --env MY_ADDRESS=ws://13.39.17.163:3000 --env MAIN_SERVER_ADDRESS=http://13.39.17.163:3010 --env MY_INTERNAL_ADDRESS=http://13.39.17.163:3042 --env AWS_REGION=eu-west-3 --env DDB_TABLE_NAME=Game --env AWS_ACCESS_KEY_ID=AKIA6KXWBHYYTCNQB6FH --env AWS_SECRET_ACCESS_KEY=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 -p 3000:3000 -p 3042:3042 sebitommy123/game_server:latest`
    3. `docker run --env AWS_REGION=eu-west-3 --env DDB_TABLE_NAME=Game --env AWS_ACCESS_KEY_ID=AKIA6KXWBHYYTCNQB6FH --env AWS_SECRET_ACCESS_KEY=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 sebitommy123/background:latest`

### Run all three containers with proper network configuration and environment variables