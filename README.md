# Commonwealth.io

## Structure

### Client (/src/client)

A vanilla HTML / CSS / JS project. The entry points are `index.js`, `css/main.css` and `html/index.html`. All other files are included by `index.js`.

Webpack is used to bundle all the js files into one. Then, webpack makes a copy of the html file, but it links the css and js bundles from it.

Calling `npm run buildSite` will trigger webpack to do all that and put the result in `/dist`. However, during development webpack is called dynamically (more info under serveClient).

### Serve client (/src/serveClient)

A simple HTTP express server that listens on whatever port is specified in the PORT environment variable.

In production mode (NODE_ENV=production), it just serves whatever is sitting in the `/dist` directory. This would never actually be used in production mode, instead a host like Firebase would be used.

In development mode (NODE_ENV=development), it dynamically uses webpack in order to bundle the entire `/src/client` directory and serve it, as per the `Client` section above.

Start up the serveClient in development mode with `npm run serveSite`.

### Server (/src/server)

A socket.io server that handles multiple games with multiple players in each.

Start up the server in production mode by running `npm run pro:gameServer`.

The environment variable `CLIENTORIGIN` specifies what domain requests can come from to the server (which configures the CORS).

The environment variable `PORT` specifies the port to run the server in.

By default, it will be in production mode. However, in development mode (NODE_ENV=development), it will also do the job of the client server, dynamically building the webpack client project. This allows you to use this server as the URL for the browser and the server running the game. Furthermore, if the argument `fast` is specified (e.g. `npm run dev:gameServer fast`) it will configure the game such that players get many resources and waiting times are lower.

Start up the server in development mode by running `npm run dev:gameServer`.

## Deployment

### Setting up a new EC2 instance

Simply run all instuctions in `/startServer.bash`.

### [Deprecated] Setting up a new EC2 instance

Manually clone the repo and use the `/commonwealth.service` file to register a new service on the EC2 instance.

### Updating code

By running `npm run deploy`, the server will be dockerized and sent to all machines such that they can update their running servers programs.

 * `npm run deploy` pushes the latest commit on `main` onto the `deploy` branch.
 * Then, a github action at .github/workflows/build.yaml is triggered
 * Github actions builds a container from the dockerfile `/Dockerfile`
 * This dockerfile has instructions to build a node project with everything in this repo in it (excessive), and then run it in production
 * Github actions then pushes the docker container to the docker container repository at ghcr.io/sebitommy123/commonwealth
 * All machines run cloudwatch in order to catch when new containers are pushes to this registry, and update the running container.

## Development environment

### Local database

Both the mainServer and the normal (game) server use the same DynamoDB database (the game server does not yet).

To set up a local testing environment, run `dynamodbLocal/start.sh` which will start up the database in the background. Then open the `dynamodbLocal/Game` with DynamoDB workbench and commit it to the database you just started. Finally, run `dynamodbLocal/addTTL.sh` to add time to live support to the existing database (this isn't that important for development environments).

In case you want to change the structure of the database, delete the running instance with `dynamodbLocal/dropTable.sh` and re-commit from workbench.

### Local game server

Run `npm run dev:gameServer` or `npm run dev:gameServer fast`

This will make it available on port 3000

### Local main server

Run `npm run dev:mainServer`

This will make it available on port 3005

### Local serve client

Run `npm run serveSite`

This will make it available on port 3001