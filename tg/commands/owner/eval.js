const util = require("util");

module.exports = {
    name: "eval",
    category: "owner",
    code: async (ctx, { config }) => {
        if (!config.owner.telegramId || ctx.from.id.toString() !== config.owner.telegramId.toString()) {
            return ctx.reply(config.msg.owner);
        }

        const args = ctx.message.text.split(" ").slice(1).join(" ");

        if (!args) return ctx.reply("Please provide code to evaluate.");

        try {
            let evaled = eval(args);
            if (typeof evaled !== "string") evaled = util.inspect(evaled);
            ctx.reply(`<pre>${evaled}</pre>`, { parse_mode: "HTML" });
        } catch (err) {
            ctx.reply(`<pre>${err}</pre>`, { parse_mode: "HTML" });
        }
    }
};
