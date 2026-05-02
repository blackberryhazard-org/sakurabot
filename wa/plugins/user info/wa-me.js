import { extractNumber } from "../../../lib/Serialize.js";

export default {
  command: "wame",
  category: "user info",
  async run(m, { text, db }) {
    const number = extractNumber(m) || m.sender;
    const userData = db.getUser(number);
    text = text || "Hello!";
    const url =
      "https://wa.me/" + number.split("@")[0] + "?" + encodeURIComponent(text);

    let replyText = url;
    if (userData && userData.sakuranite !== undefined) {
      replyText += `\n\nSakuranite: ${userData.sakuranite}`;
    }
    m.reply(replyText);
  },
};
