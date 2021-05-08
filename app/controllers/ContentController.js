//
//  ContentController.js
//  openf1
//
//  Created by Lawrence Bensaid on 5/8/2021.
//  Copyright © 2021 Lawrence Bensaid. All rights reserved.
//

import { Controller } from "webnjs"
import fs from "fs"
import http from "request-promise-native"
import F1tvClient from "../../F1tvClient.js"
import F1tvContent from "../../models/F1tvContent.js"
import firebase from "firebase/app"

const {
  DATA_LOCATION,
  F1_USERNAME,
  F1_PASSWORD,
  F1_API_KEY,
  F1_API_KEY_2,
  FB_KEY
} = process.env;

require("firebase/auth");
require("firebase/firestore");

const HOST = "formula1.com";

const db = FB_KEY ? firebase.firestore() : null;

const { version, description } = require('../../package.json');

var client;
(async () => {
  client = new F1tvClient();
  try {
    await client.performAuthentication(F1_USERNAME, F1_PASSWORD);
  } catch (err) {
    error(err);
  }
})();


/**
 * @author Lawrence Bensaid <lawrencebensaid@icloud.com>
 *
 * @description Manages requests regarding the Content.
 * @since 0.7.0
 */
class ContentController extends Controller {

  /**
   * @description Root handler. Returns service status.
   */
  async root({ response }) {
    response.json({
      status: "normal",
      version, description
    });
  }

  /**
   * @description Index handler
   * @middleware
   */
  async auth({ response, request }, resolve) {
    const { authkey } = request.headers;
    if (!authkey) {
      response.status(403);
      response.json({
        message: "Token missing."
      });
      return;
    }
    try {
      const auth = db.collection("auth");
      const doc = await auth.doc(authkey).get();
      if (!doc.exists) {
        response.status(403);
        response.json({
          message: `Token '${authkey}' does not exist.`
        });
        return;
      }
      const data = doc.data();
      if (data.active !== true) {
        response.status(403);
        response.json({
          message: `Token '${authkey}' has insufficient permissions.`
        });
        return;
      }
      resolve();
    } catch (err) {
      if (err.code === "resource-exhausted") {
        response.status(400);
        response.json({ message: "Daily quota exceeded" });
      } else {
        error(err);
        response.status(500);
        response.json({ message: "Server error! Is the environment configured properly?" });
      }
    }
  }


  /**
   * @description Index handler
   */
  async editorialConstructor({ response }) {
    const body = await http.get({
      uri: "https://api.formula1.com/v1/editorial-constructorlisting/listing",
      headers: {
        apikey: F1_API_KEY_2
      }
    });
    response.json(JSON.parse(body));
  }


  /**
   * @description Index handler
   */
  async editorialDriver({ response }) {
    const body = await http.get({
      uri: "https://api.formula1.com/v1/editorial-driverlisting/listing",
      headers: {
        apikey: F1_API_KEY_2
      }
    });
    response.json(JSON.parse(body));
  }


  /**
   * @description Index handler
   */
  async editorialSchedule({ response }) {
    const body = await http.get({
      uri: "https://api.formula1.com/v1/editorial-eventlisting/events",
      headers: {
        apikey: F1_API_KEY_2
      }
    });
    response.json(JSON.parse(body));
  }


  /**
   * @description Index handler
   */
  async upcoming({ response }) {
    try {
      const json = await http.get({
        uri: "https://api.formula1.com/v1/event-tracker",
        headers: {
          locale: "en",
          apikey: F1_API_KEY
        }
      });
      const { seasonContext, race } = JSON.parse(json);
      const events = seasonContext.timetables || [];
      for (const event of events) {
        event.country = race.meetingCountryName
        event.startTime += event.gmtOffset;
        event.endTime += event.gmtOffset;
        delete event.gmtOffset;
      }
      response.json(events);
    } catch (err) {
      error(err);
      response.status(500);
      response.json({ message: err.message });
    }
  }


  /**
   * @description Index handler
   */
  async reindex({ response }) {
    try {
      const start = new Date().valueOf();
      if (DATA_LOCATION === "local") {
        fs.writeFileSync("./.cache/index.json", "{}");
      } else {
        const index = db.collection("index");
        (await index.get()).forEach(doc => { doc.ref.delete(); });
      }
      await indexContent(await client.getHome());
      await indexContent(await client.getArchive());
      await indexContent(await client.getDocumentaries());
      response.json({
        message: "Reindexing complete",
        duration: Math.floor((new Date().valueOf() - start) / 1000)
      });
    } catch (err) {
      error(err);
      response.status(500);
      response.json({ message: err.message });
    }
  }


