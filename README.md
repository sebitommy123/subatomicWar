# Commonwealth.io

## Structure

### Client (/src/client)

A vanilla HTML / CSS / JS project. The entry points are `index.js`, `css/main.css` and `html/index.html`. All other files are included by `index.js`.

Webpack is used to bundle all the js files into one. Then, webpack makes a copy of the html file, but it links the css and js bundles from it.

Calling `npm run build` will trigger webpack to do all that and put the result in `/dist`. However, during development webpack is called dynamically (more info under serveClient).

### Serve client (/src/serveClient)

A simple HTTP express server that listens on whatever port is specified in the PORT environment variable.

In production mode (NODE_ENV=production), it just serves whatever is sitting in the `/dist` directory. This would never actually be used in production mode, instead a host like Firebase would be used.

In development mode (NODE_ENV=development), it dynamically uses webpack in order to bundle the entire `/src/client` directory and serve it, as per the `Client` section above.

Start up the serveClient in development mode with `npm run serveClient`.

### Server (/src/server)

A socket.io server that handles multiple games with multiple players in each.

Start up the server in production mode by running `npm run start`.

By default, it will be in production mode. However, in development mode (NODE_ENV=development), it will also do the job of the client server, dynamically building the webpack client project. This allows you to use this server as the URL for the browser and the server running the game. Furthermore, if the argument `fast` is specified (e.g. `npm run develop fast`) it will configure the game such that players get many resources and waiting times are lower.

Start up the server in development mode by running `npm run develop`.

# Run server on EC2 instance:

## Install docker
