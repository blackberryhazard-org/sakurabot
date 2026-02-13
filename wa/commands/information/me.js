module.exports = {
    name: "me",
    aliases: ["profil"],
    code: async (sock, m, { sender, pushName, isOwner, isPremium, getSakuranite, getInventory, getMiningTickets, getMiningRate, db }) => {
        const sakuranite = getSakuranite(sender);
        const inv = getInventory(sender);
        const miningTickets = getMiningTickets(sender);
        const miningRate = getMiningRate(sender);
        const role = isOwner(sender) ? "Owner" : (isPremium(sender) ? "Premium" : "User");

        const link = db.get(`links.${sender}`);
        const linkStatus = link ? `✅ Terhubung (${link})` : "❌ Tidak Terhubung";

        let invText = "";
        Object.keys(inv).forEach(item => {
            invText += `➛ *${item}*: ${inv[item]}\n`;
        });
        if (!invText) invText = "Kosong\n";

        const text = "— *USER INFO* —\n\n" +
            `➛ *Nama*: ${pushName}\n` +
            `➛ *Tag*: @${sender.split("@")[0]}\n` +
            `➛ *Role*: ${role}\n` +
            `➛ *Sakuranite*: ${sakuranite}\n\n` +
            "*Mining*:\n" +
            `➛ *Tiket Mining*: ${miningTickets}\n` +
            `➛ *Rate Mining*: ${miningRate}\n\n` +
            "*Integrasi Telegram*:\n" +
            `➛ *Status*: ${linkStatus}\n\n` +
            `*Inventory*:\n${invText}`;

        await sock.sendMessage(m.key.remoteJid, {
            text: text,
            mentions: [sender]
        }, { quoted: m });
    }
};
