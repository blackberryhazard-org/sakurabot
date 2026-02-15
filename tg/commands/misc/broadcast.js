module.exports = {
    name: "broadcast",
    category: "misc",
    description: "Send a message to all users. Costs coins.",
    code: async (ctx, { isOwner, isPremium, getCoins, updateCoins, db, escapeHTML }) => {
        const userId = ctx.from.id;
        const message = ctx.message.text.split(" ").slice(1).join(" ");

        if (!message) {
            return ctx.reply("Please provide a message to broadcast.");
        }

        // Determine the cost
        let cost = 10; // Default cost for regular users
        if (isPremium(userId)) {
            cost = 5;
        }
        if (isOwner(userId)) {
            cost = 0;
        }

        const userCoins = getCoins(userId);

        // Check if the user can afford it
        if (userCoins < cost) {
            return ctx.reply(`You don't have enough coins to broadcast. You need ${cost} coins, but you only have ${userCoins}.`);
        }

        const users = db.get("users");
        if (!users || users.length === 0) {
            return ctx.reply("There are no users to broadcast to.");
        }

        // Deduct coins if not an owner
        if (!isOwner(userId)) {
            updateCoins(userId, userCoins - cost);
        }

        let successCount = 0;
        let failureCount = 0;

        await ctx.reply(`Starting broadcast to ${users.length} users...`);

        for (const targetId of users) {
            try {
                // Avoid sending to the user who initiated the broadcast to prevent spamming themselves
                if (targetId !== userId) {
                    await ctx.telegram.sendMessage(targetId, message, { parse_mode: "HTML" });
                    successCount++;
                }
            } catch (error) {
                console.error(`Failed to send message to user ${targetId}:`, error.description);
                failureCount++;
            }
        }

        let feedback = `Broadcast finished.\n✅ Sent to ${successCount} users.\n❌ Failed for ${failureCount} users.`;
        if (!isOwner(userId)) {
            feedback += `\n\nYou were charged ${cost} coins. Your new balance is ${getCoins(userId)}.`;
        }
        ctx.reply(feedback);
    }
};
