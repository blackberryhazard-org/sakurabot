import axios from "axios";
import config from "../../../config.js";

export default {
  command: "jules",
  category: "owner",
  async run(m, { sock, args, isPrefix, command }) {
    const apiKey = config.misc?.julesApiKey || global.misc?.julesApiKey;

    if (!apiKey) {
      return m.reply(
        "❌ Jules API Key is not configured in config.js (config.misc.julesApiKey).",
      );
    }

    if (!args[0]) {
      let helpMsg = `✨ *Jules API Manager*\n\n`;
      helpMsg += `👉🏻 *Usage*:\n`;
      helpMsg += `• \`${isPrefix + command} new <source> <prompt>\`\n`;
      helpMsg += `• \`${isPrefix + command} show\`\n`;
      return m.reply(helpMsg);
    }

    const action = args[0].toLowerCase();
    m.react("🕒");

    const baseUrl = "https://jules.googleapis.com/v1alpha";

    try {
      if (action === "new") {
        if (args.length < 3)
          return m.reply(
            `👉🏻 *Example*: ${isPrefix + command} new sources/github/org/repo prompt text here`,
          );
        const source = args[1];
        const prompt = args.slice(2).join(" ");

        try {
          const { data } = await axios.post(
            `${baseUrl}/sessions`,
            {
              source,
              prompt,
            },
            {
              headers: {
                "X-Goog-Api-Key": apiKey,
                "Content-Type": "application/json",
              },
            },
          );
          m.reply(
            `✅ Successfully requested new session.\n*Session ID*: ${data.name || "N/A"}\n*Source*: ${source}\n*Prompt*: ${prompt}`,
          );
        } catch (err) {
          m.reply(
            `❌ Failed to create session: ${err.response?.data?.error?.message || err.message}`,
          );
        }
      } else if (action === "show") {
        try {
          const { data } = await axios.get(`${baseUrl}/sessions?pageSize=5`, {
            headers: { "X-Goog-Api-Key": apiKey },
          });
          if (data.sessions && data.sessions.length > 0) {
            let printStr = "✅ *Current Jules Sessions:*\n";
            data.sessions.forEach((s, i) => {
              printStr += `\n*${i + 1}.* ${s.name.split("/").pop()}`;
              if (s.state) printStr += ` (${s.state})`;
            });
            m.reply(printStr);
          } else {
            m.reply("✅ No active sessions found.");
          }
        } catch (err) {
          m.reply(
            `❌ Failed to fetch sessions: ${err.response?.data?.error?.message || err.message}`,
          );
        }
      } else {
        m.reply(`❌ Unknown action: ${action}`);
      }
    } catch (error) {
      m.reply(`❌ Error: ${error.message}`);
    }
  },
  owner: true,
};
