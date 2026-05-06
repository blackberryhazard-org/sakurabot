export default (bot) => {
  bot.action("gacha_script", async (ctx) => {
    const { db, saveDB, config: coinbotConfig, mainMenu } = ctx.coinbot;
    const userId = ctx.from.id;

    if (db.users[userId].coin < 10000)
      return ctx.answerCbQuery("❌ Koin kamu kurang 10.000!", {
        show_alert: true,
      });
    if (db.scripts.length === 0)
      return ctx.answerCbQuery("❌ Belum ada script.", { show_alert: true });

    db.users[userId].coin -= 10000;
    const scriptAcak =
      db.scripts[Math.floor(Math.random() * db.scripts.length)];
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

      if (coinbotConfig.notifChannel) {
        bot.telegram
          .sendMessage(
            coinbotConfig.notifChannel,
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
