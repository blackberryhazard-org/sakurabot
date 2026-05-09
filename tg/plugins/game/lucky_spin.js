export default (bot) => {
  bot.action("lucky_spin", async (ctx) => {
    const { db, saveDB, mainMenu } = ctx.tgbot;
    const userId = ctx.from.id;

    if (db.getUser(userId).coin < 2000)
      return ctx.answerCbQuery("❌ Butuh 2000 koin!", { show_alert: true });

    db.updateUser(userId, { coin: (db.getUser(userId)?.coin || 0) - 2000 });
    const r = Math.random();
    let win = 0;
    let txt = "💀 Zonk!";

    if (r > 0.9) {
      win = 5000;
      txt = "🔥 JACKPOT 5.000!";
    } else if (r > 0.6) {
      win = 3000;
      txt = "🎉 MENANG 3.000!";
    } else if (r > 0.3) {
      win = 2000;
      txt = "⚖️ Balik Modal!";
    }

    db.updateUser(userId, { coin: (db.getUser(userId)?.coin || 0) + win });
    await saveDB();

    ctx.answerCbQuery(txt, { show_alert: true });
    ctx
      .editMessageCaption(mainMenu(userId).caption, mainMenu(userId))
      .catch((e) => {
        (global.consolefy?.error || console.error)("Error execution:", e);
      });
  });
};
