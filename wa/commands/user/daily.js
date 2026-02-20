const moment = require("moment-timezone");

module.exports = {
    name: "daily",
    code: async (sock, m, { sender, db, getSakuranite, updateSakuranite, from, getMiningTickets, updateMiningTickets }) => {
        const lastDailies = db.get("last_daily") || {}; const lastDaily = lastDailies[sender] || 0;
        const now = moment().tz("Asia/Jakarta").startOf("day").valueOf();

        if (lastDaily === now) {
            return await sock.sendMessage(from, { text: "Anda sudah mengambil hadiah harian hari ini!" }, { quoted: m });
        }

        // Rewards
        const sakuraniteReward = Math.floor(Math.random() * (800 - 75 + 1)) + 75;
        const miningTicketsReward = 5;

        updateSakuranite(sender, getSakuranite(sender) + sakuraniteReward);
        updateMiningTickets(sender, getMiningTickets(sender) + miningTicketsReward);

        const lastDailiesUpdate = db.get("last_daily") || {}; lastDailiesUpdate[sender] = now; db.set("last_daily", lastDailiesUpdate);

        let text = "— *DAILY REWARDS* —\n\n" +
            "Selamat! Anda mendapatkan:\n" +
            `➛ *Sakuranite*: ${sakuraniteReward}\n` +
            `➛ *Mining Tickets*: ${miningTicketsReward}\n\n` +
            "Silakan kembali besok!";

        await sock.sendMessage(from, { text }, { quoted: m });
    }
};
