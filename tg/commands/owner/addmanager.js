module.exports = {
    name: "addmanager",
    category: "owner",
    description: "Adds a new manager.",
    code: async (ctx, { isLeader, db, config }) => {
        if (!isLeader(ctx.from.id)) {
            return ctx.reply(config.msg.owner);
        }

        const args = ctx.message.text.split(" ").slice(1);
        if (args.length === 0) {
            return ctx.reply("Please provide a user ID.\nExample: /addmanager 123456789");
        }

        const userId = args[0];
        if (isNaN(userId)) {
            return ctx.reply("Invalid User ID. It must be a number.");
        }

        const numericUserId = parseInt(userId, 10);
        const managers = db.get("managers") || [];

        if (managers.includes(numericUserId)) {
            return ctx.reply(`User ID ${numericUserId} is already a manager.`);
        }

        db.push("managers", numericUserId);
        ctx.reply(`User ID ${numericUserId} has been added as a manager.`);
    }
};
