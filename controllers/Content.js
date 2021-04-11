
require("dotenv").config();
const {
  F1_USERNAME,
  F1_PASSWORD
} = process.env;

const firebase = require('firebase/app');
require('firebase/auth');
require('firebase/firestore');

const http = require("request-promise-native");
const F1tvClient = require("../F1tvClient.js");
const F1tvContent = require("../models/F1tvContent.js");

const HOST = "formula1.com";

const db = firebase.firestore();


var client;
(async () => {
  client = new F1tvClient();
  try {
    await client.performAuthentication(F1_USERNAME, F1_PASSWORD);
  } catch (error) {
    console.log(error);
  }
})();


/**
 * @author Lawrence Bensaid <lawrencebensaid@icloud.com>
 */
class Content {

  /**
   * 
   */
  async index(request, response) {
    try {
      const content = db.collection("content");
      const archive = await client.getArchive();
      await indexContent(archive);
      await fetchContent();
      const allDocs = await content.get();
      const data = allDocs.docs.map(doc => {
        const result = doc.data();
        result.id = doc.id;
        return result;
      });
      console.log(data);
      response.json(data);
    } catch (error) {
      console.log(error);
      response.status(500);
      response.json({ message: error.message });
    }
  }


  /**
   * 
   */
  async show(request, response) {
    try {
      const { ID } = request.params;
      const content = db.collection("content");
      const doc = (await content.doc(ID).get()).data();
      doc.id = ID;
      response.json(doc);
    } catch (error) {
      console.log(error);
      response.status(500);
      response.json({ message: error.message });
    }
  }


  /**
   * 
   */
  async provision(request, response) {
    try {
      const { ID } = request.params;
      response.json(await client.getContentEndpoint(ID));
    } catch (error) {
      console.log(error);
      response.status(500);
      response.json({ message: error.message });
    }
  }

}



/**
 * 
 * 
 * @returns {Promise}
 */
function fetchContent() {
  const content = db.collection("content");
  return new Promise(async (resolve, reject) => {
    try {
      const allContent = await content.get()
      for (const doc of allContent.docs) {
        try {
          console.log(doc.id);
          const response = await http.get(`https://f1tv.${HOST}/2.0/R/ENG/WEB_DASH/ALL/CONTENT/VIDEO/${doc.id}/F1_TV_Pro_Annual/2`);
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
                  sessionEndTime,
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
            await content.doc(doc.id).set({
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
              sessionEndTime: sessionEndTime || null,
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
                return {
                  code: title,
                  color: hex,
                  firstname: driverFirstName,
                  lastname: driverLastName,
                  number: racingNumber,
                  team: teamName,
                  constructor: constructorName,
                  driverImg,
                  teamImg,
                }
              }),
              channels: alternativeStreams.map(({
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
            }, { merge: true });
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
 * 
 * 
 * @param {object[]} items
 * @returns {Promise}
 */
function indexContent(items) {
  const content = db.collection("content");
  return new Promise(async (resolve, reject) => {
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
                for (const { id } of containers2) {
                  await content.doc(id).set({}, { merge: true });
                }
              }
            }
          }
        }

        const type = metadata.objectType;
        if (type !== "LAUNCHER" && type !== "BUNDLE") {
          await content.doc(id).set({}, { merge: true });
        }
      }
    }
    resolve();
  });
}


module.exports = Content;