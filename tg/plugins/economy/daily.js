export default (bot) => {
  bot.action("daily_claim", async (ctx) => {
    const { db, saveDB, mainMenu } = ctx.tgbot;
    const userId = ctx.from.id;

    const now = Date.now();
    const last = db.getUser(userId).lastClaim || 0;
    if (now - last < 86400000)
      return ctx.answerCbQuery(`⏳ Tunggu beberapa jam lagi!`, {
        show_alert: true,
      });

    db.updateUser(userId, { coin: (db.getUser(userId)?.coin || 0) + 5000 });
    db.updateUser(userId, { lastClaim: now });
    await saveDB();

    ctx.answerCbQuery("🎉 +5.000 Koin Harian!", { show_alert: true });
    ctx
      .editMessageCaption(mainMenu(userId).caption, mainMenu(userId))
      .catch((e) => {
        (global.consolefy?.error || console.error)("Error execution:", e);
      });
  });
};
