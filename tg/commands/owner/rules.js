const { Markup } = require("telegraf");

module.exports = {
    name: "rules",
    aliases: ["rule", "configrules"],
    category: "owner",
    code: async (ctx, helpers) => {
        const { userAccess, ruleEngine } = helpers;
        if (!userAccess.isOwner(ctx.from.id)) return;

        const args = ctx.message.text.split(" ").slice(1);
        const chatId = ctx.chat.id.toString();

        if (args.length === 0) {
            const rules = ruleEngine.listRules();
            const chatSettings = ruleEngine.getChatSettings(chatId);

            let text = "🛠️ *Rule Engine Configuration*\n\n";
            text += `Chat ID: ${chatId}\n\n`;

            rules.forEach(rule => {
                const status = chatSettings[rule.name] !== undefined ? chatSettings[rule.name] : rule.enabled;
                text += `${status ? "✅" : "❌"} */${rule.name}*\n`;
                text += `└ ${rule.description}\n`;
            });

            text += "\nUse `/rules [name] [on/off]` to toggle.";
            return ctx.reply(text, { parse_mode: "Markdown" });
        }

        const [ruleName, action] = args;
        const rules = ruleEngine.listRules();
        const rule = rules.find(r => r.name.toLowerCase() === ruleName.toLowerCase());

        if (!rule) {
            return ctx.reply("❌ Rule not found.");
        }

        if (action === "on" || action === "off") {
            const value = action === "on";
            ruleEngine.updateChatSetting(chatId, rule.name, value);
            return ctx.reply(`✅ Rule *${rule.name}* has been turned ${action.toUpperCase()} for this chat.`, { parse_mode: "Markdown" });
        }

        return ctx.reply("❌ Invalid action. Use 'on' or 'off'.");
    }
};
