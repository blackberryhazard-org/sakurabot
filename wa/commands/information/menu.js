const moment = require("moment-timezone");
const fs = require("fs");
const path = require("path");

module.exports = {
    name: "menu",
    aliases: ["help", "?"],
    code: async (sock, m, { pushName, prefix, waBot }) => {
        const date = moment().tz("Asia/Jakarta").format("dddd, DD MMMM YYYY");
        const time = moment().tz("Asia/Jakarta").format("HH:mm:ss");
        const uptime = global.formatUptime(global.botStartTime);

        let dbSize = 0;
        try {
            const dbFilePath = path.resolve(__dirname, "../../../database/wa/database.json");
            const stats = fs.statSync(dbFilePath);
            dbSize = stats.size;
        } catch (_e) { /* ignore */ }
        const dbSizeFormatted = (dbSize / 1024).toFixed(2) + " KB";

        const categories = {};
        waBot.cmd.forEach(cmd => {
            if (!categories[cmd.category]) categories[cmd.category] = [];
            if (!categories[cmd.category].includes(cmd.name)) categories[cmd.category].push(cmd.name);
        });

        let menuText = `— Halo, *${pushName}*! 👋\n\n` +
            `➛ *Tanggal*: ${date}\n` +
            `➛ *Waktu*: ${time}\n` +
            `➛ *Uptime*: ${uptime}\n` +
            `➛ *Database*: ${dbSizeFormatted}\n` +
            "➛ *Library*: Baileys\n\n";

        Object.keys(categories).forEach(cat => {
            menuText += `*${cat.toUpperCase()}*:\n`;
            categories[cat].sort().forEach(cmd => {
                menuText += `➛ ${prefix}${cmd}\n`;
            });
            menuText += "\n";
        });

        await sock.sendMessage(m.key.remoteJid, {
            image: { url: config.bot.thumbnail },
            caption: menuText
        }, { quoted: m });
    }
};
