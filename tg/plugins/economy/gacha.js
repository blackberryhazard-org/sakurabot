export default (bot) => {
  bot.action("gacha_script", async (ctx) => {
    const { db, saveDB, config: tgbotConfig, mainMenu } = ctx.tgbot;
    const userId = ctx.from.id;

    if (db.getUser(userId).coin < 10000)
      return ctx.answerCbQuery("❌ Koin kamu kurang 10.000!", {
        show_alert: true,
      });
    if (db.getScripts().length === 0)
      return ctx.answerCbQuery("❌ Belum ada script.", { show_alert: true });

    db.updateUser(userId, { coin: (db.getUser(userId)?.coin || 0) - 10000 });
    const scriptAcak =
      db.getScripts()[Math.floor(Math.random() * db.getScripts().length)];
    await saveDB();

    ctx
      .editMessageCaption("🌀 <b>SEDANG MENGACAK BOX...</b>", {
        parse_mode: "HTML",
      })
      .catch((e) => {
        (global.consolefy?.error || console.error)("Error execution:", e);
      });

    setTimeout(() => {
      ctx
        .replyWithDocument(scriptAcak.fileId, {
          caption: `<b>📦 MYSTERY BOX DIBUKA!</b>\n📂 Script: <b>${scriptAcak.name}</b>`,
          parse_mode: "HTML",
        })
        .catch((e) => {
          (global.consolefy?.error || console.error)("Error execution:", e);
        });

      if (tgbotConfig.newsletter) {
        bot.telegram
          .sendMessage(
            tgbotConfig.newsletter,
            `📦 <b>GACHA BOX</b>\nUser: <code>${userId}</code>\nHadiah: ${scriptAcak.name}`,
            { parse_mode: "HTML" },
          )
          .catch((e) => {
            (global.consolefy?.error || console.error)("Error execution:", e);
          });
      }
      ctx.reply(mainMenu(userId).caption, mainMenu(userId)).catch((e) => {
        (global.consolefy?.error || console.error)("Error execution:", e);
      });
    }, 3000);
  });
};
