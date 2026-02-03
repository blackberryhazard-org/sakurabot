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
const { Database } = require("simpl.db");
const handler = require("./handler");

// Database setup
const dbPath = path.resolve(__dirname, '../database/wa');
if (!fs.existsSync(dbPath)) fs.mkdirSync(dbPath, { recursive: true });

const db = new Database({
    dataFile: path.join(dbPath, 'database.json'),
    autoSave: true,
    tabSize: 2
});

const startWaBot = async () => {
    const { state, saveCreds } = await useMultiFileAuthState(path.resolve(__dirname, '../state'));
    const { version } = await fetchLatestBaileysVersion();

    const sock = makeWASocket({
        version,
        logger: pino({ level: "silent" }),
        printQRInTerminal: !config.system.usePairingCode,
        auth: {
            creds: state.creds,
            keys: makeCacheableSignalKeyStore(state.keys, pino({ level: "silent" })),
        },
        browser: ["Ubuntu", "Chrome", "20.0.04"]
    });

    if (config.system.usePairingCode && !sock.authState.creds.registered) {
        const phoneNumber = config.bot.phoneNumber;
        if (phoneNumber) {
            setTimeout(async () => {
                let code = await sock.requestPairingCode(phoneNumber, config.system.customPairingCode);
                code = code?.match(/.{1,4}/g)?.join("-") || code;
                consolefy.info(`Pairing Code: ${code}`);
            }, 3000);
        }
    }

    sock.ev.on("creds.update", saveCreds);

    sock.ev.on("connection.update", (update) => {
        const { connection, lastDisconnect } = update;
        if (connection === "close") {
            const shouldReconnect = (lastDisconnect.error instanceof Boom)?.output?.statusCode !== DisconnectReason.loggedOut;
            consolefy.error(`Connection closed due to ${lastDisconnect.error}, reconnecting: ${shouldReconnect}`);
            if (shouldReconnect) startWaBot();
        } else if (connection === "open") {
            consolefy.success("WhatsApp bot connected!");
            global.botStatus.wa = true;
        }
    });

    sock.ev.on("messages.upsert", async (chatUpdate) => {
        try {
            const m = chatUpdate.messages[0];
            if (!m.message) return;
            if (m.key.fromMe) return;

            // Call message handler
            await handler(sock, m, db);
        } catch (err) {
            consolefy.error(err);
        }
    });

    return sock;
};

module.exports = startWaBot;
