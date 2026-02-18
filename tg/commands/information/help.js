const { Markup } = require("telegraf");

module.exports = {
    name: "help",
    category: "information",
    aliases: ["menu"],
    code: async (ctx, { bot }) => {
        // Unique command objects to avoid counting aliases multiple times
        const uniqueCommands = [...new Set(Array.from(bot.cmd.values()))];
        const totalCommands = uniqueCommands.length;
        const categories = [...new Set(uniqueCommands.map(c => c.category))];
        const totalCategories = categories.length;

        const helpText = `Total Command: ${totalCommands}\n` +
            `Total Kategori: ${totalCategories}\n\n` +
            "Silakan pilih kategori untuk melihat list command:";

        // Generate Buttons (2 kolom)
        const buttons = [];
        for (let i = 0; i < categories.length; i += 2) {
            const row = categories.slice(i, i + 2).map(cat =>
                Markup.button.callback(cat.toUpperCase(), `show_cat:${cat}`)
            );
            buttons.push(row);
        }

        const randomImageUrl = `https://picsum.photos/500/300?random=${Date.now()}`;

        try {
            await ctx.replyWithPhoto(randomImageUrl, {
                caption: helpText,
                parse_mode: "Markdown",
                ...Markup.inlineKeyboard(buttons)
            });
        } catch (_error) {
            await ctx.reply(helpText, {
                parse_mode: "Markdown",
                ...Markup.inlineKeyboard(buttons)
            });
        }
    }
};
