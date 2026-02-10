const moment = require('moment-timezone');

module.exports = {
    name: 'daily',
    category: 'user',
    code: async (ctx, { db, isOwner, getSakuranite, updateSakuranite, getGachaTickets, updateGachaTickets, getMiningTickets, updateMiningTickets }) => {
        const userId = ctx.from.id;
        const lastDaily = db.get(`last_daily.${userId}`);
        const now = moment().tz('Asia/Jakarta');

        if (lastDaily && now.isSame(moment(lastDaily).tz('Asia/Jakarta'), 'day')) {
            return ctx.reply('You have already claimed your daily reward today. Come back tomorrow!');
        }

        // Rewards
        const sakuraniteReward = Math.floor(Math.random() * (750 - 50 + 1)) + 50;
        const ticketsReward = 5;
        const miningTicketsReward = 5;

        if (!isOwner(userId)) {
            updateSakuranite(userId, getSakuranite(userId) + sakuraniteReward);
        }
        updateGachaTickets(userId, getGachaTickets(userId) + ticketsReward);
        updateMiningTickets(userId, getMiningTickets(userId) + miningTicketsReward);

        db.set(`last_daily.${userId}`, now.valueOf());

        return ctx.reply(`🎉 <b>Daily Reward Claimed!</b> 🎉\n\nYou received:\n- ${isOwner(userId) ? 0 : sakuraniteReward} Sakuranite\n- ${ticketsReward} Gacha Tickets\n- ${miningTicketsReward} Mining Tickets\n\nCome back tomorrow!`, { parse_mode: 'HTML' });
    }
};
