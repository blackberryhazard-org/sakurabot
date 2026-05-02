import { extractNumber } from "../../../lib/Serialize.js";

export default {
  command: "sakuranite",
  category: "owner",
  owner: true,
  async run(m, { text, db }) {
    const args = text.split(" ");
    if (args.length < 2) {
      return m.reply(
        "❌ Invalid syntax. Use `/sakuranite add|reduce|set @user amount` or reply to a message.",
      );
    }

    const action = args[0].toLowerCase();
    const amountStr = args[args.length - 1];
    const amount = parseInt(amountStr);

    if (isNaN(amount)) {
      return m.reply("❌ Invalid amount. Please provide a number.");
    }

    let targetId = extractNumber(m);

    if (!targetId && args.length >= 3) {
      // Maybe the user is tagged without mention array populated correctly, but typically mentionedJid has it
      return m.reply("❌ Please mention a user or reply to their message.");
    }

    if (!targetId) {
      return m.reply("❌ Please mention a user or reply to their message.");
    }

    const targetUser = db.getUser(targetId);
    if (!targetUser) {
      return m.reply("❌ User not found in database.");
    }

    if (!targetUser.sakuranite) targetUser.sakuranite = 0;

    switch (action) {
      case "add":
        targetUser.sakuranite += amount;
        m.reply(
          `✅ Successfully added ${amount} Sakuranite to @${targetId.split("@")[0]}. Current balance: ${targetUser.sakuranite}`,
          { mentions: [targetId] },
        );
        break;
      case "reduce":
        targetUser.sakuranite = Math.max(0, targetUser.sakuranite - amount);
        m.reply(
          `✅ Successfully reduced ${amount} Sakuranite from @${targetId.split("@")[0]}. Current balance: ${targetUser.sakuranite}`,
          { mentions: [targetId] },
        );
        break;
      case "set":
        targetUser.sakuranite = Math.max(0, amount);
        m.reply(
          `✅ Successfully set Sakuranite to ${amount} for @${targetId.split("@")[0]}.`,
          { mentions: [targetId] },
        );
        break;
      default:
        m.reply("❌ Invalid action. Use `add`, `reduce`, or `set`.");
    }
  },
};
