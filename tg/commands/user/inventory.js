module.exports = {
    name: "inventory",
    aliases: ["inv"],
    category: "user",
    description: "Check your inventory.",
    code: async (ctx, { db, escapeHTML }) => {
        const userId = ctx.from.id;
        const inventory =  (db.get("inventory") || {})[userId] || {};

        if (Object.keys(inventory).length === 0) {
            return ctx.reply("Your inventory is empty.", { parse_mode: "HTML" });
        }

        let text = `<b>📦 Inventory of ${escapeHTML(ctx.from.first_name)}</b>\n\n`;
        for (const [item, amount] of Object.entries(inventory)) {
            text += `➛ <b>${item}</b>: ${amount}\n`;
        }

        ctx.reply(text, { parse_mode: "HTML" });
    }
};
