module.exports = {
    name: 'addchannel',
    category: 'owner',
    description: 'Adds a channel to the broadcast list.',
    code: async (ctx, { isLeader, db }) => {
        const userId = ctx.from.id;
        if (!isLeader(userId)) {
            return ctx.reply("You don't have permission to use this command.");
        }

        const args = ctx.message.text.split(' ');
        const channelId = args[1];

        if (!channelId) {
            return ctx.reply('Please provide a channel ID (e.g., @channelusername or -1001234567890).');
        }

        try {
            const chat = await ctx.telegram.getChat(channelId);
            if (chat.type !== 'channel') {
                return ctx.reply('The provided ID does not belong to a channel.');
            }

            const botMember = await ctx.telegram.getChatMember(channelId, ctx.botInfo.id);

            if (!['administrator', 'creator'].includes(botMember.status)) {
                return ctx.reply('I am not an administrator in that channel. Please make me an admin and try again.');
            }

            const channels = db.get('channels') || [];
            if (channels.includes(chat.id)) {
                return ctx.reply('This channel is already in the broadcast list.');
            }

            channels.push(chat.id);
            db.set('channels', channels);
            return ctx.reply(`✅ Successfully added channel "${chat.title}" (ID: ${chat.id}) to the broadcast list.`);

        } catch (error) {
            console.error("Error in /addchannel:", error);
            if (error.description) {
                 return ctx.reply(`An error occurred: ${error.description}`);
            }
            return ctx.reply('An unknown error occurred. Make sure the channel ID is correct and I have been added to the channel.');
        }
    }
};
