const moment = require('moment-timezone');

const itemsList = [
    { name: 'Copper', weight: 60 },
    { name: 'Lead', weight: 25 },
    { name: 'Titanium', weight: 10 },
    { name: 'Thorium', weight: 4 },
    { name: 'Plastanium', weight: 1 }
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
    code: async (sock, m, { sender, db, getSakuranite, updateSakuranite, updateInventory, from }) => {
        const lastDaily = db.get(`last_daily.${sender}`) || 0;
        const now = moment().tz('Asia/Jakarta').startOf('day').valueOf();

        if (lastDaily === now) {
            return await sock.sendMessage(from, { text: 'Anda sudah mengambil hadiah harian hari ini!' }, { quoted: m });
        }

        // Sakuranite 75 - 800
        const sakuraniteReward = Math.floor(Math.random() * (800 - 75 + 1)) + 75;

        // Pick 1 random item based on rarity
        const itemName = getRandomItem();
        const itemAmount = Math.floor(Math.random() * 3) + 1;
        updateInventory(sender, itemName, itemAmount);

        updateSakuranite(sender, getSakuranite(sender) + sakuraniteReward);
        db.set(`last_daily.${sender}`, now);

        let text = `— *DAILY REWARDS* —\n\n` +
            `Selamat! Anda mendapatkan:\n` +
            `➛ *Sakuranite*: ${sakuraniteReward}\n` +
            `➛ *${itemName}*: ${itemAmount}\n\n` +
            `Silakan kembali besok!`;

        await sock.sendMessage(from, { text }, { quoted: m });
    }
};
