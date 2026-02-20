const axios = require("axios");

class GameService {
    constructor(economyService) {
        this.economyService = economyService;
        this.games = {
            family100: {
                name: "FAMILY 100",
                url: "https://raw.githubusercontent.com/BochilTeam/database/refs/heads/master/games/family100.json",
                timeout: 90000,
                rewardPerAnswer: 100,
                rewardAllAnswered: 500,
                isMulti: true
            },
            tebakgambar: {
                name: "TEBAK GAMBAR",
                url: "https://raw.githubusercontent.com/BochilTeam/database/refs/heads/master/games/tebakgambar.json",
                timeout: 60000,
                reward: 500
            },
            tebakbendera: {
                name: "TEBAK BENDERA",
                url: "https://raw.githubusercontent.com/BochilTeam/database/refs/heads/master/games/tebakbendera.json",
                timeout: 60000,
                reward: 500
            },
            caklontong: {
                name: "CAK LONTONG",
                url: "https://raw.githubusercontent.com/BochilTeam/database/refs/heads/master/games/caklontong.json",
                timeout: 60000,
                reward: 500
            },
            tebakhewan: {
                name: "TEBAK HEWAN",
                url: "https://raw.githubusercontent.com/BochilTeam/database/refs/heads/master/games/tebakhewan.json",
                timeout: 60000,
                reward: 500
            },
            siapakahaku: {
                name: "SIAPAKAH AKU",
                url: "https://raw.githubusercontent.com/BochilTeam/database/refs/heads/master/games/siapakahaku.json",
                timeout: 60000,
                reward: 500
            },
            tebaktebakan: {
                name: "TEBAK TEBAKAN",
                url: "https://raw.githubusercontent.com/BochilTeam/database/refs/heads/master/games/tebaktebakan.json",
                timeout: 60000,
                reward: 500
            },
            tebakkata: {
                name: "TEBAK KATA",
                url: "https://raw.githubusercontent.com/BochilTeam/database/refs/heads/master/games/tebakkata.json",
                timeout: 60000,
                reward: 500
            },
            susunkata: {
                name: "SUSUN KATA",
                url: "https://raw.githubusercontent.com/BochilTeam/database/refs/heads/master/games/susunkata.json",
                timeout: 60000,
                reward: 500
            },
            asahotak: {
                name: "ASAH OTAK",
                url: "https://raw.githubusercontent.com/BochilTeam/database/refs/heads/master/games/asahotak.json",
                timeout: 60000,
                reward: 500
            },
            tebakkimia: {
                name: "TEBAK KIMIA",
                url: "https://raw.githubusercontent.com/BochilTeam/database/refs/heads/master/games/tebakkimia.json",
                timeout: 60000,
                reward: 500
            },
            lengkapikalimat: {
                name: "LENGKAPI KALIMAT",
                url: "https://raw.githubusercontent.com/BochilTeam/database/refs/heads/master/games/lengkapikalimat.json",
                timeout: 60000,
                reward: 500
            },
            tebakkalimat: {
                name: "TEBAK KALIMAT",
                url: "https://raw.githubusercontent.com/BochilTeam/database/refs/heads/master/games/tebakkalimat.json",
                timeout: 60000,
                reward: 500
            },
            tekateki: {
                name: "TEKA TEKI",
                url: "https://raw.githubusercontent.com/BochilTeam/database/refs/heads/master/games/tekateki.json",
                timeout: 60000,
                reward: 500
            }
        };
    }

