const fs = require("fs");
const path = require("path");
const archiver = require("archiver");

module.exports = {
    name: "backup",
    category: "owner",
    code: async (ctx, { config }) => {
        if (!config.owner.telegramId || ctx.from.id.toString() !== config.owner.telegramId.toString()) {
            return ctx.reply(config.msg.owner);
        }

        try {
            await ctx.reply("Creating backup...");
            const outputPath = path.resolve(__dirname, `../../../backup-${Date.now()}.zip`);
            const output = fs.createWriteStream(outputPath);
            const archive = archiver("zip", { zlib: { level: 9 } });

            output.on("close", async () => {
                try {
                    await ctx.replyWithDocument({ source: outputPath, filename: path.basename(outputPath) });
                    if (fs.existsSync(outputPath)) fs.unlinkSync(outputPath);

                    // Send config.json
                    const configPath = path.resolve(__dirname, "../../../config.json");
                    await ctx.replyWithDocument({ source: configPath, filename: "config.json" });
                } catch (error) {
                    ctx.reply(`Error sending backup: ${error.message}`);
                }
            });

            archive.on("error", (err) => {
                ctx.reply(`Error during archiving: ${err.message}`);
                output.end();
            });

            archive.pipe(output);
            archive.directory(path.resolve(__dirname, "../../../database"), false);
            await archive.finalize();
        } catch (err) {
            ctx.reply(`Error creating backup: ${err.message}`);
        }
    }
};
