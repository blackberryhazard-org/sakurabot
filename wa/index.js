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

const startWaBot = async (config, consolefy, tools) => {
    // Re-verify if needed, but we trust the injection
    const appConfig = config || global.config;
    const appConsolefy = consolefy || global.consolefy;
    const appTools = tools || global.tools;

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
        printQRInTerminal: !appConfig.system.usePairingCode,
        auth: { creds: state.creds, keys: makeCacheableSignalKeyStore(state.keys, pino({ level: "silent" })) },
        browser: ["Ubuntu", "Chrome", "20.0.04"]
    });

    if (appConfig.system.usePairingCode && !sock.authState.creds.registered) {
        const phoneNumber = appConfig.bot.phoneNumber;
        if (phoneNumber) {
            setTimeout(async () => {
                let code = await sock.requestPairingCode(phoneNumber, appConfig.system.customPairingCode);
                code = code?.match(/.{1,4}/g)?.join("-") || code;
                if (appConsolefy && appConsolefy.info) appConsolefy.info(`Pairing Code: ${code}`);
                else console.log(`Pairing Code: ${code}`);
            }, 3000);
        }
    }

    sock.ev.on("creds.update", saveCreds);
    sock.ev.on("connection.update", (update) => {
        const { connection, lastDisconnect } = update;
        if (connection === "close") {
            const error = (lastDisconnect.error instanceof Boom) ? lastDisconnect.error : lastDisconnect.error;
            const statusCode = error?.output?.statusCode;
            const shouldReconnect = statusCode !== DisconnectReason.loggedOut;

            const isBadMac = error?.message?.includes("Bad MAC") || error?.stack?.includes("Bad MAC");

            if (isBadMac) {
                if (appConsolefy && appConsolefy.error) appConsolefy.error("Bad MAC detected! Clearing session state...");
                fs.rmSync(statePath, { recursive: true, force: true });
                startWaBot(appConfig, appConsolefy, appTools);
                return;
            }

            const errorMsg = `Connection closed due to ${lastDisconnect.error}, reconnecting: ${shouldReconnect}`;
            if (appConsolefy && appConsolefy.error) appConsolefy.error(errorMsg);
            else console.error(errorMsg);

            if (shouldReconnect) startWaBot(appConfig, appConsolefy, appTools);
        } else if (connection === "open") {
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
