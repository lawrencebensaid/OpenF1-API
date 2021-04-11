# OpenF1 REST API - Web server

OpenF1 is a public REST API. Hosted on https://api.openf1.nl/

The reason this Github repository exists is just to have the code opensourced so the public can see that it works securely.

Thus, the primary reason for this repository's existence is not to allow users to deploy this API them selves. You can deploy it yourself if you want to but don't expect support in the issues section since the pupose of this repository is not distribution (as said before).

## Setup

### npm

`$ npm start`

Before running the web server, you need to configure the environment.

#### Configure the environment: Method 1

Create a `.env` file with the following contents:

```
# General
PORT=8080
OUT_FILE_PATH="./out.json"

# F1
F1_USERNAME=<Insert your own>
F1_PASSWORD=<Insert your own>
F1_API_KEY=<Insert your own>

# Firebase
FB_PROJECT_ID=<Insert your own>
FB_KEY=<Insert your own>
FB_APP_ID=<Insert your own>
FB_SENDER_ID=<Insert your own>
```

#### Configure the environment: Method 2

Another way would be to pass environment variables to the container when using Docker using the `-e` parameters.

### Docker

`$ docker run -p 80:80 lawrencebensaid/openf1:latest`

## Reference

When calling a protected endpoint you should include the `authkey` header containing your access token.

### `GET /`

Should return `{ "status": "normal" }` as a response;

### `GET /v1/content`

Returns all content items as a response.

### `GET /v1/image/:ID`

Returns the requested image as an image.

### `POST /v1/update`

Updates the local database and reindexes the content.

### `GET /v2/content`

Returns all content items as a response.

### `GET /v2/content/:ID`

Returns a specific content item as a response.