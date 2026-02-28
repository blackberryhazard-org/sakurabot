const moment = require("moment-timezone");
const fs = require("fs");
const path = require("path");

module.exports = {
    name: "ping",
    aliases: ["p", "health"],
    code: async (sock, m, { from, ctx }) => {
        const { formatUptime } = global;
        const uptime = formatUptime(global.botStartTime);

        let dbSize = 0;
        try {
            const dbFilePath = path.join(process.cwd(), "database/wa/database.json");
            dbSize = fs.statSync(dbFilePath).size;
        } catch (_e) { /* ignore */ }

        const tgBotStatus = global.botStatus.tg ? "Running" : "Stopped";
        const startTime = Date.now();

        const initialText = "*PONG!* 🏓\n\n" +
            "➛ *Latency*: ...ms\n" +
            `➛ *Uptime*: ${uptime}\n` +
            "➛ *Platform*: WhatsApp\n" +
            `➛ *DB Size*: ${(dbSize / 1024).toFixed(2)} KB\n` +
            `➛ *Memory*: ${(process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2)} MB\n` +
            `➛ *TG Bot Status*: ${tgBotStatus}\n` +
            `➛ *Time*: ${moment().tz("Asia/Jakarta").format("YYYY-MM-DD HH:mm:ss")}`;

        const sent = await ctx.reply(initialText);
        const latency = Date.now() - startTime;

        const finalText = "*PONG!* 🏓\n\n" +
            `➛ *Latency*: ${latency}ms\n` +
            `➛ *Uptime*: ${uptime}\n` +
            "➛ *Platform*: WhatsApp\n" +
            `➛ *DB Size*: ${(dbSize / 1024).toFixed(2)} KB\n` +
            `➛ *Memory*: ${(process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2)} MB\n` +
            `➛ *TG Bot Status*: ${tgBotStatus}\n` +
            `➛ *Time*: ${moment().tz("Asia/Jakarta").format("YYYY-MM-DD HH:mm:ss")}`;

        await sock.sendMessage(from, { text: finalText, edit: sent.key });
    }
};
