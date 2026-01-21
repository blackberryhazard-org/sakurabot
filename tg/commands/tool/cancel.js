module.exports = {
    name: 'cancel',
    aliases: ['canceltopup'],
    category: 'tool',
    code: async (ctx, { activeTopups }) => {
        const userId = ctx.from.id;

        if (!activeTopups.has(userId)) {
            return ctx.reply('You do not have an active top-up session.');
        }

        const { watcher } = activeTopups.get(userId);

        watcher.stop();
        activeTopups.delete(userId);

        return ctx.reply('Your top-up transaction has been canceled.');
    }
};
