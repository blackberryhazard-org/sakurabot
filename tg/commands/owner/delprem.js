module.exports = {
    name: 'delprem',
    category: 'owner',
    code: async (ctx, { isOwner, db }) => {
        if (!isOwner(ctx.from.id)) {
            return ctx.reply('This command is for owners only.');
        }

        const args = ctx.message.text.split(' ').slice(1);
        const userIdToRemove = parseInt(args[0], 10);

        if (isNaN(userIdToRemove)) {
            return ctx.reply('Usage: /delprem {user_id}');
        }

        try {
            let premiumUsers = db.get('premium');
            const userIndex = premiumUsers.indexOf(userIdToRemove);

            if (userIndex === -1) {
                return ctx.reply(`User with ID ${userIdToRemove} is not in the premium list.`);
            }

            premiumUsers.splice(userIndex, 1);
            db.set('premium', premiumUsers);

            ctx.reply(`Successfully removed user with ID ${userIdToRemove} from the premium list.`);
        } catch (error) {
            console.error('Failed to remove premium user:', error);
            ctx.reply('An error occurred while trying to remove the premium user.');
        }
    }
};
