module.exports = {
    name: 'unban',
    category: 'owner',
    code: async (ctx, { isOwner, db }) => {
        if (!isOwner(ctx.from.id)) {
            return ctx.reply('This command is for owners only.');
        }

        const args = ctx.message.text.split(' ').slice(1);
        const userIdToUnban = parseInt(args[0], 10);

        if (isNaN(userIdToUnban)) {
            return ctx.reply('Usage: /unban {user_id}');
        }

        try {
            let bannedUsers = db.get('bans');
            const userIndex = bannedUsers.findIndex(ban => ban.id === userIdToUnban);

            if (userIndex === -1) {
                return ctx.reply(`User with ID ${userIdToUnban} is not in the banned list.`);
            }

            bannedUsers.splice(userIndex, 1);
            db.set('bans', bannedUsers);

            ctx.reply(`Successfully unbanned user with ID ${userIdToUnban}.`);
        } catch (error) {
            console.error('Failed to unban user:', error);
            ctx.reply('An error occurred while trying to unban the user.');
        }
    }
};
