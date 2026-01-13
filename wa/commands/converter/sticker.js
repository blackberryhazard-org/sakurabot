const { Sticker, StickerTypes } = require("wa-sticker-formatter");

module.exports = {
    name: "sticker",
    aliases: ["s", "stiker"],
    category: "converter",
    code: async (ctx) => {
        const [checkMedia, checkQuotedMedia] = [
            tools.cmd.checkMedia(ctx.msg.messageType, ["image", "gif", "video"]),
            tools.cmd.checkQuotedMedia(ctx.quoted?.messageType, ["image", "gif", "video"])
        ];

        if (!checkMedia && !checkQuotedMedia) return await ctx.reply(tools.msg.generateInstruction(["send", "reply"], ["image", "gif", "video"]));

        try {
            const buffer = await ctx.msg.download() || await ctx.quoted.download();

            // Provide default values if config strings are empty
            const packname = config.sticker.packname || config.bot.name || "SakuraBot";
            const author = config.sticker.author || "Made with ❤️ by Reimau";

            const sticker = await new Sticker(buffer)
                .setPack(packname)
                .setAuthor(author)
                .setType(StickerTypes.FULL)
                .setCategories(["🌕"])
                .setID(ctx.msg.key.id)
                .setQuality(50)
                .build();

            await ctx.reply({
                sticker
            });
        } catch (error) {
            await tools.cmd.handleError(ctx, error);
        }
    }
};