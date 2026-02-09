const moment = require('moment-timezone');

const itemsList = [
    { name: 'Copper', weight: 60 },
    { name: 'Lead', weight: 25 },
    { name: 'Titanium', weight: 10 },
    { name: 'Thorium', weight: 5 }
];

function getRandomItem() {
    const totalWeight = itemsList.reduce((acc, item) => acc + item.weight, 0);
    let random = Math.random() * totalWeight;
    for (const item of itemsList) {
        if (random < item.weight) return item.name;
        random -= item.weight;
    }
    return itemsList[0].name;
}

module.exports = {
    name: 'daily',
    category: 'user',
    code: async (ctx, { db, isOwner, getSakuranite, updateSakuranite, getGachaTickets, updateGachaTickets }) => {
        const userId = ctx.from.id;
        const lastDaily = db.get(`last_daily.${userId}`);
        const now = moment().tz('Asia/Jakarta');

        if (lastDaily && now.isSame(moment(lastDaily).tz('Asia/Jakarta'), 'day')) {
            return ctx.reply('You have already claimed your daily reward today. Come back tomorrow!');
        }

        // Sakuranite 50 - 750
        const sakuraniteReward = Math.floor(Math.random() * (750 - 50 + 1)) + 50;
        const ticketsReward = 5;
        const itemName = getRandomItem();
        const itemAmount = Math.floor(Math.random() * 3) + 1;

        if (!isOwner(userId)) {
            updateSakuranite(userId, getSakuranite(userId) + sakuraniteReward);
        }
        updateGachaTickets(userId, getGachaTickets(userId) + ticketsReward);

        // Update Inventory
        const inventory = db.get(`inventory.${userId}`) || {};
        inventory[itemName] = (inventory[itemName] || 0) + itemAmount;
        db.set(`inventory.${userId}`, inventory);

        db.set(`last_daily.${userId}`, now.valueOf());

        return ctx.reply(`🎉 Daily Reward Claimed! 🎉\n\nYou received:\n- ${isOwner(userId) ? 0 : sakuraniteReward} Sakuranite\n- ${ticketsReward} Gacha Tickets\n- ${itemAmount}x ${itemName}`, { parse_mode: 'HTML' });
    }
};
