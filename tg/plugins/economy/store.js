export default (bot) => {
  bot.action(["list_script", "tukar_coin", /^page_(\d+)$/], async (ctx) => {
    const { db } = ctx.tgbot;
    if (db.getScripts().length === 0)
      return ctx.answerCbQuery("Kosong!", { show_alert: true });

    const pageMatch = ctx.callbackQuery.data.match(/^page_(\d+)$/);
    const page = pageMatch ? parseInt(pageMatch[1]) : 0;
    const perPage = 5;
    const start = page * perPage;
    const end = start + perPage;
    const items = db.getScripts().slice(start, end);

    let buttons = items.map((s, index) => [
      {
        text: `📂 ${s.name} [ ${s.price.toLocaleString()} ]`,
        callback_data: `buy_${start + index}`,
      },
    ]);

    let navRow = [];
    navRow.push(
      page > 0
        ? { text: "⬅️ Back", callback_data: `page_${page - 1}` }
        : { text: "⬛", callback_data: "none" },
    );
    navRow.push({ text: "🏠 HOME", callback_data: "back_home" });
    navRow.push(
      end < db.getScripts().length
        ? { text: "Next ➡️", callback_data: `page_${page + 1}` }
        : { text: "⬛", callback_data: "none" },
    );
    buttons.push(navRow);

    ctx
      .editMessageCaption(
        `<b>📂 LIST SCRIPT (Hal: ${page + 1})</b>\nPilih script yang ingin ditukar:`,
        {
          parse_mode: "HTML",
          reply_markup: { inline_keyboard: buttons },
        },
      )
      .catch((e) => {
        (global.consolefy?.error || console.error)(
          "Error during execution:",
          e,
        );
      });
  });

  bot.action(/^buy_(\d+)$/, async (ctx) => {
    const { db, saveDB, config: tgbotConfig } = ctx.tgbot;
    const userId = ctx.from.id;

    const index = parseInt(ctx.match[1]);
    if (
      !Number.isInteger(index) ||
      index < 0 ||
      index >= db.getScripts().length
    )
      return ctx.answerCbQuery("❌ Script tidak ditemukan!", {
        show_alert: true,
      });

    const script = db.getScripts()[index];
    if (db.getUser(userId).coin < script.price)
      return ctx.answerCbQuery("❌ Koin tidak cukup!", { show_alert: true });

    db.updateUser(userId, {
      coin: (db.getUser(userId)?.coin || 0) - script.price,
    });
    await saveDB();

    await ctx
      .replyWithDocument(script.fileId, {
        caption: `<b>✅ PENUKARAN BERHASIL</b>\n\n┣ 📂 <b>Nama:</b> ${script.name}\n┗ 💸 <b>Harga:</b> ${script.price.toLocaleString()} Coins`,
        parse_mode: "HTML",
      })
      .catch((e) => {
        (global.consolefy?.error || console.error)(
          "Error during execution:",
          e,
        );
      });

    if (tgbotConfig.newsletter) {
      bot.telegram
        .sendMessage(
          tgbotConfig.newsletter,
          `<b>🚀 LOG PENUKARAN</b>\n👤 User: <code>${userId}</code>\n📂 Script: ${script.name}`,
          { parse_mode: "HTML" },
        )
        .catch((e) => {
          (global.consolefy?.error || console.error)(
            "Error during execution:",
            e,
          );
        });
    }
    ctx.answerCbQuery("✅ Berhasil!", { show_alert: true });
  });
};
