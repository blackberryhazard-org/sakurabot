export default (bot) => {
  bot.command("ping", (ctx) => {
    const start = Date.now();
    ctx
      .reply("Pong!")
      .then((msg) => {
        const end = Date.now();
        ctx.telegram.editMessageText(
          ctx.chat.id,
          msg.message_id,
          undefined,
          `Pong! 🏓\nLatency: ${end - start}ms`,
        );
      })
      .catch((err) => {
        global.consolefy?.error(err) ||
          console.error("Error in ping command:", err);
        ctx.reply("Pong! 🏓");
      });
  });
};
