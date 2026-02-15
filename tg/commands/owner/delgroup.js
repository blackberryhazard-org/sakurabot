module.exports = {
    name: "delgroup",
    category: "owner",
    description: "Removes the current group from the broadcast list.",
    code: async (ctx, { isOwner, db, config }) => {
        if (!isOwner(ctx.from.id)) {
            return ctx.reply(config.msg.owner);
        }

        const chatType = ctx.chat.type;
        if (chatType !== "group" && chatType !== "supergroup") {
            return ctx.reply("This command can only be used in a group chat.");
        }

        const groupId = ctx.chat.id;
        let groups = db.get("groups") || [];

        if (!groups.includes(groupId)) {
            return ctx.reply("This group is not in the broadcast list.");
        }

        groups = groups.filter(id => id !== groupId);
        db.set("groups", groups);
        ctx.reply(`Group "${ctx.chat.title}" (${groupId}) has been removed from the broadcast list.`);
    }
};
