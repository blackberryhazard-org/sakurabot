const moment = require("moment-timezone");
const fs = require("fs");
const path = require("path");

module.exports = {
    name: "health",
    category: "owner",
    permissions: { owner: true },
    code: async (sock, m, helpers) => {
        const { ctx } = helpers;
        const { formatUptime } = global;
        const uptime = formatUptime(global.botStartTime);

        let dbSize = 0;
        try {
            const dbFilePath = path.resolve(__dirname, "../../database/wa/database.json");
            dbSize = fs.statSync(dbFilePath).size;
        } catch (_e) { /* ignore */ }

        const healthText = "*Sistem Health Check* 🏥\n\n" +
            `➛ *Uptime*: ${uptime}\n` +
            "➛ *Platform*: WhatsApp\n" +
            `➛ *DB Size*: ${(dbSize / 1024).toFixed(2)} KB\n` +
            `➛ *Memory*: ${(process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2)} MB\n` +
            `➛ *TG Bot Status*: ${global.botStatus.tg ? "Running" : "Stopped"}\n` +
            `➛ *Time*: ${moment().tz("Asia/Jakarta").format("YYYY-MM-DD HH:mm:ss")}`;

        return ctx.reply(healthText);
    }
};
