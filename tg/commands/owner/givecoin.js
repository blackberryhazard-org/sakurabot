module.exports = {
    name: 'givecoin',
    category: 'owner',
    description: 'Give coins to a user.',
    code: (ctx, { isOwner, db, getCoins, updateCoins, config }) => {
        if (!isOwner(ctx.from.id)) {
            return ctx.reply(config.msg.owner);
        }

        const args = ctx.message.text.split(' ');
        if (args.length !== 3) {
            return ctx.reply('Usage: /givecoin {user_id} {amount}');
        }

        const userId = parseInt(args[1], 10);
        const amount = parseInt(args[2], 10);

        if (isNaN(userId) || isNaN(amount)) {
            return ctx.reply('Invalid user ID or amount.');
        }

        const users = db.get('users');
        if (!users.includes(userId)) {
            return ctx.reply('User has not started the bot yet. They need to start the bot first.');
        }

        const currentCoins = getCoins(userId);
        updateCoins(userId, currentCoins + amount);

        ctx.reply(`Successfully gave ${amount} coins to user ${userId}. They now have ${currentCoins + amount} coins.`);
    }
};
