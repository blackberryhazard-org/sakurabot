const fs = require("fs");
const path = require("path");
const axios = require("axios");

module.exports = {
    name: "addgachaitem",
    aliases: [],
    category: "owner",
    code: async (ctx, { isOwner, db }) => {
        if (!isOwner(ctx.from.id)) {
            return ctx.reply(global.config.msg.notOwner);
        }

        if (!ctx.message.reply_to_message || !ctx.message.reply_to_message.document) {
            return ctx.reply("Please reply to a file to add it as a gacha item.");
        }

        const file = ctx.message.reply_to_message.document;
        const fileLink = await ctx.telegram.getFileLink(file.file_id);
        const gachaDir = path.resolve(__dirname, "../../gacha");

        if (!fs.existsSync(gachaDir)) {
            fs.mkdirSync(gachaDir, { recursive: true });
        }

        const filePath = path.join(gachaDir, file.file_name);

        try {
            const response = await axios({
                url: fileLink.href,
                method: "GET",
                responseType: "stream"
            });

            const writer = fs.createWriteStream(filePath);
            response.data.pipe(writer);

            await new Promise((resolve, reject) => {
                writer.on("finish", resolve);
                writer.on("error", reject);
            });

            await ctx.reply(`Successfully added ${file.file_name} to the gacha items.`);

            // Broadcast to all users
            const users = db.get("users") || [];
            for (const user of users) {
                try {
                    await ctx.telegram.sendMessage(user, `A new gacha item has been added: ${file.file_name}`);
                } catch (e) {
                    console.error(`Failed to send broadcast to user ${user}:`, e);
                }
            }

        } catch (error) {
            console.error("Error adding gacha item:", error);
            await ctx.reply("An error occurred while adding the gacha item.");
        }
    }
};
