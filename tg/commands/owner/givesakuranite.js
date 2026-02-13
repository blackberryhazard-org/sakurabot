module.exports = {
    name: "givesakuranite",
    category: "owner",
    description: "Give Sakuranite to a user.",
    code: async (ctx, { isOwner, db, getSakuranite, updateSakuranite, config }) => {
        if (!isOwner(ctx.from.id)) {
            return ctx.reply(config.msg.owner);
        }

        const args = ctx.message.text.split(" ").slice(1);
        if (args.length < 2) {
            return ctx.reply("Usage: /givesakuranite {user_id} {amount}");
        }

        const targetId = parseInt(args[0]);
        const amount = parseInt(args[1]);

        if (isNaN(targetId) || isNaN(amount) || amount <= 0) {
            return ctx.reply("Invalid user ID or amount.");
        }

        const users = db.get("users") || [];
        if (!users.includes(targetId)) {
            return ctx.reply("User not found in database.");
        }

        updateSakuranite(targetId, getSakuranite(targetId) + amount);
        ctx.reply(`Successfully gave ${amount} Sakuranite to user ${targetId}.`);
    }
};
