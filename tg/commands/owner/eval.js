const util = require("util");

module.exports = {
    name: "eval",
    category: "owner",
    code: async (ctx, { config }) => {
        if (!config.owner.telegramId || ctx.from.id.toString() !== config.owner.telegramId.toString()) {
            return ctx.reply(config.msg.owner);
        }

        const args = ctx.message.text.split(" ").slice(1);
        const code = args.join(" ");

        if (!code) return ctx.reply("Please provide code to evaluate.");

        try {

            let evaled = eval(code);
            if (typeof evaled !== "string") evaled = util.inspect(evaled);
            ctx.reply(`\`\`\`\n${evaled}\n\`\`\``, { parse_mode: "Markdown" });
        } catch (err) {
            ctx.reply(`\`\`\`\n${err}\n\`\`\``, { parse_mode: "Markdown" });
        }
    }
};
