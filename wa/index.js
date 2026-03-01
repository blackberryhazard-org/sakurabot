const {
    default: makeWASocket,
    useMultiFileAuthState,
    DisconnectReason,
    fetchLatestBaileysVersion,
    makeCacheableSignalKeyStore
} = require("@whiskeysockets/baileys");
const pino = require("pino");
const { Boom } = require("@hapi/boom");
const path = require("path");
const fs = require("fs");
const handler = require("./handler");

// Import Services & Shared DB
const CooldownService = require("../src/services/cooldown.service");
const { getDb } = require("../src/database");
const UserAccessService = require("../src/services/user-access.service");
const EconomyService = require("../src/services/economy.service");
const InventoryService = require("../src/services/inventory.service");
const LinkingService = require("../src/services/linking.service");
const GameService = require("../src/services/game.service");
const MiningService = require("../src/services/mining.service");
const RuleEngineService = require("../src/services/rule-engine.service");
// eslint-disable-next-line no-unused-vars
const levelling = require("../src/services/levelling");
const items = InventoryService.items_erekir;

const db = getDb("wa");
const tgDb = getDb("tg");

// Initialize database keys
const keys = ["users", "premium", "managers", "sakuranite", "inventory", "last_daily", "links", "mining_tickets", "mining_rate"];
keys.forEach(key => {
    if (!db.has(key)) db.set(key, (key === "sakuranite" || key === "inventory" || key === "last_daily" || key === "links" || key === "mining_tickets" || key === "mining_rate") ? {} : []);
});

const userCooldowns = new CooldownService();

const waBot = {
    cmd: new Map(),
    games: new Map(),
    sessions: new Map()
};

const loadCommands = (dir, consolefy) => {
    const files = fs.readdirSync(dir, { withFileTypes: true });
    for (const file of files) {
        const fullPath = path.join(dir, file.name);
        if (file.isDirectory()) loadCommands(fullPath, consolefy);
        else if (file.name.endsWith(".js")) {
            try {
                const command = require(fullPath);
                if (command.name) {
                    command.category = path.basename(dir);
                    waBot.cmd.set(command.name, command);
                    if (command.aliases) command.aliases.forEach(alias => waBot.cmd.set(alias, command));
                }
            } catch (e) {
                if (consolefy && consolefy.error) consolefy.error(`Error loading command from ${fullPath}:`, e);
                else console.error(`Error loading command from ${fullPath}:`, e);
            }
        }
    }
};

let reconnectCount = 0;
global.waReconnectTimeout = null;

