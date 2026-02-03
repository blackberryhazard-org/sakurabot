const pkg = require("./package.json");
const fs = require("node:fs");
const http = require("node:http");
const path = require("node:path");
const CFonts = require("cfonts");

// Replacement for @itsreimau/gktw utilities
class Config {
    constructor(filePath) {
        const data = JSON.parse(fs.readFileSync(filePath, "utf-8"));
        Object.assign(this, data);
    }
}

class Consolefy {
    constructor(opts) {
        this.tag = opts.tag;
    }
    log(...args) { console.log(`[${this.tag}]`, ...args); }
    error(...args) { console.error(`[${this.tag}]`, ...args); }
    warn(...args) { console.warn(`[${this.tag}]`, ...args); }
    success(...args) { console.log(`[${this.tag}] SUCCESS:`, ...args); }
    info(...args) { console.info(`[${this.tag}] INFO:`, ...args); }
}

const Formatter = {
    bold: (text) => `*${text}*`,
    italic: (text) => `_${text}_`,
    inlineCode: (text) => `\`${text}\``,
    monospace: (text) => `\`\`\`${text}\`\`\``,
};

global.botStartTime = Date.now();
global.formatUptime = (startTime) => {
    const uptime = Date.now() - startTime;
    const seconds = Math.floor((uptime / 1000) % 60);
    const minutes = Math.floor((uptime / (1000 * 60)) % 60);
    const hours = Math.floor((uptime / (1000 * 60 * 60)) % 24);
    const days = Math.floor(uptime / (1000 * 60 * 60 * 24));
    return `${days}d ${hours}h ${minutes}m ${seconds}s`;
};

Object.assign(global, {
    config: new Config(path.resolve(__dirname, "config.json")),
    consolefy: new Consolefy({
        tag: pkg.name
    }),
    formatter: Formatter,
    tools: require("./tools/exports.js"),
    botStatus: {
        wa: false,
        tg: false
    }
});

consolefy.log("Starting...");

CFonts.say(pkg.name, {
    colors: ["#00A1E0", "#00FFFF"],
    align: "center"
});
CFonts.say(`${pkg.description} - By ${pkg.author}`, {
    font: "console",
    colors: ["#E0F7FF"],
    align: "center"
});

if (config.system && config.system.useServer) {
    const port = config.system.port;
    http.createServer((_, res) => res.end(`${pkg.name} berjalan di port ${port}`)).listen(port, () => consolefy.success(`${pkg.name} runs on port ${port}`));
}

const isWaBotConfigValid = config.bot && config.bot.phoneNumber && config.bot.phoneNumber !== "YOUR_PHONE_NUMBER";
const isTgBotConfigValid = config.bot && config.bot.botfather_token && config.bot.botfather_token !== "YOUR_BOTFATHER_TOKEN";

if (isWaBotConfigValid) {
    try {
        const startWaBot = require("./wa/index.js");
        startWaBot();
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
