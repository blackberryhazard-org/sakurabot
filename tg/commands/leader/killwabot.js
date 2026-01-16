module.exports = {
    name: 'killwabot',
    aliases: [],
    category: 'leader',
    code: async (ctx, { isLeader }) => {
        if (!isLeader(ctx.from.id)) {
            return ctx.reply(global.config.msg.notLeader);
        }

        try {
            const stopped = global.stopWA && global.stopWA();
            if (stopped) {
                await ctx.reply('Succeeded in shutting down the WhatsApp bot.');
            } else {
                await ctx.reply('The WhatsApp bot is not running or the shutdown function is unavailable.');
            }
        } catch (error) {
            console.error('Error shutting down WhatsApp bot:', error);
            await ctx.reply(`An error occurred while shutting down the WhatsApp bot: ${error.message}`);
        }
    }
};
