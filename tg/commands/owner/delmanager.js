module.exports = {
    name: "delmanager",
    aliases: [],
    category: "owner",
    code: async (ctx, { isLeader, db }) => {
        if (!isLeader(ctx.from.id)) {
            return ctx.reply(global.config.msg.notLeader);
        }

        let managerId;
        const args = ctx.message.text.split(" ").slice(1);

        if (args.length > 0 && /^\d+$/.test(args[0])) {
            managerId = parseInt(args[0], 10);
        } else if (ctx.message.reply_to_message && ctx.message.reply_to_message.from) {
            managerId = ctx.message.reply_to_message.from.id;
        } else {
            return ctx.reply("Please provide a manager ID or reply to a manager's message.");
        }

        const managers = db.get("managers") || [];
        const managerIndex = managers.indexOf(managerId);

        if (managerIndex === -1) {
            return ctx.reply("That user is not a manager.");
        }

        managers.splice(managerIndex, 1);
        db.set("managers", managers);

        return ctx.reply(`Successfully removed manager with ID: ${managerId}`);
    }
};
