const moment = require("moment-timezone");
const fs = require("fs");
const path = require("path");

module.exports = {
    name: "ping",
    aliases: ["p", "health"],
    code: async (sock, m, { from, ctx }) => {
        const startTime = Date.now();
        const { formatUptime } = global;
        const uptime = formatUptime(global.botStartTime);

        let dbSize = 0;
        try {
            const dbFilePath = path.resolve(__dirname, "../../../database/wa/database.json");
            dbSize = fs.statSync(dbFilePath).size;
        } catch (_e) { /* ignore */ }

        const latency = Date.now() - startTime;
        const tgBotStatus = global.botStatus.tg ? "Running" : "Stopped";

        const text = "*PONG!* 🏓\n\n" +
            `➛ *Latency*: ${latency}ms\n` +
            `➛ *Uptime*: ${uptime}\n` +
            "➛ *Platform*: WhatsApp\n" +
            `➛ *DB Size*: ${(dbSize / 1024).toFixed(2)} KB\n` +
            `➛ *Memory*: ${(process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2)} MB\n` +
            `➛ *TG Bot Status*: ${tgBotStatus}\n` +
            `➛ *Time*: ${moment().tz("Asia/Jakarta").format("YYYY-MM-DD HH:mm:ss")}`;

        await ctx.reply(text);
    }
};
