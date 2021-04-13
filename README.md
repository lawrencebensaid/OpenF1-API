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
DATA_LOCATION=local

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

**Description:** Should return `{ "status": "normal" }` as a response;

<br/>

### `POST /v2/reindex`

**Description:** Reindexes all content.

<br/>

### `GET /v2/content`

**Description:** Returns all content items as a response.

**Parameters:**

Name | Method | Type | Description | Example
--- | --- | --- | --- | ---
**search** | query | `String` | Search query | British Grand Prix
**genre** | query | `String` | Genre filter | Practice 3

<br/>

### `GET /v2/content/:ID`

**Description:** Returns a specific content item as a response.

**Parameters:**

Name | Method | Type | Description | Example
--- | --- | --- | --- | ---
**ID** | params | `Number` | Content ID | 1000000415

<br/>

### `GET /v2/content/:ID/provision`

**Description:** Provisions a content HLS stream and returns the prepared uri as a response.

**Parameters:**

Name | Method | Type | Description | Example
--- | --- | --- | --- | ---
**ID** | params | `Number` | Content ID | 1000000415
**channel** | query | `Number` | Channel ID | 1022

<br/>

### `GET /v2/content/:ID/thumbnail`

**Description:** Returns the content's thumbnail as an image.

**Parameters:**

Name | Method | Type | Description | Example
--- | --- | --- | --- | ---
**ID** | params | `Number` | Content ID | 1000000415
**width** | query | `Number` | Search query | 1920
**height** | query | `Number` | Search query | 1080

<br/>
