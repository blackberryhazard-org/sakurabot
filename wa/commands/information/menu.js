const moment = require("moment-timezone");
const fs = require("fs");
const path = require("path");

module.exports = {
    name: "menu",
    aliases: ["help", "?"],
    code: async (sock, m, { pushName, prefix, waBot, config, body }) => {
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

        const sortedCategories = Object.keys(categories).sort();
        const args = body.split(" ");
        const selectedCategory = args.length > 1 ? args.slice(1).join(" ").toLowerCase() : null;

        if (selectedCategory && categories[selectedCategory]) {
            let categoryMenu = `— *Category: ${selectedCategory.toUpperCase()}* 👋\n\n`;
            categories[selectedCategory].sort().forEach(cmd => {
                categoryMenu += `➛ ${prefix}${cmd}\n`;
            });
            return await sock.sendMessage(m.key.remoteJid, {
                text: categoryMenu
            }, { quoted: m });
        }

        let menuText = `— Halo, *${pushName}*! 👋\n\n` +
            `➛ *Tanggal*: ${date}\n` +
            `➛ *Waktu*: ${time}\n` +
            `➛ *Uptime*: ${uptime}\n` +
            `➛ *Database*: ${dbSizeFormatted}\n` +
            "➛ *Library*: @itsliaaa/baileys\n\n" +
            "Silakan pilih kategori menu di bawah ini:";

        // Grouping categories for better organization in nativeFlow
        const nativeFlow = sortedCategories.map(cat => ({
            text: cat.toUpperCase(),
            id: `${prefix}menu ${cat}`
        }));

        await sock.sendMessage(m.key.remoteJid, {
            image: { url: config.wabot.thumbnail },
            caption: menuText,
            footer: config.wabot.name || "SakuraBot",
            nativeFlow
        }, { quoted: m });
    }
};
