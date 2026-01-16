module.exports = {
    name: 'killtgbot',
    category: 'owner',
    code: async (ctx) => {
        try {
            const stopped = global.stopTG && global.stopTG();
            if (stopped) {
                await ctx.reply('Succeeded in shutting down the Telegram bot.');
            } else {
                await ctx.reply('The Telegram bot is not running or the shutdown function is unavailable.');
            }
        } catch (error) {
            console.error('Error shutting down Telegram bot:', error);
            await ctx.reply(`An error occurred while shutting down the Telegram bot: ${error.message}`);
        }
    }
};
