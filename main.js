#!/usr/local/bin/node

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
const OUT_FILE_PATH = process.env.OUT_FILE_PATH || "./out.json";

const firebase = require('firebase/app');
require('firebase/auth');
require('firebase/firestore');

firebase.initializeApp({
  apiKey: FB_KEY,
  authDomain: `${FB_PROJECT_ID}.firebaseapp.com`,
  projectId: FB_PROJECT_ID,
  storageBucket: `${FB_PROJECT_ID}.appspot.com`,
  messagingSenderId: FB_SENDER_ID,
  appId: `1:${FB_SENDER_ID}:web:${FB_APP_ID}`
});

const F1tvClient = require("./F1tvClient.js");
const Content = require("./controllers/Content.js");
const fs = require("fs");
const express = require("express");


const { version, description } = require('./package.json');

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
      status: "normal",
      version, description
    });
  });

  app.get("/v1/content", [middleware], async (request, response) => {
    response.json(JSON.parse(fs.readFileSync(OUT_FILE_PATH)));
  });

  app.get("/v1/image/:ID", [middleware], async (request, response) => {
    const { ID } = request.params;
    response.contentType("image/jpeg");
    response.send(await client.image(ID));
  });

  app.post("/v1/update", [middleware], async (request, response) => {
    try {
      const index = await client.index();
      response.json(index);
    } catch (error) {
      console.log(error);
      response.status(400);
      response.json({
        error: error.message
      });
    }
  });

  app.post("/v2/reindex", [middleware], async (request, response) => {
    new Content().reindex(request, response);
  });

  app.get("/v2/content", [middleware], async (request, response) => {
    new Content().index(request, response);
  });

  app.get("/v2/content/:ID", [middleware], async (request, response) => {
    new Content().show(request, response);
  });

  app.get("/v2/content/:ID/provision", [middleware], async (request, response) => {
    new Content().provision(request, response);
  });

  app.get("/v2/content/:ID/thumbnail", [middleware], async (request, response) => {
    new Content().thumbnail(request, response);
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
    if (error.code === "resource-exhausted") {
      res.status(400);
      res.json({ message: "Daily quota exceeded" });
    } else {
      console.log(error);
      res.status(500);
      res.json({ message: "Server error! Is the environment configured properly?" });
    }
  }
}