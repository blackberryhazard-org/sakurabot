module.exports = {
    name: "mining",
    category: "user",
    description: "Mine items or upgrade your mining rate.",
    code: async (ctx, { items, mining }) => {
        const userId = ctx.from.id;
        const args = ctx.message.text.split(" ").slice(1);

        if (args[0] === "upgrade") {
            const result = mining.upgrade(userId);
            if (!result.success) {
                return ctx.reply(result.message);
            }
            return ctx.reply(`✅ Success! Your mining rate has been upgraded to <b>${result.nextRate}</b>.`, { parse_mode: "HTML" });
        }

        const itemName = args[0];
        if (!itemName || !items[itemName]) {
            let text = "<b>⛏️ MINING SYSTEM</b>\n\n";
            text += "Usage: /mining {item} or /mining upgrade\n\n";
            text += "<b>Available Items:</b>\n";
            for (const [name, price] of Object.entries(items)) {
                const cost = price >= 500 ? 2 : 1;
                text += `➛ <b>${name}</b>: ${cost} Tiket\n`;
            }
            text += `\nYour Rate: <b>${mining.getRate(userId)}</b>\n`;
            text += `Your Tickets: <b>${mining.getTickets(userId)}</b>`;
            return ctx.reply(text, { parse_mode: "HTML" });
        }

        const result = mining.startMining(userId, itemName, items);
        if (!result.success) {
            return ctx.reply(result.message);
        }

        ctx.reply(`⛏️ Mining <b>${itemName}</b>... please wait 60 seconds.`, { parse_mode: "HTML" });

        setTimeout(async () => {
            mining.completeMining(userId, itemName, result.amount);
            try {
                await ctx.reply(`✅ Mining finished! You gained <b>${result.amount}x ${itemName}</b>.`, { parse_mode: "HTML", reply_to_message_id: ctx.message.message_id });
            } catch (_e) {
                await ctx.reply(`✅ Mining finished! You gained <b>${result.amount}x ${itemName}</b>.`, { parse_mode: "HTML" });
            }
        }, 60000);
    }
};
