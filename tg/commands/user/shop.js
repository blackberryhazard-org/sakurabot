module.exports = {
    name: 'shop',
    category: 'user',
    description: 'Sell your items for Sakuranite.',
    code: async (ctx, { db, updateSakuranite, getSakuranite, items }) => {
        const args = ctx.message.text.split(' ').slice(1);

        if (args[0] === 'sell') {
            const item = args[1];
            const amountStr = args[2] || '1';
            const amount = parseInt(amountStr);

            if (!item || !items[item]) {
                return ctx.reply(`Invalid item. Available items: ${Object.keys(items).join(', ')}`);
            }

            if (isNaN(amount) || amount <= 0) {
                return ctx.reply('Invalid amount.');
            }

            const userId = ctx.from.id;
            const inventory = db.get(`inventory.${userId}`) || {};
            const userAmount = inventory[item] || 0;

            if (userAmount < amount) {
                return ctx.reply(`You don't have enough ${item}.`);
            }

            const totalPay = items[item] * amount;

            // Update inventory
            inventory[item] -= amount;
            if (inventory[item] <= 0) delete inventory[item];
            db.set(`inventory.${userId}`, inventory);

            // Update Sakuranite
            updateSakuranite(userId, getSakuranite(userId) + totalPay);

            ctx.reply(`Successfully sold ${amount} ${item} for ${totalPay} Sakuranite.`);
        } else {
            let text = '<b>🛒 SHOP - SELL ITEMS</b>\n\n';
            for (const [item, price] of Object.entries(items)) {
                text += `➛ <b>${item}</b>: ${price} Sakuranite\n`;
            }
            text += '\nUsage: /shop sell {item} {amount}';
            ctx.reply(text, { parse_mode: 'HTML' });
        }
    }
};
