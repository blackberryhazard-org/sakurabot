const { Sticker, StickerTypes } = require("wa-sticker-formatter");

module.exports = {
    name: "sticker",
    aliases: ["s"],
    category: "user",
    code: async (sock, m, { ctx, config, tools }) => {
        const checkMedia = tools.cmd.checkMedia(ctx.msg.messageType, ["image", "video"]);
        const checkQuotedMedia = tools.cmd.checkQuotedMedia(ctx.quoted?.messageType, ["image", "video"]);

        if (!checkMedia && !checkQuotedMedia) {
            return await ctx.reply(tools.msg.generateInstruction(["send", "reply"], ["image", "video"]));
        }

        await ctx.reply(config.msg.wait);

        try {
            const buffer = await (checkMedia ? ctx.msg.download() : ctx.quoted.download());
            const [packname, author] = ctx.text?.split("|") || [];

            const sticker = new Sticker(buffer, {
                pack: packname || config.wabot?.sticker?.packname || config.wabot?.name || "SakuraBot",
                author: author || config.wabot?.sticker?.author || "SakuraBot",
                type: StickerTypes.FULL,
                categories: ["🤩", "🎉"],
                quality: 50,
            });

            await ctx.reply({
                sticker: await sticker.toBuffer()
            });
        } catch (error) {
            await tools.cmd.handleError(ctx, error);
        }
    }
};