  /**
   * @description Index handler
   */
  async index({ query, response }) {
    try {
      const start = new Date().valueOf();
      const index = db.collection("index");
      const search = (query.search || "").toLowerCase();
      const genre = (query.genre || "").toLowerCase();
      const layer0 = {};
      const source = DATA_LOCATION === "local" ? JSON.parse(fs.readFileSync("./.cache/index.json")) : (await index.get()).docs;
      for (const id in source) {
        const doc = source[id]
        if (DATA_LOCATION === "local") {
          layer0[id] = doc;
        } else {
          layer0[doc.id] = doc.data();
        }
      }
      const layer1 = genre ? {} : layer0;
      if (genre) {
        for (const id in layer0) {
          const data = layer0[id];
          if (data.genre && data.genre.toLowerCase() === genre) {
            layer1[id] = data;
          }
        }
      }
      const layer2 = search ? {} : layer1;
      if (search) {
        for (const id in layer1) {
          const data = layer1[id];
          const title = data.title.toLowerCase();
          if (title.includes(search)) {
            layer2[id] = data;
          }
        }
      }

      const data = [];
      for (const i in layer2) {
        const result = layer0[i];
        const id = parseInt(i)
        if (!id) continue;
        result.id = id;
        data.push(result);
      }

      print(`Duration: ${Math.floor((new Date().valueOf() - start) / 1000)} seconds`);
      response.json(data);
    } catch (err) {
      error(err);
      response.status(500);
      response.json({ message: err.message });
    }
  }


  /**
   * @description Index handler
   */
  async show({ response, params }) {
    try {
      const { ID } = params;
      const content = db.collection("content");
      await fetchContent([ID]);

      var doc;
      doc = DATA_LOCATION === "local" ? JSON.parse(fs.readFileSync("./.cache/content.json"))[ID] : (await content.doc(ID).get()).data();

      const id = parseInt(ID);
      if (!id) throw new Error("parseInt failed");
      doc.id = id;
      response.json(doc);
    } catch (err) {
      error(err);
      response.status(500);
      response.json({ message: "A server error occurred! :/" });
    }
  }


  /**
   * @description Index handler
   */
  async provision({ query, params, response }) {
    try {
      const { ID } = params;
      const { channel } = query;
      const endpoint = await client.getContentEndpoint(ID, channel);
      if (endpoint === null) {
        response.status(400);
        response.json({
          message: "Content item does not have any HLS resources."
        });
        return;
      }
      response.json({ hls: endpoint });
    } catch (err) {
      error(err);
      response.status(500);
      response.json({ message: err.message });
    }
  }


  /**
   * @description Index handler
   */
  async thumbnail({ params, query, response }) {
    try {
      const { ID } = params;
      const width = query.width || 1920;
      const height = query.height || 1080;
      const results = await http.get(`https://f1tv.${HOST}/2.0/R/ENG/WEB_DASH/ALL/CONTENT/VIDEO/${ID}/F1_TV_Pro_Annual/2`);
      const { resultObj: { containers } } = JSON.parse(results);
      const { pictureUrl } = containers[0].metadata;
      response.contentType("image/jpeg");
      response.send(await client.image(pictureUrl, width, height));
    } catch (err) {
      if (error.message.toLowerCase().includes("content id must be a number")) {
        response.status(400);
        response.json({ message: "Content ID must be a number" });
        return;
      }
      error(err);
      response.status(500);
      response.json({ message: err.message });
    }
  }

}


/**
 * @param {number[]?} indices
 * @returns {Promise}
 */
function fetchContent(indices = null) {
  const index = db.collection("index");
  const content = db.collection("content");
  return new Promise(async (resolve, reject) => {
    try {
      if (DATA_LOCATION === "local") {
        const json = JSON.parse(fs.readFileSync("./.cache/index.json"));
        indices = indices || Object.keys(json);
      } else {
        indices = indices || (await index.get()).docs.map(doc => doc.id);
      }
      for (const id of indices) {
        try {
          console.log(id);
          const response = await http.get(`https://f1tv.${HOST}/2.0/R/ENG/WEB_DASH/ALL/CONTENT/VIDEO/${id}/F1_TV_Pro_Annual/2`);
          const { resultObj: { total, containers } } = JSON.parse(response);
          if (total === 1) {
            const {
              metadata: {
                longDescription,
                year,
                directors,
                isADVAllowed,
                title,
                duration,
                contentProvider,
                isLatest,
                genres,
                isOnAir,
                isEncrypted,
                metadataLanguage,
                season,
                leavingSoon,
                isGeoBlocked,
                actors,
                titleBrief,
                comingSoon,
                isPopularEpisode,
                entitlement,
                locked,
                videoType,
                objectType,
                objectSubtype,
                contentSubtype,
                contentType,
                additionalStreams,
                emfAttributes: {
                  sessionEndDate,
                  sessionStartDate,
                  OBC,
                  Series,
                  Meeting_Country_Name,
                  Meeting_Location,
                  Global_Title,
                  Circuit_Official_Name,
                  Circuit_Short_Name
                }
              }
            } = containers[0];
            const alternativeStreams = additionalStreams || []
            const structure = {
              title,
              subtitle: titleBrief,
              description: longDescription,
              year: year || null,
              directors: directors || [],
              isADVAllowed,
              duration,
              provider: contentProvider,
              isLatest,
              genres,
              isLive: isOnAir,
              isEncrypted,
              language: metadataLanguage,
              season: season || null,
              leavingSoon,
              isGeoBlocked,
              actors: actors || [],
              comingSoon,
              isPopular: isPopularEpisode || false,
              entitlement: entitlement || "UNDETERMINED",
              locked: locked || null,
              videoType: videoType || null,
              type: contentType || objectType || null,
              subtype: contentSubtype || objectSubtype || null,
              endDate: parseInt(sessionEndDate) || null,
              startDate: parseInt(sessionStartDate) || null,
              OBC: OBC,
              series: Series || null,
              countryName: Meeting_Country_Name || null,
              location: Meeting_Location || null,
              globalTitle: Global_Title || null,
              circuitOfficialName: Circuit_Official_Name || null,
              circuitShortName: Circuit_Short_Name || null,
              drivers: alternativeStreams.map(({
                racingNumber,
                title,
                driverFirstName,
                driverLastName,
                teamName,
                constructorName,
                driverImg,
                teamImg,
                hex
              }) => {
                if (racingNumber === 0) return null;
                return {
                  code: title,
                  color: (hex || "").substr(1) || null,
                  firstname: driverFirstName,
                  lastname: driverLastName,
                  number: racingNumber,
                  team: teamName,
                  constructor: constructorName,
                  driverImg,
                  teamImg,
                }
              }).filter(x => x),
              channels: alternativeStreams.map(({
                title,
                playbackUrl
              }) => {
                const components1 = playbackUrl.split("channelId=")[1].split("&amp;")[0];
                const channel = parseInt(components1);
                if (channel === NaN) return null;
                return {
                  name: title,
                  channel
                }
              })
            };
            if (DATA_LOCATION === "local") {
              const json = JSON.parse(fs.readFileSync("./.cache/content.json"));
              json[id] = structure;
              fs.writeFileSync("./.cache/content.json", JSON.stringify(json));
            } else {
              await content.doc(id).set(structure);
            }
          } else {
            console.log("WHAT?! Total is more than 1. That's unexpected!");
          }

        } catch (error) {
          console.log(error);
        }
      }
      resolve();
    } catch (error) {
      console.log(error);
      reject(error);
    }
  });
}


