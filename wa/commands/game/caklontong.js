module.exports = {
    name: "caklontong",
    code: async (sock, m, { from, waBot, game }) => {
        if (waBot.games.has(from)) return await sock.sendMessage(from, { text: "Sesi permainan sedang berjalan di chat ini!" }, { quoted: m });

        try {
            const game = await game.fetchQuestion("caklontong");
            waBot.games.set(from, game);

            if (game.image) {
                await sock.sendMessage(from, {
                    image: { url: game.image },
                    caption: `— *${game.title}* —\n\n` +
                        `${game.question}\n\n` +
                        `➛ *Bonus*: ${game.reward} Sakuranite\n` +
                        `➛ *Batas waktu*: ${tools.msg.convertMsToDuration(game.timeout)}\n\n` +
                        "Ketik jawaban Anda langsung. Ketik *hint* untuk petunjuk atau *surrender* untuk menyerah."
                }, { quoted: m });
            } else if (game.name === "family100") {
                await sock.sendMessage(from, {
                    text: `— *${game.title}* —\n\n${game.question}\n\n` +
                        `➛ *Total Jawaban*: ${game.answers.length}\n` +
                        `➛ *Bonus*: ${game.rewardPerAnswer} Sakuranite per jawaban\n` +
                        `➛ *Batas waktu*: ${tools.msg.convertMsToDuration(game.timeout)}\n\n` +
                        "Ketik jawaban Anda langsung. Ketik *surrender* untuk menyerah."
                }, { quoted: m });
            } else {
                await sock.sendMessage(from, {
                    text: `— *${game.title}* —\n\n${game.question}\n\n` +
                        `➛ *Bonus*: ${game.reward} Sakuranite\n` +
                        `➛ *Batas waktu*: ${tools.msg.convertMsToDuration(game.timeout)}\n\n` +
                        "Ketik jawaban Anda langsung. Ketik *hint* untuk petunjuk atau *surrender* untuk menyerah."
                }, { quoted: m });
            }

            game.timeoutRef = setTimeout(async () => {
                if (waBot.games.has(from) && waBot.games.get(from).startTime === game.startTime) {
                    if (game.answers) {
                        const remaining = game.answers.filter(ans => !game.answered.includes(ans));
                        waBot.games.delete(from);
                        await sock.sendMessage(from, { text: `Waktu habis! Jawaban yang belum terjawab adalah: *${remaining.join(", ").toUpperCase()}*` });
                    } else {
                        waBot.games.delete(from);
                        await sock.sendMessage(from, { text: `Waktu habis! Jawabannya adalah *${game.answer.toUpperCase()}*.${game.description ? `\n\nDeskripsi: ${game.description}` : ""}` });
                    }
                }
            }, game.timeout);
        } catch (error) {
            consolefy.error(error);
            await sock.sendMessage(from, { text: "Terjadi kesalahan saat mengambil soal." }, { quoted: m });
        }
    }
};
