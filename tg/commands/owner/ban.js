module.exports = {
    name: "ban",
    category: "owner",
    description: "Ban a user for a specified time.",
    code: (ctx, { isOwner, db, config }) => {
        if (!isOwner(ctx.from.id)) {
            return ctx.reply(config.msg.owner);
        }

        const args = ctx.message.text.split(" ");
        if (args.length !== 3) {
            return ctx.reply("Usage: /ban {user_id} {hours}");
        }

        const userId = parseInt(args[1], 10);
        const hours = parseInt(args[2], 10);

        if (isNaN(userId) || isNaN(hours) || hours <= 0) {
            return ctx.reply("Invalid user ID or duration. Hours must be a positive number.");
        }

        const users = db.get("users");
        if (!users.includes(userId)) {
            return ctx.reply("User has not started the bot yet. They need to start the bot first.");
        }

        if (isOwner(userId)) {
            return ctx.reply("You cannot ban an owner.");
        }

        const bans = db.get("bans");
        const now = new Date();
        const banUntil = new Date(now.getTime() + hours * 60 * 60 * 1000);

        // Remove existing ban if any, to update it
        const updatedBans = bans.filter(ban => ban.id !== userId);
        updatedBans.push({ id: userId, until: banUntil.toISOString() });

        db.set("bans", updatedBans);

        ctx.reply(`User ${userId} has been banned for ${hours} hour(s). They will be unbanned on ${banUntil.toUTCString()}.`);
    }
};
