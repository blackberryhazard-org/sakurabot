const moment = require('moment-timezone');

module.exports = {
    name: 'daily',
    aliases: [],
    category: 'misc',
    code: async (ctx, { db, getCoins, updateCoins, getGachaTickets, updateGachaTickets }) => {
        const userId = ctx.from.id;
        const lastDaily = db.get(`last_daily.${userId}`);
        const now = moment().tz('Asia/Jakarta');

        if (lastDaily && now.isSame(moment(lastDaily).tz('Asia/Jakarta'), 'day')) {
            return ctx.reply('Anda sudah mengklaim hadiah harian Anda hari ini. Kembalilah besok!');
        }

        const coinsReward = Math.floor(Math.random() * 25) + 1;
        const ticketsReward = 5;

        const currentCoins = getCoins(userId);
        const currentTickets = getGachaTickets(userId);

        updateCoins(userId, currentCoins + coinsReward);
        updateGachaTickets(userId, currentTickets + ticketsReward);
        db.set(`last_daily.${userId}`, now.valueOf());

        return ctx.reply(`🎉 Hadiah Harian Diklaim! 🎉\n\nAnda menerima:\n- ${coinsReward} Koin\n- ${ticketsReward} Tiket Gacha`);
    }
};
