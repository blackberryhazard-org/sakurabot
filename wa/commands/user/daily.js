const moment = require('moment-timezone');

module.exports = {
    name: 'daily',
    code: async (sock, m, { sender, db, getSakuranite, updateSakuranite, updateInventory, items }) => {
        const lastDaily = db.get(`last_daily.${sender}`) || 0;
        const now = moment().tz('Asia/Jakarta').startOf('day').valueOf();

        if (lastDaily === now) {
            return await sock.sendMessage(m.key.remoteJid, { text: 'Anda sudah mengambil hadiah harian hari ini!' }, { quoted: m });
        }

        const sakuraniteReward = Math.floor(Math.random() * 10 + 1) * 100;
        const itemNames = Object.keys(items);

        // Pick 2 random items
        const rewardItems = [];
        for (let i = 0; i < 2; i++) {
            const randomItem = itemNames[Math.floor(Math.random() * itemNames.length)];
            const itemAmount = Math.floor(Math.random() * 3) + 1;
            updateInventory(sender, randomItem, itemAmount);
            rewardItems.push({ name: randomItem, amount: itemAmount });
        }

        updateSakuranite(sender, getSakuranite(sender) + sakuraniteReward);
        db.set(`last_daily.${sender}`, now);

        let text = `— *DAILY REWARDS* —\n\n` +
            `Selamat! Anda mendapatkan:\n` +
            `➛ *Sakuranite*: ${sakuraniteReward}\n`;

        rewardItems.forEach(item => {
            text += `➛ *${item.name}*: ${item.amount}\n`;
        });

        text += `\nSilakan kembali besok!`;

        await sock.sendMessage(m.key.remoteJid, { text }, { quoted: m });
    }
};
