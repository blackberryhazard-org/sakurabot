module.exports = {
    name: "listbroadcast",
    category: "owner",
    code: async (ctx, helpers) => {
        const { userAccess, db } = helpers;
        if (!userAccess.isOwner(ctx.from.id)) return;

        const args = ctx.message.text.split(" ").slice(1);
        if (args.length < 3) {
            return ctx.reply("Usage:\n/listbroadcast group add {id/username}\n/listbroadcast group delete {id/username}\n/listbroadcast channel add {id/username}\n/listbroadcast channel delete {id/username}");
        }

        const type = args[0].toLowerCase(); // group or channel
        const action = args[1].toLowerCase(); // add or delete
        let inputId = args[2];

        if (type !== "group" && type !== "channel") {
            return ctx.reply("Invalid type. Use 'group' or 'channel'.");
        }

        const dbKey = type === "group" ? "groups" : "channels";
        let list = db.get(dbKey) || [];

        if (action === "add") {
            try {
                const chat = await ctx.telegram.getChat(inputId);
                const actualId = chat.id;

                const isGroupChat = chat.type === "group" || chat.type === "supergroup";
                const isChannelChat = chat.type === "channel";

                if (type === "group" && !isGroupChat) {
                    return ctx.reply("ID/Username specified is not a group.");
                }
                if (type === "channel" && !isChannelChat) {
                    return ctx.reply("ID/Username specified is not a channel.");
                }

                if (list.includes(actualId)) {
                    return ctx.reply(`${actualId} is already in the ${type} broadcast list.`);
                }

                list.push(actualId);
                db.set(dbKey, list);
                return ctx.reply(`Successfully added ${chat.title || chat.username || actualId} (${actualId}) to ${type} broadcast list.`);
            } catch (_e) {
                return ctx.reply(`Failed to add ${type}. Error: ${_e.message}`);
            }
        } else if (action === "delete") {
            let targetId = inputId;
            try {
                const chat = await ctx.telegram.getChat(inputId);
                targetId = chat.id;
            } catch {
                // If getChat fails, maybe it's already not accessible,
                // but we might still want to delete it from list by numeric ID if provided.
                if (!isNaN(inputId)) targetId = Number(inputId);
            }

            if (!list.includes(targetId)) {
                return ctx.reply(`${targetId} is not in the ${type} broadcast list.`);
            }

            list = list.filter(id => id !== targetId);
            db.set(dbKey, list);
            return ctx.reply(`Successfully removed ${targetId} from ${type} broadcast list.`);
        } else {
            return ctx.reply("Invalid action. Use 'add' or 'delete'.");
        }
    }
};
