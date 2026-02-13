const { Markup } = require("telegraf");

const COOLDOWN_REGULAR_HOURS = 48;
const COOLDOWN_PREMIUM_HOURS = 24;
const COOLDOWN_BYPASS_COST = 50;

function msToTime(ms) {
    let seconds = Math.floor((ms / 1000) % 60);
    let minutes = Math.floor((ms / (1000 * 60)) % 60);
    let hours = Math.floor(ms / (1000 * 60 * 60));

    let str = "";
    if (hours > 0) str += `${hours} hour(s) `;
    if (minutes > 0) str += `${minutes} minute(s) `;
    if (seconds > 0) str += `${seconds} second(s)`;

    return str.trim();
}

module.exports = {
    name: "broadcastch",
    category: "misc",
    description: "Send a message to all registered channels.",
    code: async (ctx, { isOwner, isPremium, getCoins, updateCoins, db }) => {
        const userId = ctx.from.id;
        const message = ctx.message.text.split(" ").slice(1).join(" ");

        if (!message) {
            return ctx.reply("Please provide a message to broadcast to channels.");
        }

        const channels = db.get("channels") || [];
        if (channels.length === 0) {
            return ctx.reply("There are no channels registered for broadcast.");
        }

        if (isOwner(userId)) {
            // Owner bypasses all checks
            return broadcastMessage(ctx, message, channels, 0, userId, getCoins);
        }

        const cooldowns = db.get("broadcastch_cooldown") || {};
        const lastBroadcast = cooldowns[userId] || 0;
        const now = Date.now();

        const cooldownHours = isPremium(userId) ? COOLDOWN_PREMIUM_HOURS : COOLDOWN_REGULAR_HOURS;
        const cooldownMs = cooldownHours * 60 * 60 * 1000;

        const timeSinceLast = now - lastBroadcast;

        if (timeSinceLast < cooldownMs) {
            const remainingMs = cooldownMs - timeSinceLast;
            const userCoins = getCoins(userId);

            if (userCoins >= COOLDOWN_BYPASS_COST) {
                return ctx.reply(
                    `You are on cooldown for another ${msToTime(remainingMs)}. Would you like to spend ${COOLDOWN_BYPASS_COST} coins to bypass this?`,
                    {
                        reply_to_message_id: ctx.message.message_id,
                        ...Markup.inlineKeyboard([
                            Markup.button.callback("Yes, spend 50 coins", `bypass_bch_${userId}`),
                            Markup.button.callback("No, I will wait", "cancel_bypass")
                        ])
                    }
                );
            } else {
                return ctx.reply(`You are on cooldown for another ${msToTime(remainingMs)}. You also do not have enough coins (${COOLDOWN_BYPASS_COST} required) to bypass it.`);
            }
        }

        // If not on cooldown, proceed with broadcast
        const broadcastResult = await broadcastMessage(ctx, message, channels, 0, userId, getCoins);
        if (broadcastResult.success > 0) {
            cooldowns[userId] = Date.now();
            db.set("broadcastch_cooldown", cooldowns);
        }
        return;
    },

    callback: async (ctx, { isOwner, isPremium, getCoins, updateCoins, db }) => {
        if (!ctx.callbackQuery || !ctx.callbackQuery.data) return;
        const userId = ctx.from.id;
        const query = ctx.callbackQuery.data;

        if (query === "cancel_bypass") {
            return ctx.editMessageText("Broadcast canceled. Please wait for your cooldown to expire.");
        }

        if (query.startsWith("bypass_bch_")) {
            const targetUserId = parseInt(query.split("_")[2]);

            if (userId !== targetUserId) {
                return ctx.answerCbQuery("This is not for you.", { show_alert: true });
            }

            const userCoins = getCoins(userId);
            if (userCoins < COOLDOWN_BYPASS_COST) {
                return ctx.editMessageText(`You no longer have enough coins to bypass the cooldown. You need ${COOLDOWN_BYPASS_COST}, but you only have ${userCoins}.`);
            }

            if (!ctx.callbackQuery.message.reply_to_message) {
                return ctx.editMessageText("Cannot find the original message. Broadcast failed.");
            }

            await ctx.editMessageText("Cooldown bypassed. Starting broadcast...");

            // Deduct coins
            updateCoins(userId, userCoins - COOLDOWN_BYPASS_COST);

            const originalMessageText = ctx.callbackQuery.message.reply_to_message.text;
            const message = originalMessageText.split(" ").slice(1).join(" ");
            const channels = db.get("channels") || [];

            const broadcastResult = await broadcastMessage(ctx, message, channels, COOLDOWN_BYPASS_COST, userId, getCoins);
            if (broadcastResult.success > 0) {
                const cooldowns = db.get("broadcastch_cooldown") || {};
                cooldowns[userId] = Date.now();
                db.set("broadcastch_cooldown", cooldowns);
            }
        }
    }
};

async function broadcastMessage(ctx, message, channels, cost, userId, getCoins) {
    let successCount = 0;
    let failureCount = 0;
    const totalChannels = channels.length;

    await ctx.reply(`Starting channel broadcast to ${totalChannels} channels...`);

    for (const channelId of channels) {
        try {
            await ctx.telegram.sendMessage(channelId, message, { parse_mode: "HTML" });
            successCount++;
        } catch (error) {
            console.error(`Failed to send message to channel ${channelId}:`, error.description);
            failureCount++;
        }
    }

    let feedback = `Channel broadcast finished.\n✅ Sent to ${successCount} channels.\n❌ Failed for ${failureCount} channels.`;
    if (cost > 0) {
        feedback += `\n\nYou were charged ${cost} coins. Your new balance is ${getCoins(userId)}.`;
    }
    await ctx.reply(feedback);
    return { success: successCount, failed: failureCount };
}
