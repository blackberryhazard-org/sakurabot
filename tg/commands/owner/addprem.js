module.exports = {
    name: "addprem",
    category: "owner",
    description: "Add a user to the premium list.",
    code: (ctx, { isOwner, db, config }) => {
        if (!isOwner(ctx.from.id)) {
            return ctx.reply(config.msg.owner);
        }

        const args = ctx.message.text.split(" ");
        if (args.length !== 2) {
            return ctx.reply("Usage: /addprem {user_id}");
        }

        const userId = parseInt(args[1], 10);
        if (isNaN(userId)) {
            return ctx.reply("Invalid user ID.");
        }

        const users = db.get("users");
        if (!users.includes(userId)) {
            return ctx.reply("User has not started the bot yet. They need to start the bot first.");
        }

        const premiumUsers = db.get("premium");
        if (premiumUsers.includes(userId)) {
            return ctx.reply("User is already a premium member.");
        }

        db.push("premium", userId);

        ctx.reply(`User ${userId} has been added to the premium list.`);
    }
};
