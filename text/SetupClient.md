# Setup the client so users can play

## Configure the global server endpoint

Go to `src/client/index.js` and change the variable GLOBAL_SERVER_ENDPOINT to point to the endpoint of the actual global server.

## Build the front-end

Run `npm run buildSite` to build the static HTML to `dist/`

## Upload to a web server

Upload the static HTML, CSS and JS to a web server. For example, the OVH machine running Apache2 for zubatomic.com

Right now it's hosted on `zubatomic.com:8000`, accessible from `zubatomic.com/projects/commonwealth`.