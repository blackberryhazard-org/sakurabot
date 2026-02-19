const moment = require("moment-timezone");
const fs = require("fs");
const path = require("path");

module.exports = {
    name: "health",
    category: "owner",
    permissions: { owner: true },
    code: async (ctx) => {
        const { formatUptime } = global;
        const uptime = formatUptime(global.botStartTime);

        let dbSize = 0;
        try {
            const dbFilePath = path.resolve(__dirname, "../../database/tg/database.json");
            dbSize = fs.statSync(dbFilePath).size;
        } catch (_e) { /* ignore */ }

        const healthText = "*Sistem Health Check* 🏥\n\n" +
            `➛ *Uptime*: ${uptime}\n` +
            "➛ *Platform*: Telegram\n" +
            `➛ *DB Size*: ${(dbSize / 1024).toFixed(2)} KB\n` +
            `➛ *Memory*: ${(process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2)} MB\n` +
            `➛ *WA Bot Status*: ${global.botStatus.wa ? "Connected" : "Disconnected"}\n` +
            `➛ *Time*: ${moment().tz("Asia/Jakarta").format("YYYY-MM-DD HH:mm:ss")}`;

        return ctx.reply(healthText, { parse_mode: "Markdown" });
    }
};
