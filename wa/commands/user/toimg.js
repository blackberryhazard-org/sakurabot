const Jimp = require("jimp");

module.exports = {
    name: "toimage",
    aliases: ["toimg", "topng"],
    category: "converter",
    code: async (sock, m, { ctx, tools, config }) => {
        if (!tools.cmd.checkQuotedMedia(ctx.quoted?.messageType, ["sticker"])) {
            return await ctx.reply(tools.msg.generateInstruction(["reply"], ["sticker"]));
        }

        await ctx.reply(config.msg.wait);

        try {
            const buffer = await ctx.quoted.download();
            const image = await Jimp.read(buffer);
            const outputBuffer = await image.getBufferAsync(Jimp.MIME_PNG);

            await ctx.reply({
                image: outputBuffer
            });
        } catch (error) {
            await tools.cmd.handleError(ctx, error);
        }
    }
};
