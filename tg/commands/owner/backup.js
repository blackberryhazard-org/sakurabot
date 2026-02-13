const archiver = require("archiver");
const fs = require("fs");
const path = require("path");

module.exports = {
    name: "backup",
    category: "owner",
    code: async (ctx, { isLeader, config }) => {
        if (!isLeader(ctx.from.id)) {
            return ctx.reply(config.msg.owner);
        }

        const backupPath = path.resolve(__dirname, "../../../database");
        const outputPath = path.resolve(__dirname, `../../../backup-${Date.now()}.zip`);

        const output = fs.createWriteStream(outputPath);
        const archive = archiver("zip", {
            zlib: { level: 9 }
        });

        output.on("close", async () => {
            try {
                await ctx.telegram.sendDocument(ctx.from.id, {
                    source: outputPath,
                    filename: path.basename(outputPath)
                });
                fs.unlinkSync(outputPath); // Clean up the zip file

                // Send config.json
                const configPath = path.resolve(__dirname, "../../../config.json");
                await ctx.telegram.sendDocument(ctx.from.id, {
                    source: configPath,
                    filename: "config.json"
                });
            } catch (error) {
                console.error("Failed to send backup:", error);
                ctx.reply("Failed to send backup file(s).");
            }
        });

        archive.on("error", (err) => {
            throw err;
        });

        archive.pipe(output);
        archive.directory(backupPath, false);
        archive.finalize();
    }
};
