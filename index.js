require("esbuild-register");
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
const tools = require("./src/exports.js");

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
    global.consolefy.error("Uncaught Exception:", err.message);
});

process.on("unhandledRejection", (err) => {
    global.consolefy.error("Unhandled Rejection:", err.message || err);
});

// Bot Managers
global.botManagers = {
    startWa: async () => {
        const isWaBotConfigValid = global.config.bot && global.config.bot.phoneNumber && !global.config.bot.phoneNumber.startsWith("YOUR_");
        if (isWaBotConfigValid) {
            try {
                const startWaBot = require("./wa/index.js");
                await startWaBot(global.config, global.consolefy, global.tools);
            } catch (error) {
                global.consolefy.error("Failed to start WhatsApp bot:", error);
                global.botStatus.wa = false;
            }
        } else {
            global.consolefy.warn("WhatsApp bot configuration is missing or invalid.");
            global.botStatus.wa = false;
        }
    },
    stopWa: async () => {
        if (global.waReconnectTimeout) {
            clearTimeout(global.waReconnectTimeout);
            global.waReconnectTimeout = null;
        }
        if (global.waSock) {
            try {
                global.waSock.ev.removeAllListeners();
                global.waSock.end();
                global.waSock = null;
                global.botStatus.wa = false;
                global.consolefy.info("WhatsApp bot stopped.");
            } catch (error) {
                global.consolefy.error("Error stopping WhatsApp bot:", error);
            }
        } else {
            global.botStatus.wa = false;
            global.consolefy.info("WhatsApp bot stopped (was not connected).");
        }
    },
    startTg: async () => {
        const isTgBotConfigValid = global.config.bot && global.config.bot.botfather_token && !global.config.bot.botfather_token.startsWith("YOUR_");
        if (isTgBotConfigValid) {
            try {
                const { launchTelegramBot } = require("./tg/index.js");
                await launchTelegramBot(global.config, global.consolefy, global.tools);
            } catch (error) {
                global.consolefy.error("Failed to start Telegram bot:", error);
                global.botStatus.tg = false;
            }
        } else {
            global.consolefy.warn("Telegram bot configuration is missing or invalid.");
            global.botStatus.tg = false;
        }
    },
    stopTg: async () => {
        if (global.tgBot) {
            try {
                await global.tgBot.stop();
                global.tgBot = null;
                global.botStatus.tg = false;
                global.consolefy.info("Telegram bot stopped.");
            } catch (error) {
                global.consolefy.error("Error stopping Telegram bot:", error);
            }
        } else {
            global.botStatus.tg = false;
            global.consolefy.info("Telegram bot stopped (was not connected).");
        }
    }
};

// Parse arguments
const args = process.argv.slice(2);
const waOnly = args.includes("--wa-only");
const tgOnly = args.includes("--tg-only");
const runWebDashboard = args.includes("--run-web-dashboard");

let runWa = true;
let runTg = true;

if (waOnly) {
    runTg = false;
    global.consolefy.info("Mode: WhatsApp Only");
} else if (tgOnly) {
    runWa = false;
    global.consolefy.info("Mode: Telegram Only");
}

global.consolefy.info("Starting...");

if (global.config.system && global.config.system.useServer) {
    const port = global.config.system.port;
    http.createServer((_, res) => res.end(`${pkg.name} berjalan di port ${port}`)).listen(port, "0.0.0.0", () => global.consolefy.success(`${pkg.name} runs on port ${port}`));
}

if (runWebDashboard) {
    const dashboardPort = global.config.system.webDashboardPort || 5000;
    const { startDashboard } = require("./dash/index.js");
    startDashboard(dashboardPort);
}

if (runWa) {
    global.botManagers.startWa();
}

if (runTg) {
    global.botManagers.startTg();
}

const isWaBotConfigValid = global.config.bot && global.config.bot.phoneNumber && !global.config.bot.phoneNumber.startsWith("YOUR_");
const isTgBotConfigValid = global.config.bot && global.config.bot.botfather_token && !global.config.bot.botfather_token.startsWith("YOUR_");

if (!isWaBotConfigValid && !isTgBotConfigValid) {
    global.consolefy.error("Both WhatsApp and Telegram bot configurations are invalid. Check your config.json");
}