    /**
     * Fetches a random question for the specified game.
     * @param {string} gameName
     * @returns {Promise<Object>}
     */
    async fetchQuestion(gameName) {
        const gameConfig = this.games[gameName];
        if (!gameConfig) throw new Error("Game not found");

        const { data } = await axios.get(gameConfig.url);
        // Using global tools for now as it's injected, but better to move this utility to src/utils
        const result = global.tools.cmd.getRandomElement(data);

        let questionData = {
            name: gameName,
            title: gameConfig.name,
            timeout: gameConfig.timeout,
            startTime: Date.now()
        };

        if (gameName === "family100") {
            questionData.answers = result.jawaban.map(ans => ans.toLowerCase());
            questionData.answered = [];
            questionData.rewardPerAnswer = gameConfig.rewardPerAnswer;
            questionData.rewardAllAnswered = gameConfig.rewardAllAnswered;
            questionData.question = result.soal;
        } else if (gameName === "tebakbendera") {
            questionData.answer = result.name.toLowerCase();
            questionData.reward = gameConfig.reward;
            questionData.image = result.img;
            questionData.question = "Bendera negara apakah ini?";
        } else if (gameName === "tebakgambar") {
            questionData.answer = result.jawaban.toLowerCase();
            questionData.reward = gameConfig.reward;
            questionData.image = result.img;
            questionData.question = result.deskripsi;
        } else {
            questionData.answer = result.jawaban.toLowerCase();
            questionData.reward = gameConfig.reward;
            questionData.question = result.soal;
            if (result.deskripsi) questionData.description = result.deskripsi;
        }

        return questionData;
    }

    /**
     * Handles common game interactions (answer, hint, surrender).
     * @param {Object} session
     * @param {string} body
     * @param {string|number} senderId
     * @param {string} senderName
     * @returns {Object|null}
     */
    handleAnswer(session, body, senderId, senderName) {
        const bodyLower = body.trim().toLowerCase();

        if (bodyLower === "hint") {
            if (session.answers) {
                return { status: "hint_not_available", message: "Petunjuk tidak tersedia untuk game ini." };
            }
            if (session.answer) {
                const clue = session.answer.replace(/[aiueo]/g, "_").toUpperCase();
                return { status: "hint", message: `Petunjuk: \`${clue}\`` };
            }
        }

        if (bodyLower === "surrender") {
            if (session.answers) {
                const remaining = session.answers.filter(ans => !session.answered.includes(ans));
                return { status: "surrender", message: `Anda menyerah! Jawaban yang belum terjawab adalah: *${remaining.join(", ").toUpperCase()}*`, remaining };
            } else {
                return { status: "surrender", message: `Anda menyerah! Jawabannya adalah *${session.answer.toUpperCase()}*.`, answer: session.answer };
            }
        }

        if (session.answers) {
            if (session.answers.includes(bodyLower)) {
                if (session.answered.includes(bodyLower)) {
                    return { status: "already_answered", message: `Jawaban *${bodyLower.toUpperCase()}* sudah terjawab!` };
                }

                session.answered.push(bodyLower);
                const reward = session.rewardPerAnswer || 100;
                this.economyService.addBalance(senderId, reward, "sakuranite", "game_reward");

                const remainingCount = session.answers.length - session.answered.length;
                if (remainingCount === 0) {
                    const totalReward = session.rewardAllAnswered || 500;
                    this.economyService.addBalance(senderId, totalReward, "sakuranite", "game_bonus");
                    return {
                        status: "game_over",
                        message: `Selamat @${senderName}! Jawaban *${bodyLower.toUpperCase()}* benar!\n\n` +
                                 `Semua jawaban telah terjawab! Anda mendapatkan bonus tambahan ${totalReward} Sakuranite.`,
                        mentions: [senderId],
                        reward: reward + totalReward
                    };
                } else {
                    return {
                        status: "correct",
                        message: `Selamat @${senderName}! Jawaban *${bodyLower.toUpperCase()}* benar!\n` +
                                 `Tersisa ${remainingCount} jawaban lagi.`,
                        mentions: [senderId],
                        reward: reward
                    };
                }
            }
        } else if (bodyLower === session.answer) {
            const reward = session.reward || 500;
            this.economyService.addBalance(senderId, reward, "sakuranite", "game_reward");
            return {
                status: "game_over",
                message: `Selamat @${senderName}! Jawaban Anda benar: *${session.answer.toUpperCase()}*\n\n` +
                         (session.description ? `Deskripsi: ${session.description}\n\n` : "") +
                         `Anda mendapatkan ${reward} Sakuranite!`,
                mentions: [senderId],
                reward: reward
            };
        }

        return null;
    }
}

module.exports = GameService;
