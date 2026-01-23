module.exports = {
    name: 'cancel',
    aliases: ['canceltopup'],
    category: 'tool',
    code: async (ctx, { activeTopups }) => {
        const userId = ctx.from.id;

        if (!activeTopups.has(userId)) {
            return ctx.reply('Anda tidak memiliki sesi top-up aktif.');
        }

        const { watcher } = activeTopups.get(userId);

        watcher.stop();
        activeTopups.delete(userId);

        return ctx.reply('Transaksi top-up Anda telah dibatalkan.');
    }
};
