const pkg = require("./package.json");
const fs = require("node:fs");
const http = require("node:http");
const path = require("node:path");
const { Consolefy } = require("consolefy");

class Config {
    constructor(filePath) {
        const data = JSON.parse(fs.readFileSync(filePath, "utf-8"));
        Object.assign(this, data);
    }
}

const Formatter = {
    bold: (text) => `*${text}*`,
    italic: (text) => `_${text}_`,
    inlineCode: (text) => `\`${text}\``,
    monospace: (text) => `\`\`\`${text}\`\`\``,
};

global.botStartTime = Date.now();
const tools = require("./tools/exports.js");

Object.assign(global, {
    config: new Config(path.resolve(__dirname, "config.json")),
    consolefy: new Consolefy({
        tag: pkg.name
    }),
    formatter: Formatter,
    tools: tools,
    formatUptime: tools.utils.formatUptime,
    escapeHTML: tools.utils.escapeHTML,
    botStatus: {
        wa: false,
        tg: false
    }
});

process.on('uncaughtException', (err) => {
    consolefy.error('Uncaught Exception:', err.message);
});

process.on('unhandledRejection', (err) => {
    consolefy.error('Unhandled Rejection:', err.message || err);
});

consolefy.info("Starting...");

if (config.system && config.system.useServer) {
    const port = config.system.port;
    http.createServer((_, res) => res.end(`${pkg.name} berjalan di port ${port}`)).listen(port, "0.0.0.0", () => consolefy.success(`${pkg.name} runs on port ${port}`));
}

const isWaBotConfigValid = config.bot && config.bot.phoneNumber && config.bot.phoneNumber !== "YOUR_PHONE_NUMBER";
const isTgBotConfigValid = config.bot && config.bot.botfather_token && config.bot.botfather_token !== "YOUR_BOTFATHER_TOKEN";

if (isWaBotConfigValid) {
    try {
        const startWaBot = require("./wa/index.js");
        startWaBot();
        global.botStatus.wa = true;
    } catch (error) {
        consolefy.error("Failed to start WhatsApp bot:", error);
    }
} else {
    consolefy.warn("WhatsApp bot configuration is missing or invalid. Skipping...");
}

if (isTgBotConfigValid) {
    try {
        const { launchTelegramBot } = require("./tg/index.js");
        launchTelegramBot();
        global.botStatus.tg = true;
    } catch (error) {
        consolefy.error("Failed to start Telegram bot:", error);
    }
} else {
    consolefy.warn("Telegram bot configuration is missing or invalid. Skipping...");
}

if (!isWaBotConfigValid && !isTgBotConfigValid) {
    consolefy.error("Both WhatsApp and Telegram bot configurations are invalid. Exiting...");
}
