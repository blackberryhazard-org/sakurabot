module.exports = {
    name: 'addgroup',
    category: 'owner',
    description: 'Adds a group to the broadcast list by ID.',
    code: async (ctx, { isOwner, db, config }) => {
        if (!isOwner(ctx.from.id)) {
            return ctx.reply(config.msg.owner);
        }

        const args = ctx.message.text.split(' ').slice(1);
        if (args.length === 0) {
            return ctx.reply('Please provide a group ID.\nExample: /addgroup -1001234567890');
        }

        const groupId = args[0];
        if (isNaN(groupId)) {
            return ctx.reply('Invalid Group ID. It must be a number.');
        }

        const numericGroupId = parseInt(groupId, 10);
        const groups = db.get('groups') || [];

        if (groups.includes(numericGroupId)) {
            return ctx.reply(`Group ID ${numericGroupId} is already in the broadcast list.`);
        }

        db.push('groups', numericGroupId);
        ctx.reply(`Group ID ${numericGroupId} has been added to the broadcast list.`);
    }
};
