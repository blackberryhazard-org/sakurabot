module.exports = {
    name: "newtesti",
    category: "owner",
    code: async (ctx, { config, bot }) => {
        if (!config.owner.telegramId || ctx.from.id.toString() !== config.owner.telegramId.toString()) {
            return ctx.reply(config.msg.owner);
        }

        const args = ctx.message.text.split(" ").slice(1).join(" ");

        if (!args) return ctx.reply("Please provide testimonial text.");

        const id_channel = config.tgbot.newsletterId;
        if (id_channel) {
            try {
                const broadcastMessage = `📢 <b>NEW TESTIMONIAL</b>\n\n${args}\n\n— <b>From:</b> ${ctx.from.first_name}`;
                await bot.telegram.sendMessage(id_channel, broadcastMessage, { parse_mode: "HTML" });
                return ctx.reply("Testimonial posted to channel.");
            } catch (e) {
                return ctx.reply(`Failed to post testimonial: ${e.message}`);
            }
        } else {
            return ctx.reply("Telegram newsletter channel ID (<code>newsletterId</code>) is not set in config.json.");
        }
    }
};
