const moment = require("moment-timezone");
const fs = require("fs");
const path = require("path");

module.exports = {
    name: "ping",
    category: "information",
    aliases: ["p", "health"],
    code: async (ctx) => {
        const startTime = Date.now();
        const sentMessage = await ctx.reply("Pinging...");
        const latency = Date.now() - startTime;

        const { formatUptime } = global;
        const uptime = formatUptime(global.botStartTime);

        let dbSize = 0;
        try {
            const dbFilePath = path.join(process.cwd(), "database/tg/database.json");
            dbSize = fs.statSync(dbFilePath).size;
        } catch (_e) { /* ignore */ }

        const waBotStatus = global.botStatus.wa ? "Connected" : "Disconnected";

        const text = "*PONG!* 🏓\n\n" +
            `➛ *Latency*: ${latency}ms\n` +
            `➛ *Uptime*: ${uptime}\n` +
            "➛ *Platform*: Telegram\n" +
            `➛ *DB Size*: ${(dbSize / 1024).toFixed(2)} KB\n` +
            `➛ *Memory*: ${(process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2)} MB\n` +
            `➛ *WA Bot Status*: ${waBotStatus}\n` +
            `➛ *Time*: ${moment().tz("Asia/Jakarta").format("YYYY-MM-DD HH:mm:ss")}`;

        await ctx.telegram.editMessageText(
            ctx.chat.id,
            sentMessage.message_id,
            null,
            text,
            { parse_mode: "Markdown" }
        );
    }
};