/**
 * @param {object[]?} items
 * @returns {Promise}
 */
function indexContent(items = null) {
  const index = db.collection("index");
  return new Promise(async (resolve, reject) => {
    try {
      if (items === null) {
        items = await client.getHome();
      }
      for (const i in items) {
        const container = items[i];
        const { retrieveItems } = container;
        const { resultObj } = retrieveItems || {};
        const { containers } = resultObj || {};
        if (Array.isArray(containers)) {
          await indexContent(containers);
        } else if (items[i].layout === "CONTENT_ITEM") {
          const { id, metadata, actions } = items[i];

          for (const { uri, targetType } of actions) {
            if (targetType === "DETAILS_PAGE") continue;
            const response = await http.get(`https://f1tv.${HOST}${uri}`);
            const { resultObj } = JSON.parse(response) || {};
            const { containers } = resultObj || {};
            if (Array.isArray(containers)) {
              for (const container of containers) {
                const retrieveItems2 = container.retrieveItems || {};
                const resultObj2 = retrieveItems2.resultObj || {};
                const containers2 = resultObj2.containers || {};
                if (Array.isArray(containers2)) {
                  for (const container2 of containers2) {
                    const { id, metadata: { objectType, title, duration, season, genres, emfAttributes }, actions: actions2 } = container2;
                    const data = { title, type: objectType };
                    data.duration = duration;
                    data.season = season;
                    if (emfAttributes) {
                      const { sessionEndDate, sessionStartDate } = emfAttributes;
                      if (sessionEndDate && sessionStartDate) {
                        data.startDate = sessionStartDate;
                        data.endDate = sessionEndDate;
                      }
                    }
                    if (genres) {
                      data.genres = genres[0];
                    }
                    if (DATA_LOCATION === "local") {
                      const json = JSON.parse(fs.readFileSync("./.cache/index.json"));
                      json[id] = data
                      fs.writeFileSync("./.cache/index.json", JSON.stringify(json));
                    } else {
                      await index.doc(id).set(data);
                    }
                    const uri2 = actions2[0].uri;
                    if (objectType === "BUNDLE" && uri2) {
                      const { resultObj: { containers } } = JSON.parse(await http.get(`https://f1tv.${HOST}${uri2}`));
                      await indexContent(containers);
                    }
                  }
                }
              }
            }
          }

          const { objectType, title, duration, season, genres, emfAttributes } = metadata;
          if (objectType !== "LAUNCHER") {
            const data = { title, type: objectType };
            data.duration = duration;
            data.season = season;
            if (emfAttributes) {
              const { sessionEndDate, sessionStartDate } = emfAttributes;
              if (sessionEndDate && sessionStartDate) {
                data.startDate = sessionStartDate;
                data.endDate = sessionEndDate;
              }
            }
            if (genres) {
              data.genre = genres[0];
            }
            if (DATA_LOCATION === "local") {
              const json = JSON.parse(fs.readFileSync("./.cache/index.json"));
              json[id] = data
              fs.writeFileSync("./.cache/index.json", JSON.stringify(json));
            } else {
              await index.doc(id).set(data);
            }
          }
        }
      }
      resolve();
    } catch (error) {
      reject(error);
    }
  });
}


export default ContentController