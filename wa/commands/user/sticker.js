const { Sticker, StickerTypes } = require("wa-sticker-formatter");

module.exports = {
    name: "sticker",
    aliases: ["s"],
    category: "user",
    code: async (sock, m, { ctx, config, tools }) => {
        const checkMedia = [
            tools.cmd.checkMedia(Object.keys(m.message)[0], ["image", "video"]),
            tools.cmd.checkMedia(ctx.quoted?.messageType, ["image", "video"])
        ];

        const checkQuotedMedia = [
            tools.cmd.checkQuotedMedia(Object.keys(m.message)[0], ["image", "video"]),
            tools.cmd.checkQuotedMedia(ctx.quoted?.messageType, ["image", "video"])
        ];

        if (!checkMedia.some(Boolean) && !checkQuotedMedia.some(Boolean)) {
            // Check if tools.msg exists, otherwise use fallback text
            const instruction = tools.msg ? tools.msg.generateInstruction(["send", "reply"], ["image", "video"]) : "Send/reply an image or video to create a sticker.";
            return await ctx.reply(instruction);
        }

        await ctx.reply(config.msg.wait);

        try {
            const buffer = await ctx.msg.download() || await ctx.quoted.download();
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
