const axios = require("axios");

module.exports = {
    name: "tebakkimia",
    code: async (sock, m, { from, waBot }) => {
        if (waBot.games.has(from)) return await sock.sendMessage(from, { text: "Sesi permainan sedang berjalan di chat ini!" }, { quoted: m });

        try {
            const apiUrl = "https://raw.githubusercontent.com/BochilTeam/database/refs/heads/master/games/tebakkimia.json";
            const { data } = await axios.get(apiUrl);
            const result = tools.cmd.getRandomElement(data);

            const game = {
                name: "tebakkimia",
                answer: result.unsur.toLowerCase(),
                reward: 500,
                timeout: 60000,
                startTime: Date.now()
            };

            waBot.games.set(from, game);

            await sock.sendMessage(from, {
                text: `— *TEBAK KIMIA* —\n\n` +
                    `Apa nama unsur kimia dari lambang: *${result.lambang}*?\n\n` +
                    `➛ *Bonus*: ${game.reward} Sakuranite\n` +
                    `➛ *Batas waktu*: ${tools.msg.convertMsToDuration(game.timeout)}\n\n` +
                    `Ketik jawaban Anda langsung. Ketik *hint* untuk petunjuk atau *surrender* untuk menyerah.`
            }, { quoted: m });

            game.timeoutRef = setTimeout(async () => {
                if (waBot.games.has(from) && waBot.games.get(from).startTime === game.startTime) {
                    waBot.games.delete(from);
                    await sock.sendMessage(from, { text: `Waktu habis! Jawabannya adalah *${game.answer.toUpperCase()}*.` });
                }
            }, game.timeout);
        } catch (error) {
            consolefy.error(error);
            await sock.sendMessage(from, { text: "Terjadi kesalahan saat mengambil soal." }, { quoted: m });
        }
    }
};
