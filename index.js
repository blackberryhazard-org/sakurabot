const pkg = require("./package.json");
const fs = require("node:fs");
const http = require("node:http");
const path = require("node:path");
const { Consolefy } = require("consolefy");
const AuditLogService = require("./src/services/audit-log.service");

class Config {
    constructor(filePath) {
        if (!fs.existsSync(filePath)) {
            throw new Error(`Configuration file not found: ${filePath}`);
        }
        const data = JSON.parse(fs.readFileSync(filePath, "utf-8"));
        Object.assign(this, data);
        this.validate();
    }

    validate() {
        const required = [
            { path: "bot.prefix", label: "Prefix Bot" },
            { path: "owner.id_tele", label: "Telegram Owner ID" },
            { path: "owner.num_wa", label: "WhatsApp Owner Number" }
        ];

        const missing = [];
        for (const item of required) {
            const value = item.path.split(".").reduce((obj, key) => obj?.[key], this);
            if (!value || value.toString().startsWith("YOUR_")) {
                missing.push(item.label);
            }
        }

        if (missing.length > 0) {
            console.error("\x1b[31m[ERROR] Konfigurasi tidak valid atau belum diset:\x1b[0m");
            missing.forEach(m => console.error(` - ${m}`));
            console.error("\x1b[33mSilakan periksa config.json dan pastikan semua field wajib telah diisi.\x1b[0m");
            process.exit(1);
        }
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

try {
    const configPath = path.resolve(__dirname, "config.json");
    const appConfig = new Config(configPath);

    Object.assign(global, {
        config: appConfig,
        consolefy: new Consolefy({
            tag: pkg.name
        }),
        formatter: Formatter,
        tools: tools,
        formatUptime: tools.utils.formatUptime,
        auditLog: new AuditLogService(path.resolve(__dirname, "logs")),
        escapeHTML: tools.utils.escapeHTML,
        botStatus: {
            wa: false,
            tg: false
        }
    });
} catch (error) {
    console.error("Critical error during initialization:", error.message);
    process.exit(1);
}

process.on("uncaughtException", (err) => {
    consolefy.error("Uncaught Exception:", err.message);
});

process.on("unhandledRejection", (err) => {
    consolefy.error("Unhandled Rejection:", err.message || err);
});

consolefy.info("Starting...");

if (config.system && config.system.useServer) {
    const port = config.system.port;
    http.createServer((_, res) => res.end(`${pkg.name} berjalan di port ${port}`)).listen(port, "0.0.0.0", () => consolefy.success(`${pkg.name} runs on port ${port}`));
}

const isWaBotConfigValid = config.bot && config.bot.phoneNumber && !config.bot.phoneNumber.startsWith("YOUR_");
const isTgBotConfigValid = config.bot && config.bot.botfather_token && !config.bot.botfather_token.startsWith("YOUR_");

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
