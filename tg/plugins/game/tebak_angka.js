export default (bot) => {
  bot.action("tebak_angka", async (ctx) => {
    const txtGame = `<b>🎮 GAME TEBAK ANGKA</b>\nPilih satu angka dari 1 - 5.`;
    ctx
      .editMessageCaption(txtGame, {
        parse_mode: "HTML",
        reply_markup: {
          inline_keyboard: [
            [
              { text: "1", callback_data: "bet_1" },
              { text: "2", callback_data: "bet_2" },
              { text: "3", callback_data: "bet_3" },
            ],
            [
              { text: "4", callback_data: "bet_4" },
              { text: "5", callback_data: "bet_5" },
            ],
            [{ text: "⬅️ Kembali", callback_data: "back_home" }],
          ],
        },
      })
      .catch((e) => {
        (global.consolefy?.error || console.error)("Error execution:", e);
      });
  });

  bot.action(/^bet_(\d+)$/, async (ctx) => {
    const { db, saveDB } = ctx.tgbot;
    const userId = ctx.from.id;

    const userGuess = parseInt(ctx.match[1]);
    if (db.getUser(userId).coin < 1000)
      return ctx.answerCbQuery("❌ Koin kamu kurang!", { show_alert: true });

    db.updateUser(userId, { coin: (db.getUser(userId)?.coin || 0) - 1000 });
    const botNumber = Math.floor(Math.random() * 5) + 1;
    let resultTxt = "";

    if (userGuess === botNumber) {
      db.updateUser(userId, { coin: (db.getUser(userId)?.coin || 0) + 5000 });
      resultTxt = `🎉 <b>MENANG JACKPOT!</b>\nAngka: <b>${botNumber}</b>\nSelamat! +5.000 Koin!`;
    } else {
      resultTxt = `💀 <b>ZONK</b>\nAngka Bot: <b>${botNumber}</b>\nKoin 1.000 hangus.`;
    }
    await saveDB();

    ctx
      .editMessageCaption(resultTxt, {
        parse_mode: "HTML",
        reply_markup: {
          inline_keyboard: [
            [{ text: "🎮 Main Lagi", callback_data: "tebak_angka" }],
            [{ text: "⬅️ Menu Utama", callback_data: "back_home" }],
          ],
        },
      })
      .catch((e) => {
        (global.consolefy?.error || console.error)("Error execution:", e);
      });
  });
};
