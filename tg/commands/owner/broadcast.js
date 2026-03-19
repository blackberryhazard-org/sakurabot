const moment = require("moment-timezone");

module.exports = {
    name: "broadcast",
    aliases: ["bc"],
    category: "owner",
    code: async (ctx, helpers) => {
        const { userAccess, db } = helpers;
        if (!userAccess.isOwner(ctx.from.id)) return;

        const args = ctx.message.text.split(" ").slice(1).join(" ");
        if (!args) return ctx.reply("❌ Please provide a message to broadcast.");

        const groups = db.get("groups") || [];
        const channels = db.get("channels") || [];
        const users = db.get("users") || [];
        const targets = [...new Set([...groups, ...channels, ...users])];

        const time = moment().tz("Asia/Jakarta").format("YYYY-MM-DD HH:mm:ss");
        const footer = "\n\n––––––『 <b>BROADCAST</b> 』––––––\nDate: " + time;
        const finalMessage = args + footer;

        ctx.reply(`📣 Broadcasting to ${targets.length} targets...`);

        let success = 0;
        let failure = 0;

        for (const targetId of targets) {
            try {
                await ctx.telegram.sendMessage(targetId, finalMessage, { parse_mode: "HTML" });
                success++;
            } catch (e) {
                failure++;
            }
            // Rate limiting protection
            await new Promise(resolve => setTimeout(resolve, 50));
        }

        ctx.reply(`✅ Broadcast finished.\nSuccess: ${success}\nFailure: ${failure}`);
    }
};
