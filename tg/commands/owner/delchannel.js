module.exports = {
    name: 'delchannel',
    category: 'owner',
    description: 'Removes a channel from the broadcast list.',
    code: async (ctx, { isLeader, db }) => {
        const userId = ctx.from.id;
        if (!isLeader(userId)) {
            return ctx.reply("You don't have permission to use this command.");
        }

        const args = ctx.message.text.split(' ');
        const channelIdToRemove = args[1];

        if (!channelIdToRemove) {
            return ctx.reply('Please provide a channel ID (e.g., @channelusername or -1001234567890).');
        }

        let channels = db.get('channels') || [];
        if (channels.length === 0) {
            return ctx.reply('The broadcast channel list is already empty.');
        }

        // To handle both usernames and IDs, we need to resolve the ID from the input.
        let targetChannelId;
        try {
            // getChat will resolve username to a chat object with an ID
            const chat = await ctx.telegram.getChat(channelIdToRemove);
            targetChannelId = chat.id;
        } catch (error) {
            // If getChat fails, maybe it's already a raw ID. We can try to parse it.
            const parsedId = parseInt(channelIdToRemove);
            if (!isNaN(parsedId)) {
                targetChannelId = parsedId;
            } else {
                 console.error("Error in /delchannel resolving chat:", error);
                 return ctx.reply(`Could not find a channel with the identifier "${channelIdToRemove}". Please provide a valid username or ID.`);
            }
        }

        const initialLength = channels.length;
        channels = channels.filter(id => id !== targetChannelId);

        if (channels.length === initialLength) {
            return ctx.reply(`Channel with ID ${targetChannelId} was not found in the broadcast list.`);
        }

        db.set('channels', channels);
        return ctx.reply(`✅ Successfully removed channel with ID ${targetChannelId} from the broadcast list.`);
    }
};
