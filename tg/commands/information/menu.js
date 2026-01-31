const { Markup } = require('telegraf');
const config = require('../../../config.json');
const moment = require('moment-timezone');
const path = require('path');
const fs = require('fs');

const formatUptime = (startTime) => {
    const uptime = Date.now() - startTime;
    const seconds = Math.floor((uptime / 1000) % 60);
    const minutes = Math.floor((uptime / (1000 * 60)) % 60);
    const hours = Math.floor((uptime / (1000 * 60 * 60)) % 24);
    const days = Math.floor(uptime / (1000 * 60 * 60 * 24));
    return `${days}d ${hours}h ${minutes}m ${seconds}s`;
};

module.exports = {
    name: 'menu',
    category: 'information',
    aliases: ['help'],
    code: async (ctx, { bot }) => {
        // Group commands by category
        const categories = [...new Set(Array.from(bot.cmd.values()).map(c => c.category))];

        const userName = ctx.from.first_name;
        const date = moment().tz('Asia/Jakarta').format('dddd, DD MMMM YYYY');
        const time = moment().tz('Asia/Jakarta').format('HH:mm:ss');
        const uptime = formatUptime(global.botStartTime);

        // Calculate DB size
        let dbSize = 0;
        try {
            const dbFilePath = path.resolve(__dirname, '../../../database/tg/database.json');
            const stats = fs.statSync(dbFilePath);
            dbSize = stats.size;
        } catch (e) {
            // File might not exist yet or path is different
        }
        const dbSizeFormatted = (dbSize / 1024).toFixed(2) + ' KB';

        let menuText = `— Halo, *${userName}*! 👋\n\n` +
            `➛ *Tanggal*: ${date}\n` +
            `➛ *Waktu*: ${time}\n` +
            `➛ *Uptime*: ${uptime}\n` +
            `➛ *Database*: ${dbSizeFormatted}\n` +
            `➛ *Library*: Telegraf\n\n` +
            `Silahkan pilih kategori di bawah untuk melihat perintah:`;

        // Generate Buttons (2 kolom)
        const buttons = [];
        for (let i = 0; i < categories.length; i += 2) {
            const row = categories.slice(i, i + 2).map(cat =>
                Markup.button.callback(cat.toUpperCase(), `show_cat:${cat}`)
            );
            buttons.push(row);
        }

        const randomImageUrl = `https://picsum.photos/500/300?random=${Date.now()}`;

        try {
            await ctx.replyWithPhoto(randomImageUrl, {
                caption: menuText,
                parse_mode: 'Markdown',
                ...Markup.inlineKeyboard(buttons)
            });
        } catch (error) {
            await ctx.reply(menuText, {
                parse_mode: 'Markdown',
                ...Markup.inlineKeyboard(buttons)
            });
        }
    }
};
