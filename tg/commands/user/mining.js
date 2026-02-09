const moment = require('moment-timezone');

module.exports = {
    name: 'mining',
    category: 'user',
    description: 'Mine items or upgrade your mining rate.',
    code: async (ctx, { db, items, getMiningTickets, updateMiningTickets, getMiningRate, updateMiningRate }) => {
        const userId = ctx.from.id;
        const args = ctx.message.text.split(' ').slice(1);

        if (args[0] === 'upgrade') {
            const currentRate = getMiningRate(userId);
            let nextRate, cost;

            if (currentRate < 0.25) {
                nextRate = 0.25;
                cost = 5;
            } else if (currentRate < 0.50) {
                nextRate = 0.50;
                cost = 10;
            } else {
                return ctx.reply('Your mining rate is already at the maximum (0.50).');
            }

            const tickets = getMiningTickets(userId);
            if (tickets < cost) {
                return ctx.reply(`You need ${cost} Mining Tickets to upgrade to ${nextRate} rate. You have ${tickets}.`);
            }

            updateMiningTickets(userId, tickets - cost);
            updateMiningRate(userId, nextRate);

            return ctx.reply(`✅ Success! Your mining rate has been upgraded to <b>${nextRate}</b>.`, { parse_mode: 'HTML' });
        }

        const itemName = args[0];
        if (!itemName || !items[itemName]) {
            let text = '<b>⛏️ MINING SYSTEM</b>\n\n';
            text += 'Usage: /mining {item} or /mining upgrade\n\n';
            text += '<b>Available Items:</b>\n';
            for (const [name, price] of Object.entries(items)) {
                const cost = price >= 500 ? 2 : 1;
                text += `➛ <b>${name}</b>: ${cost} Tiket\n`;
            }
            text += `\nYour Rate: <b>${getMiningRate(userId)}</b>\n`;
            text += `Your Tickets: <b>${getMiningTickets(userId)}</b>`;
            return ctx.reply(text, { parse_mode: 'HTML' });
        }

        const price = items[itemName];
        const ticketCost = price >= 500 ? 2 : 1;
        const tickets = getMiningTickets(userId);

        if (tickets < ticketCost) {
            return ctx.reply(`You need ${ticketCost} Mining Tickets to mine ${itemName}. You have ${tickets}.`);
        }

        updateMiningTickets(userId, tickets - ticketCost);
        const rate = getMiningRate(userId);
        const amount = Math.floor(rate * 60);

        ctx.reply(`⛏️ Mining <b>${itemName}</b>... please wait 60 seconds.`, { parse_mode: 'HTML' });

        setTimeout(async () => {
            const inventory = db.get(`inventory.${userId}`) || {};
            inventory[itemName] = (inventory[itemName] || 0) + amount;
            db.set(`inventory.${userId}`, inventory);

            try {
                await ctx.reply(`✅ Mining finished! You gained <b>${amount}x ${itemName}</b>.`, { parse_mode: 'HTML', reply_to_message_id: ctx.message.message_id });
            } catch (e) {
                await ctx.reply(`✅ Mining finished! You gained <b>${amount}x ${itemName}</b>.`, { parse_mode: 'HTML' });
            }
        }, 60000);
    }
};
