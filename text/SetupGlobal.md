# Setup the global server

## Dockerize

You may find it is already dockerized at `docker.io/sebitommy123/global_server`

If not, build all containers by running `npm run buildImages`

Then, push the global server image to the container registry as you otherwise would:
 - Run `docker images` and find the image ID of the global server image you just created
 - Run `docker tag 66463ec07e05 sebitommy123/global_server:latest` to tag it
 - Run `docker push sebitommy123/global_server:latest` to push it to the `sebitommy123` docker hub container registry.

## Create a EC2 instance exposed on the adequate ports

### Start up the EC2 instance

 1. Go to AWS EC2
 2. Launch an instance called "commonwealth_global" with Amazon Linux 2. Leave the defaults.
    1. Create a new key pair when prompted. Keep it safe.
 3. Click on the EC2 instance
 4. Go to Securiy and click on the assigned security group
 5. Add a Inbound traffic rule to allow `Custom TCP` inbound traffic on port `3002`, or whichever port you choose later on. Set the source to be anywhere.

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

### Run the docker container

 1. Pull the container `docker pull sebitommy123/global_server:latest`
 2. Run it `docker run --env MY_ENDPOINT=http://13.39.17.163:3002 --env PORT=3002 --env CLIENTORIGIN=http://zubatomic.com:8000 --env "REGIONS=[{\"name\":\"Europe\",\"mainServers\":[\"http://13.39.17.163:3010\"]}]" -p 3002:3002 -v "/etc/letsencrypt:/etc/letsencrypt" sebitommy123/global_server:latest` replacing the values with the desired ones.
 3. Test it by sending a `GET /identify` to see if it works, e.g. navigate to `http://13.39.17.163:3002/identify`

Done!