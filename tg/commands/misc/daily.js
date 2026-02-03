const moment = require('moment-timezone');

module.exports = {
    name: 'daily',
    aliases: [],
    category: 'misc',
    code: async (ctx, { db, isOwner, getSakuranite, updateSakuranite, getGachaTickets, updateGachaTickets }) => {
        const userId = ctx.from.id;
        const lastDaily = db.get(`last_daily.${userId}`);
        const now = moment().tz('Asia/Jakarta');

        if (lastDaily && now.isSame(moment(lastDaily).tz('Asia/Jakarta'), 'day')) {
            return ctx.reply('You have already claimed your daily reward today. Come back tomorrow!');
        }

        const sakuraniteReward = (Math.floor(Math.random() * 25) + 1) * 100;
        const ticketsReward = 5;

        const currentSakuranite = getSakuranite(userId);
        const currentTickets = getGachaTickets(userId);

        if (!isOwner(userId)) {
            updateSakuranite(userId, currentSakuranite + sakuraniteReward);
        }
        updateGachaTickets(userId, currentTickets + ticketsReward);
        db.set(`last_daily.${userId}`, now.valueOf());

        return ctx.reply(`🎉 Daily Reward Claimed! 🎉\n\nYou received:\n- ${isOwner(userId) ? 0 : sakuraniteReward} Sakuranite\n- ${ticketsReward} Gacha Tickets`);
    }
};
