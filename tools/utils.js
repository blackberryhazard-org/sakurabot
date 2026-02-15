const util = require("node:util");

const formatUptime = (startTime) => {
    const uptime = Date.now() - startTime;
    const seconds = Math.floor((uptime / 1000) % 60);
    const minutes = Math.floor((uptime / (1000 * 60)) % 60);
    const hours = Math.floor((uptime / (1000 * 60 * 60)) % 24);
    const days = Math.floor(uptime / (1000 * 60 * 60 * 24));
    return `${days}d ${hours}h ${minutes}m ${seconds}s`;
};

const escapeHTML = (text) => {
    if (!text) return "";
    return text.toString()
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
};

const APIs = {
    turu: {
        baseURL: "https://mending-turu.web.id"
    },
    iyayn: {
        baseURL: "https://api.iyayn.web.id"
    },
    bagus: {
        baseURL: "https://api.baguss.xyz"
    },
    deline: {
        baseURL: "https://api.deline.web.id"
    },
    gemini_antidonasi: {
        baseURL: "https://gemini.antidonasi.web.id"
    },
    nekolabs: {
        baseURL: "https://api.nekolabs.web.id"
    },
    yp: {
        baseURL: "https://api.yupra.my.id"
    },
    zell: {
        baseURL: "https://zellapi.autos"
    },
    znx: {
        baseURL: "https://api.zenitsu.web.id"
    }
};

function createUrl(apiNameOrURL, endpoint, params = {}, apiKeyParamName) {
    try {
        const api = APIs[apiNameOrURL];
        if (!api) {
            const url = new URL(apiNameOrURL);
            apiNameOrURL = url;
        }

        const queryParams = new URLSearchParams(params);
        if (apiKeyParamName && api && "APIKey" in api) queryParams.set(apiKeyParamName, api.APIKey);

        const baseURL = api ? api.baseURL : apiNameOrURL.origin;
        const apiUrl = new URL(endpoint, baseURL);
        apiUrl.search = queryParams.toString();

        return apiUrl.toString();
    } catch (error) {
        consolefy.error(`Error: ${util.format(error)}`);
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
