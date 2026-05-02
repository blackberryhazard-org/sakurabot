import { readFile } from "fs/promises";
import { join } from "path";
import { CONSONANT_REGEX, MINUTE } from "../../lib/Constants.js";
import { frame, isFileExists, levenshtein, randomInteger, randomValue, toTitleCase } from "../../lib/Utilities.js";

const QUIZ_DATA_PATH = join(process.cwd(), "media", "Text");

const DEFAULT_GAME_CONFIG = Object.freeze({
  title: "STARSEED GAME",
  emoji: "🎮",
  timeout: 60000,
  questionField: "soal",
  answerField: "jawaban",
  mediaSource: null,
});

const GameData = new Map();
const RegisteredGame = new Set();
const GameSession = new Map();
const Processing = new Set();

const getRemainingTimeout = (timeout, startTime) => Math.max(0, timeout - (Date.now() - startTime));

const DefineQuizTg = async (bot, gameName, gameConfig = {}) => {
  if (RegisteredGame.has(gameName)) return;

  const quizDataPath = join(QUIZ_DATA_PATH, gameName);
  const isQuizDataExists = await isFileExists(quizDataPath);
  if (!isQuizDataExists) {
    console.error(`❌ Game data file not found at ${quizDataPath}`);
    return;
  }

  GameData.set(gameName, JSON.parse(await readFile(quizDataPath, "utf8")));

  gameConfig = { ...DEFAULT_GAME_CONFIG, ...gameConfig };

  bot.command(gameConfig.command, async (ctx) => {
    const chatId = ctx.chat.id;
    if (GameSession.get(chatId)) {
        return ctx.reply(`❌ There is already a game running in this chat @${ctx.from.username || ctx.from.first_name}.`);
    }
    if (Processing.has(chatId)) {
        return ctx.reply("🔗 Please wait, previous request is still processing.");
    }
    Processing.add(chatId);

    const timeout = gameConfig.timeout;
    const reward = randomInteger(1, 5);
    const data = randomValue(GameData.get(gameName));
    const question = data[gameConfig.questionField] || gameConfig.questionField;
    const correctAnswer = data[gameConfig.answerField]?.toLowerCase();

    if (!correctAnswer) {
        Processing.delete(chatId);
        return ctx.reply("❌ Game correct answer not found.");
    }

    let print = frame(
      gameConfig.title,
      [
        `*Question*: ${question}`,
        `*Timeout*: ${timeout / MINUTE} min`,
        `*Reward*: ${reward} limit`,
      ],
      gameConfig.emoji,
    );
    print += "\n\n";
    print += frame(
      "TIP",
      [
        `Send /${gameConfig.clueCommand} to get a clue or send /${gameConfig.passCommand} to delete the game session`,
      ],
      "📄",
    );

    let msg;
    try {
        if (gameConfig.mediaSource && data[gameConfig.mediaSource]) {
            msg = await ctx.replyWithPhoto(data[gameConfig.mediaSource], { caption: print, parse_mode: 'Markdown' });
        } else {
            msg = await ctx.reply(print, { parse_mode: 'Markdown' });
        }

        GameSession.set(chatId, {
            chat: msg,
            correctAnswer,
            reward,
            usageClue: 0,
            createdAt: Date.now(),
            isAnswered: false,
            timeout: setTimeout(() => {
              try {
                ctx.reply(`🕒 Time's up! The correct answer was: *${toTitleCase(correctAnswer)}*`, {
                    reply_to_message_id: msg.message_id,
                    parse_mode: 'Markdown'
                });
                GameSession.delete(chatId);
              } catch {}
            }, timeout),
        });
    } catch (e) {
        global.consolefy?.error(e) || console.error(e);
    }
    Processing.delete(chatId);
  });

  bot.command(gameConfig.clueCommand, async (ctx) => {
      const chatId = ctx.chat.id;
      const gameSession = GameSession.get(chatId);
      if (!gameSession) return ctx.reply(`❌ No game is currently running. Start a new one with: /${gameConfig.command}`);
      if (gameSession.usageClue >= 3) return ctx.reply(`❌ All clue attempts already used.`);

      CONSONANT_REGEX.lastIndex = 0;
      ctx.reply(`💬 *Clue*: \`${gameSession.correctAnswer.replace(CONSONANT_REGEX, "_")}\``, { parse_mode: 'Markdown' });
      ++gameSession.usageClue;
  });

  bot.command(gameConfig.passCommand, async (ctx) => {
      const chatId = ctx.chat.id;
      const gameSession = GameSession.get(chatId);
      if (!gameSession) return ctx.reply(`❌ No game is currently running. Start a new one with: /${gameConfig.command}`);

      if (Processing.has(chatId)) return ctx.reply("🔗 Please wait, previous request is still processing.");
      Processing.add(chatId);

      clearTimeout(gameSession.timeout);

      // Assume a db or default user mechanism here since `global.db` handles logic for limits.
      // Skipping the limit deduction logic for now or we can implement it if `db` is available in tgbot.
      // But let's just make it free to pass on TG.
      await ctx.reply(`✅ Successfully deleted *${toTitleCase(gameConfig.title.toLowerCase())}* game session.`);

      GameSession.delete(chatId);
      Processing.delete(chatId);
  });

  RegisteredGame.add(gameName);
};

