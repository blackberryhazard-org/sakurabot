module.exports = {
    name: "broadcastgc",
    category: "misc",
    description: "Broadcast a message to all registered groups. Costs coins.",
    code: async (ctx, { isOwner, isPremium, getCoins, updateCoins, db }) => {
        const userId = ctx.from.id;
        const message = ctx.message.text.split(" ").slice(1).join(" ");

        if (!message) {
            return ctx.reply("Usage: /broadcastgc {message}");
        }

        const groups = db.get("groups");
        if (!groups || groups.length === 0) {
            return ctx.reply("There are no groups registered for broadcast.");
        }

        // Determine cost per group
        let costPerGroup = 2; // Default for regular users
        if (isPremium(userId)) {
            costPerGroup = 1;
        }
        if (isOwner(userId)) {
            costPerGroup = 0;
        }

        const totalCost = groups.length * costPerGroup;
        const userCoins = getCoins(userId);

        // Check if the user can afford it
        if (userCoins < totalCost) {
            return ctx.reply(`You don't have enough coins. You need ${totalCost} coins (${costPerGroup} per group), but you only have ${userCoins}.`);
        }

        // Deduct coins if not an owner
        if (!isOwner(userId)) {
            updateCoins(userId, userCoins - totalCost);
        }

        let successCount = 0;
        let failureCount = 0;

        await ctx.reply(`Starting broadcast to ${groups.length} groups...`);

        for (const groupId of groups) {
            try {
                await ctx.telegram.sendMessage(groupId, message, { parse_mode: "HTML" });
                successCount++;
            } catch (error) {
                console.error(`Failed to send message to group ${groupId}:`, error);
                failureCount++;
            }
        }

        let feedback = `Broadcast finished.\n✅ Sent to ${successCount} groups.\n❌ Failed for ${failureCount} groups.`;
        if (!isOwner(userId)) {
            feedback += `\n\nYou were charged ${totalCost} coins. Your new balance is ${getCoins(userId)}.`;
        }

        ctx.reply(feedback);
    }
};
