module.exports = {
    name: 'redeem',
    category: 'tool',
    description: 'Redeem a code for rewards.',
    code: async (ctx, { isOwner, updateCoins, getCoins, updateGachaTickets, getGachaTickets, updateSakuranite, getSakuranite, db, config }) => {
        const userId = ctx.from.id;
        const args = ctx.message.text.split(' ').slice(1);
        if (args.length === 0) {
            return ctx.reply('Usage: /redeem {code}');
        }

        const code = args[0].toUpperCase();
        const redeemCodes = db.get('redeem_codes') || {};

        if (!redeemCodes[code]) {
            return ctx.reply('Invalid redeem code.');
        }

        const codeData = redeemCodes[code];
        const now = Date.now();

        if (now > codeData.expiration) {
            return ctx.reply('This redeem code has expired.');
        }

        if (codeData.claimed_by.includes(userId)) {
            return ctx.reply('You have already claimed this redeem code.');
        }

        if (codeData.claimed_by.length >= codeData.quota) {
            return ctx.reply('This redeem code has reached its quota.');
        }

        // Apply reward
        let rewardText = '';
        if (codeData.type === 'coins') {
            const sakuraniteReward = codeData.amount * 100;
            if (!isOwner(userId)) {
                updateSakuranite(userId, getSakuranite(userId) + sakuraniteReward);
            }
            rewardText = `${sakuraniteReward} Sakuranite${isOwner(userId) ? ' (Hanya untuk User)' : ''}`;
        } else if (codeData.type === 'sakuranite') {
            if (!isOwner(userId)) {
                updateSakuranite(userId, getSakuranite(userId) + codeData.amount);
            }
            rewardText = `${codeData.amount} Sakuranite${isOwner(userId) ? ' (Hanya untuk User)' : ''}`;
        } else if (codeData.type === 'gacha') {
            updateGachaTickets(userId, getGachaTickets(userId) + codeData.amount);
            rewardText = `${codeData.amount} Gacha Tickets`;
        } else {
            return ctx.reply('Unknown reward type in redeem code.');
        }

        // Mark as claimed
        codeData.claimed_by.push(userId);
        db.set('redeem_codes', redeemCodes);

        ctx.reply(`Successfully redeemed code! You received ${rewardText}.`);

        // Notify newsletter channel if configured
        if (config.bot.tg_newsletterid) {
            try {
                const msg = await ctx.telegram.sendMessage(config.bot.tg_newsletterid, `User ${ctx.from.first_name} has redeemed code \`${code}\` and received ${rewardText}.`);
                // Optional: delete after 5 seconds as per memory
                setTimeout(() => {
                    ctx.telegram.deleteMessage(config.bot.tg_newsletterid, msg.message_id).catch(() => {});
                }, 5000);
            } catch (e) {
                console.error('Failed to send redeem notification:', e);
            }
        }
    }
};