const startWaBot = async (config, consolefy, tools) => {
    const appConfig = config || global.config;
    const appConsolefy = consolefy || global.consolefy;
    const appTools = tools || global.tools;

    if (global.waReconnectTimeout) {
        clearTimeout(global.waReconnectTimeout);
        global.waReconnectTimeout = null;
    }

    loadCommands(path.resolve(__dirname, "commands"), appConsolefy);

    const userAccess = new UserAccessService(db, appConfig);
    const economy = new EconomyService(db, global.auditLog);
    const tgEconomy = new EconomyService(tgDb, global.auditLog);
    const inventoryService = new InventoryService(db);
    const linking = new LinkingService(tgDb, db, tgEconomy, economy);
    const gameService = new GameService(economy);
    const miningService = new MiningService(economy, inventoryService);
    const ruleEngine = new RuleEngineService(db, global.auditLog, appConfig);

    const statePath = path.resolve(__dirname, "../state");
    const { state, saveCreds } = await useMultiFileAuthState(statePath);
    const { version } = await fetchLatestBaileysVersion();
    const sock = makeWASocket({
        version,
        logger: pino({ level: "silent" }),
        printQRInTerminal: !appConfig.wabot.usePairingCode,
        auth: { creds: state.creds, keys: makeCacheableSignalKeyStore(state.keys, pino({ level: "silent" })) },
        browser: ["Ubuntu", "Chrome", "20.0.04"]
    });

    if (appConfig.wabot.usePairingCode && !sock.authState.creds.registered) {
        const phoneNumber = appConfig.wabot.phoneNumber;
        if (phoneNumber) {
            setTimeout(async () => {
                try {
                    let code = await sock.requestPairingCode(phoneNumber, appConfig.wabot.customPairingCode);
                    code = code?.match(/.{1,4}/g)?.join("-") || code;
                    if (appConsolefy && appConsolefy.info) appConsolefy.info(`Pairing Code: ${code}`);
                    else console.log(`Pairing Code: ${code}`);
                } catch (e) {
                    if (appConsolefy && appConsolefy.error) appConsolefy.error("Failed to request pairing code:", e.message);
                }
            }, 3000);
        }
    }

    sock.ev.on("creds.update", saveCreds);
    sock.ev.on("connection.update", async (update) => {
        const { connection, lastDisconnect } = update;
        if (connection === "close") {
            global.botStatus.wa = false;
            const error = lastDisconnect.error;
            const statusCode = (error instanceof Boom) ? error.output.statusCode : error?.code;

            let shouldReconnect = true;
            let reason = error ? error.toString() : "Unknown reason";

            if (statusCode === DisconnectReason.loggedOut) {
                shouldReconnect = false;
                reason = "Logged out, please scan again.";
            } else if (statusCode === DisconnectReason.badSession) {
                reason = "Bad session, clearing state...";
                fs.rmSync(statePath, { recursive: true, force: true });
            }

            const isBadMac = error?.message?.includes("Bad MAC") || error?.stack?.includes("Bad MAC");
            const isConnFailure = error?.message?.includes("Connection Failure") || error?.stack?.includes("Connection Failure");

            if (isBadMac) {
                reason = "Bad MAC detected, stopping bot...";
                shouldReconnect = false;
                fs.rmSync(statePath, { recursive: true, force: true });
            }

            if (isConnFailure) {
                reason = "Connection Failure detected, stopping bot...";
                shouldReconnect = false;
            }

            if (appConsolefy && appConsolefy.error) appConsolefy.error(`Connection closed: ${reason}. Reconnecting: ${shouldReconnect}`);
            else console.error(`Connection closed: ${reason}. Reconnecting: ${shouldReconnect}`);

            if (shouldReconnect) {
                reconnectCount++;
                const delay = Math.min(reconnectCount * 5000, 30000); // Max 30s delay
                if (appConsolefy && appConsolefy.info) appConsolefy.info(`Attempting to reconnect in ${delay / 1000}s (Attempt ${reconnectCount})`);
                global.waReconnectTimeout = setTimeout(() => startWaBot(appConfig, appConsolefy, appTools), delay);
            } else {
                global.botStatus.wa = false;
                // If it's a fatal error, we might want to stop the process or at least stop trying.
            }
        } else if (connection === "open") {
            if (global.waReconnectTimeout) {
                clearTimeout(global.waReconnectTimeout);
                global.waReconnectTimeout = null;
            }
            reconnectCount = 0;
            if (appConsolefy && appConsolefy.success) appConsolefy.success("WhatsApp bot connected!");
            else console.log("WhatsApp bot connected!");
            global.botStatus.wa = true;
            global.waSock = sock;
            global.waBot = waBot;
        }
    });

    sock.ev.on("messages.upsert", async (chatUpdate) => {
        try {
            const m = chatUpdate.messages[0];
            if (!m.message || m.key.fromMe) return;
            const services = { userAccess, economy, inventory: inventoryService, linking, cooldown: userCooldowns, game: gameService, mining: miningService, ruleEngine: ruleEngine };
            await handler(sock, m, db, waBot, items, services, appConfig, appTools, appConsolefy);
        } catch (err) {
            if (appConsolefy && appConsolefy.error) appConsolefy.error(err);
            else console.error(err);
        }
    });
    return sock;
};

module.exports = startWaBot;
