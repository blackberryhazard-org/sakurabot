import { frame, toTitleCase } from "../../lib/Utilities.js";
import config from "../../config.js";
import { Markup } from "telegraf";

// Mimic the categories structure for demonstration.
// Since we don't have an exact command registry on TG like Baileys' ModuleCache in this minimal setup,
// we'll statically define some common categories mimicking WhatsApp bot's structure.
const CATEGORY_EMOJIS = {
  tools: "🛠️",
  misc: "📦",
};

const CATEGORIES = {
  tools: ["ping"],
  misc: ["menu"],
};

export default (bot) => {
  bot.command("menu", async (ctx) => {
    try {
      const botName = config.wabot.botName || "Sakurabot";

      const messageParts = [
        `Hello! I'm *${botName}*, here are my available commands:`,
      ];

      const inlineKeyboard = [];

      for (const [category, commands] of Object.entries(CATEGORIES)) {
        messageParts.push(
          frame(
            toTitleCase(category),
            commands.map((cmd) => `/${cmd}`),
            CATEGORY_EMOJIS[category] || "📁",
          ),
        );
      }

      const message = messageParts.join("\n\n");

      await ctx.reply(message, {
        parse_mode: "Markdown",
        ...Markup.inlineKeyboard([
          [Markup.button.callback("📊 Statistic", "menu_statistic")],
          [
            Markup.button.url(
              "💰 Donate",
              "https://github.com/itsliaaa/starseed",
            ),
          ],
        ]),
      });
    } catch (error) {
      global.consolefy?.error(error) ||
        console.error("Error in menu command:", error);
      ctx.reply("❌ Error generating menu.");
    }
  });

  bot.action("menu_statistic", async (ctx) => {
    try {
      await ctx.answerCbQuery();
      await ctx.reply(
        "Statistics feature is not yet fully implemented for Telegram.",
      );
    } catch (e) {
      global.consolefy?.error(e) || console.error(e);
    }
  });
};
