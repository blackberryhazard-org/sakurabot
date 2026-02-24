const moment = require("moment-timezone");

module.exports = {
    name: "broadcast",
    aliases: ["bc"],
    category: "owner",
    code: async (ctx, helpers) => {
        const { userAccess, ruleEngine, db, auditLog } = helpers;
        if (!userAccess.isOwner(ctx.from.id)) return;

        const text = ctx.message.text.split(" ").slice(1).join(" ");
        if (!text) return ctx.reply("❌ Please provide a message to broadcast.");

        const groups = db.get("groups") || [];
        const channels = db.get("channels") || [];
        const users = db.get("users") || [];
        const targets = [...new Set([...groups, ...channels, ...users])];

        const ruleContext = {
            platform: "tg",
            userId: ctx.from.id.toString(),
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
                    await ctx.telegram.sendMessage(targetId, finalMessage, { parse_mode: "Markdown" });
                    success++;
                } catch (e) {
                    failure++;
                }
                // Rate limiting protection
                await new Promise(resolve => setTimeout(resolve, 50));
            }

            ctx.reply(`✅ Broadcast finished.\nSuccess: ${success}\nFailure: ${failure}`);
        }
    }
};
