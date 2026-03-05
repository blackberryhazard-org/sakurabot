const util = require("node:util");
const sawitUtils = require("sawit-utils");
const formatUptime = sawitUtils.formatUptime;
const escapeHTML = sawitUtils.escapeHTML;

const APIs = {
    turu: { baseURL: "https://mending-turu.web.id" },
    iyayn: { baseURL: "https://api.iyayn.web.id" },
    bagus: { baseURL: "https://api.baguss.xyz" },
    deline: { baseURL: "https://api.deline.web.id" },
    gemini_antidonasi: { baseURL: "https://gemini.antidonasi.web.id" },
    nekolabs: { baseURL: "https://api.nekolabs.web.id" },
    yp: { baseURL: "https://api.yupra.my.id" },
    zell: { baseURL: "https://zellapi.autos" },
    znx: { baseURL: "https://api.zenitsu.web.id" }
};

function createUrl(apiNameOrURL, endpoint, params = {}, apiKeyParamName) {
    try {
        const api = APIs[apiNameOrURL];
        let baseURL;
        if (api) {
            baseURL = api.baseURL;
        } else {
            const url = new URL(apiNameOrURL);
            baseURL = url.origin;
        }

        const queryParams = new URLSearchParams(params);
        if (apiKeyParamName && api && "APIKey" in api) queryParams.set(apiKeyParamName, api.APIKey);

        const apiUrl = new URL(endpoint, baseURL);
        apiUrl.search = queryParams.toString();

        return apiUrl.toString();
    } catch (error) {
        if (typeof consolefy !== "undefined" && consolefy.error) consolefy.error(`Error: ${util.format(error)}`); else console.error(`Error: ${util.format(error)}`);
        return null;
    }
}

function listUrl() {
    return APIs;
}

module.exports = {
    formatUptime,
    escapeHTML,
    createUrl,
    listUrl
};