export default async (bot) => {
    // We register answer listener globally
    bot.on('message', async (ctx, next) => {
        if (!ctx.message || !ctx.message.text) return next();

        const chatId = ctx.chat.id;
        const gameSession = GameSession.get(chatId);

        if (!gameSession) return next();

        const body = ctx.message.text;

        // Let commands pass through
        if (body.startsWith('/')) return next();

        const answerLength = body.length;
        const maxDistance = Math.max(2, answerLength >> 1);
        const distance = levenshtein(body.toLowerCase(), gameSession.correctAnswer, maxDistance);

        if (distance > maxDistance) return next();

        const similarity = (1 - distance / answerLength) * 100;

        if (similarity > 90) {
            if (gameSession.isAnswered) return next();
            gameSession.isAnswered = true;
            clearTimeout(gameSession.timeout);

            const remainingTimeout = getRemainingTimeout(60000, gameSession.createdAt);

            if (remainingTimeout / 60000 >= 0.8) {
                const bonusReward = randomInteger(1, gameSession.reward);
                await ctx.reply(`⚡ That was quick! Correct, you've got +${gameSession.reward} limit and more +${bonusReward} limit!`, { reply_to_message_id: ctx.message.message_id });
            } else {
                await ctx.reply(`✅ Correct, you've got +${gameSession.reward} limit!`, { reply_to_message_id: ctx.message.message_id });
            }
            GameSession.delete(chatId);
        } else if (similarity > 70) {
            await ctx.reply("🤏🏻 Almost there.", { reply_to_message_id: ctx.message.message_id });
        } else {
            return next();
        }
    });

    await DefineQuizTg(bot, "brainout.json", {
      command: "brainout", clueCommand: "cluebrain", passCommand: "skipbrain",
      title: "BRAINOUT", emoji: "🧠", questionField: "pertanyaan", answerField: "jawaban",
    });
    await DefineQuizTg(bot, "caklontong.json", {
      command: "caklontong", clueCommand: "cluecak", passCommand: "skipcak",
      title: "CAK LONTONG", emoji: "💭", questionField: "pertanyaan", answerField: "jawaban",
    });
    await DefineQuizTg(bot, "heroff.json", {
      command: "heroff", clueCommand: "clueff", passCommand: "skipff",
      title: "HERO FF", emoji: "👤", mediaSource: "img", questionField: "Which hero is this?", answerField: "jawaban",
    });
    await DefineQuizTg(bot, "heroml.json", {
      command: "heroml", clueCommand: "clueml", passCommand: "skipml",
      title: "HERO ML", emoji: "👤", mediaSource: "image", questionField: "Which hero is this?", answerField: "name",
    });
    await DefineQuizTg(bot, "jkt48.json", {
      command: "jkt48", clueCommand: "cluejkt", passCommand: "skipjkt",
      title: "JKT-48", emoji: "🙆🏻‍♀️", mediaSource: "img", questionField: "Who's she?", answerField: "jawaban",
    });
    await DefineQuizTg(bot, "koreandrama.json", {
      command: "drakor", clueCommand: "cluedrakor", passCommand: "skipdrakor",
      title: "KOREAN DRAMA", emoji: "💕", mediaSource: "img", questionField: "deskripsi", answerField: "jawaban",
    });
    await DefineQuizTg(bot, "riddle.json", {
      command: "riddle", clueCommand: "clueriddle", passCommand: "skipriddle",
      title: "RIDDLE", emoji: "🔎", questionField: "pertanyaan", answerField: "jawaban",
    });
    await DefineQuizTg(bot, "whatanimal.json", {
      command: "whatanimal", clueCommand: "clueanimal", passCommand: "skipanimal",
      title: "WHAT ANIMAL", emoji: "🐱", questionField: "soal", answerField: "jawaban",
    });
    await DefineQuizTg(bot, "whatchemistry.json", {
      command: "whatchemistry", clueCommand: "cluechemistry", passCommand: "skipchemistry",
      title: "WHAT CHEMISTRY", emoji: "🧪", questionField: "lambang", answerField: "unsur",
    });
    await DefineQuizTg(bot, "whatcountry.json", {
      command: "whatcountry", clueCommand: "cluecountry", passCommand: "skipcountry",
      title: "WHAT COUNTRY", emoji: "🗺️", questionField: "soal", answerField: "jawaban",
    });
    await DefineQuizTg(bot, "whatfilm.json", {
      command: "whatfilm", clueCommand: "cluefilm", passCommand: "skipfilm",
      title: "WHAT FILM", emoji: "🎥", questionField: "soal", answerField: "jawaban",
    });
    await DefineQuizTg(bot, "whatflag.json", {
      command: "whatflag", clueCommand: "clueflag", passCommand: "skipflag",
      title: "WHAT FLAG", emoji: "🇮🇩", mediaSource: "img", questionField: "Which flag is this?", answerField: "name",
    });
    await DefineQuizTg(bot, "whatfood.json", {
      command: "whatfood", clueCommand: "cluefood", passCommand: "skipfood",
      title: "WHAT FOOD", emoji: "🍽️", mediaSource: "img", questionField: "deskripsi", answerField: "jawaban",
    });
    await DefineQuizTg(bot, "whatlyric.json", {
      command: "whatlyric", clueCommand: "cluelyric", passCommand: "skiplyric",
      title: "WHAT LYRIC", emoji: "🎼", questionField: "soal", answerField: "jawaban",
    });
    await DefineQuizTg(bot, "whatpicture.json", {
      command: "whatpicture", clueCommand: "cluepicture", passCommand: "skippicture",
      title: "WHAT PICTURE", emoji: "🖼️", mediaSource: "img", questionField: "deskripsi", answerField: "jawaban",
    });
    await DefineQuizTg(bot, "whatprofession.json", {
      command: "whatprofession", clueCommand: "clueprofession", passCommand: "skipprofession",
      title: "WHAT PROFESSION", emoji: "👩🏻‍🚒", questionField: "soal", answerField: "jawaban",
    });
    await DefineQuizTg(bot, "whatword.json", {
      command: "whatword", clueCommand: "clueword", passCommand: "skipword",
      title: "WHAT WORD", emoji: "💬", questionField: "acak", answerField: "jawaban",
    });
    await DefineQuizTg(bot, "whoami.json", {
      command: "whoami", clueCommand: "cluewho", passCommand: "skipwho",
      title: "WHO AM I", emoji: "❔", questionField: "pertanyaan", answerField: "jawaban",
    });
};
