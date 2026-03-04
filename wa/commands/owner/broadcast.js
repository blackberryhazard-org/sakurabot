const moment = require("moment-timezone");

module.exports = {
    name: "broadcast",
    aliases: ["bc"],
    category: "owner",
    code: async (sock, m, helpers) => {
        const { ctx, userAccess, db } = helpers;
        if (!userAccess.isOwner(ctx.sender)) return;

        const text = ctx.text;
        if (!text) return ctx.reply("❌ Please provide a message to broadcast.");

        const users = db.get("users") || [];
        const groups = Object.keys(db.get("groups") || {});
        const targets = [...new Set([...users, ...groups])];

        const time = moment().tz("Asia/Jakarta").format("YYYY-MM-DD HH:mm:ss");
        const footer = "\n\n––––––『 *BROADCAST* 』––––––\nDate: " + time;
        const finalMessage = text + footer;

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
            await new Promise(resolve => setTimeout(resolve, 500));
        }

        ctx.reply(`✅ Broadcast finished.\nSuccess: ${success}\nFailure: ${failure}`);
    }
};
