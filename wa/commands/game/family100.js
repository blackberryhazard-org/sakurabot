const axios = require("axios");

module.exports = {
    name: "family100",
    code: async (sock, m, { from, waBot }) => {
        if (waBot.games.has(from)) return await sock.sendMessage(from, { text: "Sesi permainan sedang berjalan di chat ini!" }, { quoted: m });

        try {
            const apiUrl = "https://raw.githubusercontent.com/BochilTeam/database/refs/heads/master/games/family100.json";
            const { data } = await axios.get(apiUrl);
            const result = tools.cmd.getRandomElement(data);

            const game = {
                name: "family100",
                answers: result.jawaban.map(ans => ans.toLowerCase()),
                answered: [],
                rewardPerAnswer: 100,
                rewardAllAnswered: 500,
                timeout: 90000,
                startTime: Date.now()
            };

            waBot.games.set(from, game);

            await sock.sendMessage(from, {
                text: `— *FAMILY 100* —\n\n${result.soal}\n\n` +
                    `➛ *Total Jawaban*: ${game.answers.length}\n` +
                    `➛ *Bonus*: ${game.rewardPerAnswer} Sakuranite per jawaban\n` +
                    `➛ *Batas waktu*: ${tools.msg.convertMsToDuration(game.timeout)}\n\n` +
                    `Ketik jawaban Anda langsung. Ketik *surrender* untuk menyerah.`
            }, { quoted: m });

            game.timeoutRef = setTimeout(async () => {
                if (waBot.games.has(from) && waBot.games.get(from).startTime === game.startTime) {
                    const remaining = game.answers.filter(ans => !game.answered.includes(ans));
                    waBot.games.delete(from);
                    await sock.sendMessage(from, { text: `Waktu habis! Jawaban yang belum terjawab adalah: *${remaining.join(", ").toUpperCase()}*` });
                }
            }, game.timeout);
        } catch (error) {
            consolefy.error(error);
            await sock.sendMessage(from, { text: "Terjadi kesalahan saat mengambil soal." }, { quoted: m });
        }
    }
};
