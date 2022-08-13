# Global server

## Reason

Clients send requests to `/getRegions` in order to see the available regions and the assosiated main server endpoints for each region.

## Functionality

The global server responds to HTTP traffic:
 - `GET /getRegions`: Returns the regions (JSON), passed in as an environment variable.
 - `GET /identify`: Returns identification information (JSON)

## Environment variables

 - `MY_ENDPOINT`: The public address of the machine
 - `PORT`: The port to listen to traffic
 - `CLIENTORIGIN`: The web domain from which to accept traffic (for CORS)
 - `REGIONS`: A stringified JSON of all available regions

## Regions JSON format

A list of regions, each with a name and a mainServer endpoint.

```
[
  {
    name: "Spain",
    mainServers: "194.36.64.46",
  }
]
```

## Usage example

A user is presented with a list of all regions fetched from the global server. They select the region "Spain", then the client knows that "Spain"'s main server's endpoint is 194.36.64.46

The game communicates with 194.36.64.46 from then on.