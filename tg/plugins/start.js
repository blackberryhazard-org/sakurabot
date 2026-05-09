export default (bot) => {
  bot.command(["start", "menu"], async (ctx) => {
    try {
      const {
        db,
        saveDB,
        config: tgbotConfig,
        checkJoin,
        mainMenu,
      } = ctx.tgbot;
      const userId = ctx.from.id;
      const payload = ctx.payload;

      if (db.getUser(userId) && db.getUser(userId).isBanned) {
        return ctx.reply(
          "🚫 <b>AKUN KAMU DI BANNED!</b>\nKamu tidak bisa lagi menggunakan layanan bot ini.",
          { parse_mode: "HTML" },
        );
      }

      if (payload && payload !== String(userId)) {
        const referrerId = parseInt(payload);
        if (Number.isFinite(referrerId) && !db.hasUser(userId)) {
          db.updateUser(userId, {
            coin: 0,
            joined: false,
            refBy: referrerId,
            refCount: 0,
            lastClaim: 0,
            isBanned: false,
            claimedMissions: {},
          });
          if (db.getUser(referrerId)) {
            db.updateUser(referrerId, {
              coin: (db.getUser(referrerId)?.coin || 0) + 30000,
            });
            db.updateUser(referrerId, {
              refCount: (db.getUser(referrerId)?.refCount || 0) + 1,
            });
            bot.telegram
              .sendMessage(
                referrerId,
                `<b>🔔 NOTIFIKASI REFERRAL</b>\n\n<blockquote>Teman bergabung!\n💰 <b>+30.000 Coins</b> ditambahkan.</blockquote>`,
                { parse_mode: "HTML" },
              )
              .catch((e) => {
                (global.consolefy?.error || console.error)(
                  "Error during execution:",
                  e,
                );
              });
          }
          await saveDB();
        }
      }

      if (!db.hasUser(userId)) {
        db.updateUser(userId, {
          coin: 0,
          joined: false,
          refCount: 0,
          lastClaim: 0,
          isBanned: false,
          claimedMissions: {},
        });
        await saveDB();
      }

      const isJoined = await checkJoin(userId);

      if (isJoined && !db.hasUser(userId).joined) {
        db.updateUser(userId, { coin: (db.getUser(userId)?.coin || 0) + 2000 });
        db.updateUser(userId, { joined: true });
        await saveDB();
        ctx.reply(
          "<b>🎉 WELCOME BONUS!</b>\n<blockquote>Bonus 2.000 koin cair karena sudah bergabung di komunitas kami!</blockquote>",
          { parse_mode: "HTML" },
        );
      }

      if (!isJoined && tgbotConfig.channels?.length > 0) {
        return ctx.reply(
          `<b>〔 ⚠️ AKSES TERBATAS 〕</b>\n\nMaaf, kamu harus bergabung ke komunitas kami terlebih dahulu.\n\n<blockquote>Pastikan sudah join semua channel di bawah, lalu ketik /start untuk verifikasi.</blockquote>`,
          {
            parse_mode: "HTML",
            reply_markup: {
              inline_keyboard: [
                [{ text: "📢 Info Channel", url: "https://t.me/kai_ampas" }],
                [
                  {
                    text: "✅ Bukti Penukaran",
                    url: "https://t.me/notif_bot_coin",
                  },
                ],
                [
                  {
                    text: "🔄 Cek Status Join",
                    callback_data: "check_join_main",
                  },
                ],
              ],
            },
          },
        );
      }

      const menu = mainMenu(userId);
      ctx.replyWithPhoto(tgbotConfig.startImage, menu).catch(() => {
        ctx.reply(menu.caption, {
          parse_mode: "HTML",
          reply_markup: menu.reply_markup,
        });
      });
    } catch (e) {
      (global.consolefy?.error || console.error)(e);
    }
  });

  bot.action("check_join_main", async (ctx) => {
    const { checkJoin, config: tgbotConfig, mainMenu } = ctx.tgbot;
    const userId = ctx.from.id;
    if (await checkJoin(userId)) {
      ctx.deleteMessage().catch((e) => {
        (global.consolefy?.error || console.error)(
          "Error during execution:",
          e,
        );
      });
      ctx.replyWithPhoto(tgbotConfig.startImage, mainMenu(userId));
    } else {
      ctx.answerCbQuery("❌ Belum join semua channel yang diwajibkan!", {
        show_alert: true,
      });
    }
  });

  bot.action("back_home", async (ctx) => {
    const { mainMenu } = ctx.tgbot;
    const userId = ctx.from.id;
    ctx
      .editMessageCaption(mainMenu(userId).caption, mainMenu(userId))
      .catch((e) => {
        (global.consolefy?.error || console.error)(
          "Error during execution:",
          e,
        );
      });
  });
};
