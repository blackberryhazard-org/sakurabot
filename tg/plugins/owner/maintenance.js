export default (bot) => {
  bot.hears(/^\/maint (on|off)/, async (ctx) => {
    const { db, saveDB, config: tgbotConfig } = ctx.tgbot;
    const userId = ctx.from.id;

    if (userId !== tgbotConfig.ownerId) return;

    const action = ctx.match[1];
    if (action === "on") {
      db.updateSetting({ maintenance: true });
      await saveDB();
      return ctx.reply("🔴 <b>Maintenance DIAKTIFKAN!</b>", {
        parse_mode: "HTML",
      });
    } else {
      db.updateSetting({ maintenance: false });
      await saveDB();
      return ctx.reply("🟢 <b>Maintenance DIMATIKAN!</b>", {
        parse_mode: "HTML",
      });
    }
  });
};
