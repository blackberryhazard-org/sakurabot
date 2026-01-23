const config = require('../../../config.json');
const moment = require('moment-timezone');
const path = require('path');
const fs = require('fs');

// Helper function to format uptime
const formatUptime = (startTime) => {
    const uptime = Date.now() - startTime;
    const seconds = Math.floor((uptime / 1000) % 60);
    const minutes = Math.floor((uptime / (1000 * 60)) % 60);
    const hours = Math.floor((uptime / (1000 * 60 * 60)) % 24);
    return `${hours}h ${minutes}m ${seconds}s`;
};

module.exports = {
    name: 'menu',
    category: 'information',
    aliases: ['help'],
    code: async (ctx, { db, bot }) => {
        const args = ctx.message.text.split(' ').slice(1);
        const categoryArg = args[0]?.toLowerCase();

        // Group commands by category first
        const commandsByCategory = {};
        for (const [name, command] of bot.cmd.entries()) {
            // Avoid duplicates from aliases
            if (name !== command.name) continue;

            if (!commandsByCategory[command.category]) {
                commandsByCategory[command.category] = [];
            }
            commandsByCategory[command.category].push(command.name);
        }

        // If a valid category is requested, show only that category's commands
        if (categoryArg && commandsByCategory[categoryArg]) {
            let categoryText = `*${categoryArg.charAt(0).toUpperCase() + categoryArg.slice(1)} Commands*\n\n`;
            const commandList = commandsByCategory[categoryArg];

            commandList.forEach(cmdName => {
                categoryText += `➡️ /${cmdName}\n`;
            });

            return await ctx.reply(categoryText, { parse_mode: 'Markdown' });
        }

        // --- Full Menu Logic (if no valid category is specified) ---
        const userName = ctx.from.first_name;
        const botName = config.bot.name;
        const ownerName = config.owner.name;

        const date = moment().tz('Asia/Jakarta').format('dddd, DD MMMM YYYY');
        const time = moment().tz('Asia/Jakarta').format('HH:mm:ss');
        const uptime = formatUptime(global.botStartTime);

        // Calculate DB size
        let dbSize = 0;
        try {
            const stats = fs.statSync(path.resolve(__dirname, '../../database.json'));
            dbSize = stats.size;
        } catch (e) {
            // File might not exist yet
        }

        const dbSizeFormatted = (dbSize / 1024).toFixed(2) + ' KB';

        let menuText = `
— Halo, ${userName}! Nama saya ${botName}, saya adalah bot Telegram milik ${ownerName}.

➛ Tanggal: ${date}
➛ Waktu: ${time}
➛ Uptime: ${uptime}
➛ Database: ${dbSizeFormatted} (Simpl.DB with JSON)
➛ *Library*: telegraf

☆ Jangan lupa berdonasi agar bot tetap online.
`;

        // If an invalid category was passed, add a notice
        if (categoryArg) {
            menuText += `\n*Category "${categoryArg}" not found. Please choose from the list below.*\n`;
        }

        menuText += `
╭┈┈┈┈┈┈ ♡
┊ ✿ — Kategori Perintah
`;

        for (const category in commandsByCategory) {
            menuText += `┊ ➛ ${category}\n`;
        }

        menuText += `╰┈┈┈┈┈┈
Developed by ${ownerName} with ♡
`;

        // Add a random image from Lorem Picsum
        const randomImageUrl = `https://picsum.photos/500/300?random=${Date.now()}`;

        try {
            await ctx.replyWithPhoto(randomImageUrl, {
                caption: menuText,
                parse_mode: 'Markdown'
            });
        } catch (error) {
            console.error("Error sending photo with caption:", error);
            // Fallback to text if photo fails
            await ctx.reply(menuText, { parse_mode: 'Markdown' });
        }
    }
};
