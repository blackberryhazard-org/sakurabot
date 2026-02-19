module.exports = {
    name: "lengkapikalimat",
    code: async (ctx, { bot, game }) => {
        const chatId = ctx.chat.id;
        if (bot.games.has(chatId)) return await ctx.reply("Sesi permainan sedang berjalan di chat ini!");

        try {
            const game = await game.fetchQuestion("lengkapikalimat");
            bot.games.set(chatId, game);

            if (game.image) {
                await ctx.replyWithPhoto(game.image, {
                    caption: `— *${game.title}* —\n\n` +
                        `${game.question}\n\n` +
                        `➛ *Bonus*: ${game.reward} Sakuranite\n` +
                        `➛ *Batas waktu*: ${tools.msg.convertMsToDuration(game.timeout)}\n\n` +
                        "Ketik jawaban Anda langsung. Ketik *hint* untuk petunjuk atau *surrender* untuk menyerah.",
                    parse_mode: "Markdown"
                });
            } else if (game.name === "family100") {
                await ctx.reply(`— *${game.title}* —\n\n${game.question}\n\n` +
                        `➛ *Total Jawaban*: ${game.answers.length}\n` +
                        `➛ *Bonus*: ${game.rewardPerAnswer} Sakuranite per jawaban\n` +
                        `➛ *Batas waktu*: ${tools.msg.convertMsToDuration(game.timeout)}\n\n` +
                        "Ketik jawaban Anda langsung. Ketik *surrender* untuk menyerah.", { parse_mode: "Markdown" });
            } else {
                await ctx.reply(`— *${game.title}* —\n\n${game.question}\n\n` +
                        `➛ *Bonus*: ${game.reward} Sakuranite\n` +
                        `➛ *Batas waktu*: ${tools.msg.convertMsToDuration(game.timeout)}\n\n` +
                        "Ketik jawaban Anda langsung. Ketik *hint* untuk petunjuk atau *surrender* untuk menyerah.", { parse_mode: "Markdown" });
            }

            game.timeoutRef = setTimeout(async () => {
                if (bot.games.has(chatId) && bot.games.get(chatId).startTime === game.startTime) {
                    if (game.answers) {
                        const remaining = game.answers.filter(ans => !game.answered.includes(ans));
                        bot.games.delete(chatId);
                        await ctx.reply(`Waktu habis! Jawaban yang belum terjawab adalah: *${remaining.join(", ").toUpperCase()}*`, { parse_mode: "Markdown" });
                    } else {
                        bot.games.delete(chatId);
                        await ctx.reply(`Waktu habis! Jawabannya adalah *${game.answer.toUpperCase()}*.${game.description ? `\n\nDeskripsi: ${game.description}` : ""}`, { parse_mode: "Markdown" });
                    }
                }
            }, game.timeout);
        } catch (error) {
            console.error(error);
            await ctx.reply("Terjadi kesalahan saat mengambil soal.");
        }
    }
};
