#!/usr/local/bin/node
require("webnjs/main");

const {
  DATA_LOCATION,
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

// const http = require("request-promise-native");
// const F1tvClient = require("./F1tvClient.js");
// const Content = require("./controllers/Content.js");
const fs = require("fs");
// const express = require("express");


// const { version, description } = require('./package.json');

// const db = FB_KEY ? firebase.firestore() : null;


(async () => {

  if (DATA_LOCATION === "local") {
    if (!fs.existsSync("./.cache")) {
      fs.mkdirSync("./.cache");
    }
    if (!fs.existsSync("./.cache/index.json")) {
      fs.writeFileSync("./.cache/index.json", "{}");
    }
    if (!fs.existsSync("./.cache/content.json")) {
      fs.writeFileSync("./.cache/content.json", "{}");
    }
  }

  // const client = new F1tvClient();

  // try {
  //   await client.performAuthentication(F1_USERNAME, F1_PASSWORD);
  // } catch (error) {
  //   console.log(error);
  // }

  // const app = express();

  // app.get(["/v1", "/"], (request, response) => {
  //   response.json({
  //     status: "normal",
  //     version, description
  //   });
  // });

  // app.post(["/v1/reindex", "/reindex"], [middleware], async (request, response) => {
  //   new Content().reindex(request, response);
  // });

  // app.get(["/v1/content", "/content"], [middleware], async (request, response) => {
  //   new Content().index(request, response);
  // });

  // app.get(["/v1/content/:ID", "/content/:ID"], [middleware], async (request, response) => {
  //   new Content().show(request, response);
  // });

  // app.get(["/v1/content/:ID/provision", "/content/:ID/provision"], [middleware], async (request, response) => {
  //   new Content().provision(request, response);
  // });

  // app.get(["/v1/content/:ID/thumbnail", "/content/:ID/thumbnail"], [], async (request, response) => {
  //   new Content().thumbnail(request, response);
  // });

  // app.get(["/v1/event/upcoming", "/event/upcoming"], [], async (request, response) => {
  //   new Content().upcoming(request, response);
  // });

  // app.get(["/v1/editorial/constructor", "/editorial/constructor"], [], async (request, response) => {
  //   const body = await http.get({
  //     uri: "https://api.formula1.com/v1/editorial-constructorlisting/listing",
  //     headers: {
  //       apikey: F1_API_KEY_2
  //     }
  //   });
  //   response.json(JSON.parse(body));
  // });

  // app.get(["/v1/editorial/driver", "/editorial/driver"], [], async (request, response) => {
  //   const body = await http.get({
  //     uri: "https://api.formula1.com/v1/editorial-driverlisting/listing",
  //     headers: {
  //       apikey: F1_API_KEY_2
  //     }
  //   });
  //   response.json(JSON.parse(body));
  // });

  // app.get(["/v1/editorial/schedule", "/editorial/schedule"], [], async (request, response) => {
  //   const body = await http.get({
  //     uri: "https://api.formula1.com/v1/editorial-eventlisting/events",
  //     headers: {
  //       apikey: F1_API_KEY_2
  //     }
  //   });
  //   response.json(JSON.parse(body));
  // });

  // app.listen(PORT || 80);

})();


// async function middleware(req, res, next) {

//   const { authkey } = req.headers;
//   if (!authkey) {
//     res.status(403);
//     res.json({
//       message: "Token missing."
//     });
//     return;
//   }

//   try {
//     const auth = db.collection("auth");
//     const doc = await auth.doc(authkey).get();
//     if (!doc.exists) {
//       res.status(403);
//       res.json({
//         message: `Token '${authkey}' does not exist.`
//       });
//       return;
//     }

//     const data = doc.data();
//     if (data.active !== true) {
//       res.status(403);
//       res.json({
//         message: `Token '${authkey}' has insufficient permissions.`
//       });
//       return;
//     }

//     next();
//   } catch (error) {
//     if (error.code === "resource-exhausted") {
//       res.status(400);
//       res.json({ message: "Daily quota exceeded" });
//     } else {
//       console.log(error);
//       res.status(500);
//       res.json({ message: "Server error! Is the environment configured properly?" });
//     }
//   }
// }