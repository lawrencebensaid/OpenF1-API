const http = require("request-promise-native");
const util = require("util");
const fs = require("fs");

const F1tvContent = require("./models/F1tvContent.js");
// const F1tvSeason = require("models/F1tvSeason.js");


require("dotenv").config();
const { F1_API_KEY } = process.env;
const OUT_FILE_PATH = process.env.OUT_FILE_PATH || "./out.json";

const HOST = "formula1.com";


/**
 * @author Lawrence Bensaid <lawrencebensaid@icloud.com>
 */
class F1tvClient {

  constructor() {
    this.token = null;
  }


  /**
   * 
   */
  index() {
    return new Promise(async (resolve, reject) => {
      try {
        const response = await http.get({
          uri: `https://f1tv.${HOST}/2.0/R/ENG/WEB_DASH/ALL/PAGE/493/F1_TV_Pro_Annual/2`
          // uri: `https://f1tv.${HOST}/2.0/R/ENG/WEB_DASH/ALL/MENU/F1_TV_Pro_Annual/2`
        });
        const data = JSON.parse(response);
        const { resultObj: { containers } } = data;

        if (fs.existsSync(OUT_FILE_PATH)) {
          fs.unlinkSync(OUT_FILE_PATH);
        }
        await this.indexContent(containers);
        await this.applyContent();
        await this.pruneContent();

        const out = JSON.parse(fs.readFileSync(OUT_FILE_PATH));
        console.log(out.length);

        resolve(out);
      } catch (error) {
        reject(error);
      }
    });
  }


  /**
   * 
   */
  image(ID, width = 1920, height = 1080) {
    return new Promise(async (resolve, reject) => {
      try {
        const response = await http.get({
          uri: `https://ott.${HOST}/image-resizer/image/${ID}?w=${width}&h=${height}&o=L`,
          headers: {
            "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_6) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0.3 Safari/605.1.15",
          },
          encoding: null
        });
        resolve(response);
      } catch (error) {
        reject(error);
      }
    });
  }


  /**
   * @param {string} contentID 
   */
  getContentEndpoint(contentID) {
    return new Promise(async (resolve, reject) => {
      try {
        const response = await http.get({
          uri: `https://f1tv.${HOST}/1.0/R/ENG/WEB_HLS/ALL/CONTENT/PLAY?contentId=${contentID}`,
          headers: {
            entitlementtoken: this.token
          }
        });
        const { resultObj } = JSON.parse(response);
        resolve(resultObj.url || null);
      } catch (error) {
        reject(error.message);
      }
    });
  }


  /**
   * @param {string} username Login username
   * @param {string} password Login password
   */
  performAuthentication(username, password) {
    return new Promise(async (resolve, reject) => {
      try {
        const response = await this.authenticate(username, password);
        const ascendontoken = response.data.subscriptionToken;
        if (typeof ascendontoken !== "string") throw new Error("Authentication failure");
        this.token = await this.getEntitlement(ascendontoken);
        resolve();
      } catch (error) {
        reject(error.message);
      }
    });
  }


  /**
   * @param {string} username Login username
   * @param {string} password Login password
   */
  authenticate(username, password) {
    return new Promise(async (resolve, reject) => {
      try {
        const response = await http.post({
          uri: `https://api.${HOST}/v2/account/subscriber/authenticate/by-password`,
          headers: {
            Cookie: "reese84=null",
            apiKey: F1_API_KEY
          },
          json: {
            Login: username,
            Password: password
          }
        });
        resolve(response);
      } catch (error) {
        if (error.statusCode === 401) {
          reject(new Error("Access denied"));
          return;
        }
        reject(error.message);
      }
    });
  }


  /**
   * @param {string} token Ascendon token.
   */
  getEntitlement(token) {
    return new Promise(async (resolve, reject) => {
      try {
        const response = await http.get({
          uri: `https://f1tv.${HOST}/1.0/R/ENG/WEB_DASH/ALL/USER/ENTITLEMENT`,
          headers: {
            ascendontoken: token
          }
        });
        const { resultObj } = JSON.parse(response);
        resolve(resultObj.entitlementToken);
      } catch (error) {
        reject(error.message);
      }
    });
  }



  /**
   * @param {object[]} items
   * @returns {Promise}
   */
  indexContent(items) {
    return new Promise(async (resolve, reject) => {
      if (!fs.existsSync(OUT_FILE_PATH)) {
        fs.writeFileSync(OUT_FILE_PATH, "[]");
      }
      for (const i in items) {
        const container = items[i];
        const { retrieveItems } = container;
        const { resultObj } = retrieveItems || {};
        const { containers } = resultObj || {};
        if (Array.isArray(containers)) {
          this.indexContent(containers);
        } else if (items[i].layout === "CONTENT_ITEM") {
          const result = new F1tvContent(items[i]);
          result.actions = [];
          for (const { uri, targetType } of items[i].actions) {
            result.actions.push({ uri, type: targetType });
          }
          const out = JSON.parse(fs.readFileSync(OUT_FILE_PATH));
          out.push(result);
          fs.writeFileSync(OUT_FILE_PATH, JSON.stringify(out, null, 2));
        }
      }
      resolve();
    });
  }


  /**
   * @returns {Promise}
   */
  applyContent() {
    return new Promise(async (resolve, reject) => {
      const items = JSON.parse(fs.readFileSync(OUT_FILE_PATH));
      for (const item of items) {
        if (item.type !== "BUNDLE" && item.type !== "LAUNCHER") continue;
        for (const { uri } of item.actions) {
          try {
            const endpoint = `https://f1tv.${HOST}${uri}`;
            console.log(endpoint);
            const response = await http.get({ uri: endpoint });
            const { resultObj } = JSON.parse(response) || {};
            const { containers } = resultObj || {};
            if (Array.isArray(containers)) {
              for (const container of containers) {
                const retrieveItems2 = container.retrieveItems || {};
                const resultObj2 = retrieveItems2.resultObj || {};
                const containers2 = resultObj2.containers || {};
                if (Array.isArray(containers2)) {
                  for (const container2 of containers2) {
                    const result = new F1tvContent(container2);
                    if (result.type === "VIDEO") {
                      result.actions = [];
                    }
                    const out = JSON.parse(fs.readFileSync(OUT_FILE_PATH));
                    out.push(result);
                    fs.writeFileSync(OUT_FILE_PATH, JSON.stringify(out, null, 2));
                  }
                }
              }
            }
          } catch (error) {
            console.log(`Failure at ${item.id}`, error.message);
            continue;
          }
        }
      }
      resolve();
    });
  }


  /**
   * @returns {Promise}
   */
  pruneContent() {
    return new Promise(async (resolve, reject) => {
      const out = JSON.parse(fs.readFileSync(OUT_FILE_PATH));
      const items = [];
      for (const item of out) {
        if (item.type !== "BUNDLE" && item.type !== "LAUNCHER") {
          items.push(item);
        }
      }
      fs.writeFileSync(OUT_FILE_PATH, JSON.stringify(items, null, 2));
      resolve();
    });
  }

}



function formatContainer1(data) {
  data.label = data.metadata.label;
  data.endpoint = data.actions[0].uri;
  delete data.layout;
  delete data.actions;
  delete data.metadata;
  delete data.totalDepth;
  delete data.translations;
  return data;
}


function formatContainer2(data) {
  data.label = (data.metadata || { label: null }).label;
  data.items = data.retrieveItems ? data.retrieveItems.resultObj.containers : [];
  delete data.layout;
  delete data.actions;
  delete data.metadata;
  delete data.translations;
  delete data.retrieveItems;
  return data;
}



module.exports = F1tvClient;