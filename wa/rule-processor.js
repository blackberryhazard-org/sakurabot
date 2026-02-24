module.exports = async (sock, m, body, from, sender, services, config, helpers) => {
    const { ruleEngine, userAccess } = services;
    if (!m.message || from === "status@broadcast" || (m.key && m.key.fromMe)) return false;

    const isGroup = from.endsWith("@g.us");
    let isAdmin = false;
    let isBotAdmin = false;

    if (isGroup) {
        try {
            const metadata = await sock.groupMetadata(from);
            const participants = metadata.participants;
            const user = participants.find(p => p.id === sender);
            isAdmin = user && (user.admin === "admin" || user.admin === "superadmin");

            const bot = participants.find(p => p.id === sock.user.id.split(":")[0] + "@s.whatsapp.net" || p.id === sock.user.id);
            isBotAdmin = bot && (bot.admin === "admin" || bot.admin === "superadmin");
        } catch (e) {
            // Ignored
        }
    }

    const ruleContext = {
        platform: "wa",
        chatId: from,
        userId: sender,
        text: body,
        msg: m,
        isAdmin,
        isBotAdmin,
        isOwner: userAccess.isOwner(sender),
        botId: sock.user.id,
        helpers: { ...helpers, db: services.db },
        config
    };

    const results = await ruleEngine.evaluate("onMessage", ruleContext);

    for (const result of results) {
        if (result.action === "delete") {
            if (isBotAdmin) {
                try {
                    await sock.sendMessage(from, { delete: m.key });
                    if (result.reply) await sock.sendMessage(from, { text: result.reply }, { quoted: m });
                } catch (e) {
                    // Ignored
                }
            }
            return true; // Stop processing
        } else if (result.action === "reply") {
            await sock.sendMessage(from, { text: result.text }, { quoted: m });

            if (result.rule === "auto-levelup" && result.updateLevel) {
                const levelData = services.db.get("level") || {};
                levelData[sender] = result.updateLevel;
                services.db.set("level", levelData);
            }
        }
    }

    return false;
};
