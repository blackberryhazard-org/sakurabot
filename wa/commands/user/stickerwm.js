const { Sticker, StickerTypes } = require("wa-sticker-formatter");

module.exports = {
    name: "stickerwm",
    aliases: ["take", "swm", "stikerwm"],
    category: "converter",
    code: async (sock, m, { ctx, tools, config }) => {
        const input = ctx.text;

        if (!input) {
            return await ctx.reply(
                `${tools.msg.generateInstruction(["send", "reply"], ["text", "sticker"])}\n` +
                tools.msg.generateCmdExample(ctx.used, "stiker saya|reimau von lilitz")
            );
        }

        if (!tools.cmd.checkQuotedMedia(ctx.quoted?.messageType, ["sticker"])) {
            return await ctx.reply(tools.msg.generateInstruction(["reply"], ["sticker"]));
        }

        await ctx.reply(config.msg.wait);

        try {
            const buffer = await ctx.quoted.download();
            const [packname, author] = input.split("|");

            const sticker = new Sticker(buffer, {
                pack: packname || "",
                author: author || "",
                type: StickerTypes.FULL,
                categories: ["🌕"],
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
