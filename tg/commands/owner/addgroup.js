module.exports = {
    name: 'addgroup',
    category: 'owner',
    description: 'Adds the current group to the broadcast list.',
    code: async (ctx, { isOwner, db, config }) => {
        if (!isOwner(ctx.from.id)) {
            return ctx.reply(config.msg.owner);
        }

        const chatType = ctx.chat.type;
        if (chatType !== 'group' && chatType !== 'supergroup') {
            return ctx.reply('This command can only be used in a group chat.');
        }

        const groupId = ctx.chat.id;
        const groups = db.get('groups') || [];

        if (groups.includes(groupId)) {
            return ctx.reply('This group is already in the broadcast list.');
        }

        db.push('groups', groupId);
        ctx.reply(`Group "${ctx.chat.title}" (${groupId}) has been added to the broadcast list.`);
    }
};
