const { Consolefy } = require("consolefy");
const consolefy = new Consolefy({ tag: "TG-RULE-ENGINE" });

module.exports = (dependencies) => {
    const { ruleEngine, helpers, bot } = dependencies;
    const { userAccess } = helpers;

    return async (ctx, next) => {
        if (!ctx.message || !ctx.chat) return next();
        if (ctx.from && ctx.from.is_bot) return next();

        const text = ctx.message.text || ctx.message.caption || "";
        const chatId = ctx.chat.id.toString();
        const userId = ctx.from.id.toString();

        // Prepare context for rule engine
        const ruleContext = {
            platform: "tg",
            chatId,
            userId,
            text,
            msg: ctx.message,
            isAdmin: false,
            isBotAdmin: false,
            isOwner: userAccess.isOwner(ctx.from.id),
            botId: bot.botInfo?.id.toString(),
            helpers,
            config: dependencies.config
        };

        // Check if admin/bot admin
        if (ctx.chat.type !== "private") {
            try {
                const member = await ctx.getChatMember(ctx.from.id);
                ruleContext.isAdmin = ["administrator", "creator"].includes(member.status);

                const botMember = await ctx.getChatMember(bot.botInfo.id);
                ruleContext.isBotAdmin = ["administrator"].includes(botMember.status);
            } catch (e) {
                // Silently fail if we can't get member info
            }
        }

        const results = await ruleEngine.evaluate("onMessage", ruleContext);

        for (const result of results) {
            if (result.action === "delete") {
                if (ruleContext.isBotAdmin) {
                    try {
                        await ctx.deleteMessage();
                        if (result.reply) await ctx.reply(result.reply, { parse_mode: "Markdown" });
                    } catch (e) {
                        consolefy.error("Failed to delete message:", e);
                    }
                }
                return; // Stop processing further rules or next middleware if deleted
            } else if (result.action === "reply") {
                await ctx.reply(result.text, { parse_mode: "Markdown" });

                // Special handling for auto-levelup level update
                if (result.rule === "auto-levelup" && result.updateLevel) {
                    const levelData = helpers.db.get("level") || {};
                    levelData[userId] = result.updateLevel;
                    helpers.db.set("level", levelData);
                }
            }
        }

        return next();
    };
};
