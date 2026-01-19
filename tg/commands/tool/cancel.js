module.exports = {
    name: 'cancel',
    aliases: ['canceltopup'],
    category: 'tool',
    code: async (ctx, { pakasir, activeTopups }) => {
        const userId = ctx.from.id;

        if (!activeTopups.has(userId)) {
            return ctx.reply('You do not have any active top-up sessions.');
        }

        const topupSession = activeTopups.get(userId);
        const { orderId, amount, watcher } = topupSession;

        try {
            watcher.stop(); // Stop watching the payment
            await pakasir.cancelPayment({ order_id: orderId, amount: amount });
            activeTopups.delete(userId);
            await ctx.reply('Your top-up transaction has been successfully canceled.');
        } catch (error) {
            console.error('Failed to cancel payment:', error);
            // Even if API call fails, we should clean up the session
            if (watcher && typeof watcher.stop === 'function') {
                watcher.stop();
            }
            activeTopups.delete(userId);
            return ctx.reply('An error occurred while canceling your transaction, but your session has been cleared. You can start a new top-up.');
        }
    }
};
