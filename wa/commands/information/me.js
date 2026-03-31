module.exports = {
    name: "me",
    aliases: ["profil"],
    code: async (sock, m, { sender, pushName, isLeader, isManager, isPremium, getCoins, getGachaTickets, getSakuranite, getMiningTickets, getMiningRate, linking }) => {
        const coins = getCoins(sender);
        const sakuranite = getSakuranite(sender);
        const tickets = getGachaTickets(sender);
        const miningTickets = getMiningTickets(sender);
        const miningRate = getMiningRate(sender);

        let status = "Pengguna";
        if (isLeader(sender)) status = "Leader";
        else if (isManager(sender)) status = "Manager";
        else if (isPremium(sender)) status = "Premium";

        const tgId = linking.getTgId(sender);
        const linkStatus = tgId ? `✅ Terhubung (${tgId})` : "❌ Tidak Terhubung";

        const text = `👤 *Info Pengguna*

*Nama:* ${pushName}
*Tag:* @${sender.split("@")[0]}
*Status:* ${status}
*Koin:* ${coins}
*Sakuranite:* ${sakuranite}
*Tiket Gacha:* ${tickets}

⛏️ *Mining*
*Tiket Mining:* ${miningTickets}
*Rate Mining:* ${miningRate}

🔗 *Integrasi Telegram*
*Status:* ${linkStatus}
`;

        await sock.sendMessage(m.key.remoteJid, {
            text: text,
            mentions: [sender]
        }, { quoted: m });
    }
};
