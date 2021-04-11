#!/usr/local/bin/node

const F1tvClient = require("./F1tvClient");
const fs = require("fs");
const express = require("express");
const firebase = require('firebase/app');
require('firebase/auth');
require('firebase/firestore');


require("dotenv").config();
const {
  PORT,
  F1_USERNAME,
  F1_PASSWORD,
  FB_KEY,
  FB_PROJECT_ID,
  FB_SENDER_ID,
  FB_APP_ID,
} = process.env;

firebase.initializeApp({
  apiKey: FB_KEY,
  authDomain: `${FB_PROJECT_ID}.firebaseapp.com`,
  projectId: FB_PROJECT_ID,
  storageBucket: `${FB_PROJECT_ID}.appspot.com`,
  messagingSenderId: FB_SENDER_ID,
  appId: `1:${FB_SENDER_ID}:web:${FB_APP_ID}`
});

const db = firebase.firestore();


(async () => {


  const client = new F1tvClient();

  try {
    await client.performAuthentication(F1_USERNAME, F1_PASSWORD);
  } catch (error) {
    console.log(error);
  }

  const app = express();

  app.get("/", (request, response) => {
    response.json({
      status: "normal"
    });
  });

  app.get("/v1/content", [middleware], async (request, response) => {
    response.json(JSON.parse(fs.readFileSync("./out.json")));
  });

  app.get("/v1/image/:ID", [middleware], async (request, response) => {
    const { ID } = request.params;
    response.contentType("image/jpeg");
    response.send(await client.image(ID));
  });

  app.post("/v1/update", [middleware], async (request, response) => {
    try {
      const index = await client.index();
      fs.writeFileSync("./data.json", JSON.stringify(index, null, 2));
      response.json(index);
    } catch (error) {
      console.log(error);
      response.status(400);
      response.json({
        error: error.message
      });
    }
  });

  app.get("/v2/content", [middleware], async (request, response) => {
    const index = await client.indexV2();
    response.json(index);
  });

  app.get("/v2/content/:ID", [middleware], async (request, response) => {
    const { ID } = request.params;
    response.json(await client.getContentEndpoint(ID));
  });

  app.listen(PORT || 80);

})();


async function middleware(req, res, next) {

  const { authkey } = req.headers;
  if (!authkey) {
    res.status(403);
    res.json({
      message: "Token missing."
    });
    return;
  }

  try {
    const auth = db.collection("auth");
    const doc = await auth.doc(authkey).get();
    if (!doc.exists) {
      res.status(403);
      res.json({
        message: `Token '${authkey}' does not exist.`
      });
      return;
    }

    const data = doc.data();
    if (data.active !== true) {
      res.status(403);
      res.json({
        message: `Token '${authkey}' has insufficient permissions.`
      });
      return;
    }

    next();
  } catch (error) {
    res.status(500);
    res.json({ message: "Server error! Is the environment configured properly?" });
  }
}