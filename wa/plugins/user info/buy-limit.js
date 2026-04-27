export default {
  command: ["buy", "buylimit"],
  category: "user info",
  async run(m, { user, text }) {
    if (!text)
      return m.reply(
        "❌ Please specify the amount of limit you want to buy. Example: `/buy 10`",
      );
    const input = text.trim().split(" ")[1];
    const amount = parseInt(input);
    if (!input || isNaN(amount) || amount <= 0)
      return m.reply("❌ Invalid amount. Please enter a valid number.");

    const cost = amount; // 1 Sakuranite = 1 Limit

    const sakuranite = user.sakuranite || 0;
    if (sakuranite < cost) {
      return m.reply(
        `❌ You don't have enough Sakuranite. You need ${cost} Sakuranite to buy ${amount} limit(s). You currently have ${sakuranite} Sakuranite.`,
      );
    }

    user.sakuranite -= cost;
    user.limit += amount;

    m.reply(
      `✅ Successfully bought ${amount} limit(s) for ${cost} Sakuranite. You now have ${user.limit} limit(s) and ${user.sakuranite} Sakuranite left.`,
    );
  },
};
