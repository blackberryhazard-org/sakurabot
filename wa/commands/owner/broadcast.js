const moment = require("moment-timezone");

module.exports = {
    name: "broadcast",
    aliases: ["bc"],
    category: "owner",
    code: async (sock, m, helpers) => {
        const { ctx, userAccess, ruleEngine, db } = helpers;
        if (!userAccess.isOwner(ctx.sender)) return;

        const text = ctx.text;
        if (!text) return ctx.reply("❌ Please provide a message to broadcast.");

        // Get all chats from Baileys store or DB if available.
        // In this implementation, we might need to fetch from db.get("users") or similar.
        const users = db.get("users") || [];
        const groups = Object.keys(db.get("groups") || {});
        const targets = [...new Set([...users, ...groups])];

        const ruleContext = {
            platform: "wa",
            userId: ctx.sender,
            isOwner: true,
            text: text,
            targetCount: targets.length,
            helpers
        };

        const results = await ruleEngine.evaluate("onCommand", ruleContext);
        const broadcastResult = results.find(r => r.rule === "broadcast");

        if (broadcastResult && broadcastResult.action === "broadcast") {
            const finalMessage = broadcastResult.payload;
            ctx.reply(`📣 Broadcasting to ${targets.length} targets...`);

            let success = 0;
            let failure = 0;

            for (const targetId of targets) {
                try {
                    await sock.sendMessage(targetId, { text: finalMessage });
                    success++;
                } catch (e) {
                    failure++;
                }
                // Rate limiting
                await new Promise(resolve => setTimeout(resolve, 500));
            }

            ctx.reply(`✅ Broadcast finished.\nSuccess: ${success}\nFailure: ${failure}`);
        }
    }
};
