import {
  isMimeAudio,
  isMimeVideo,
  isMimeImage,
  randomHex,
} from "../../../lib/Utilities.js";

export default {
  command: "upgcsw",
  aliases: ["upswgc"],
  category: "group",
  async run(m, { sock, text }) {
    const q = m.quoted ? m.quoted : m;
    const body = text ?? q.body;
    const mimetype = (q.msg || q).mimetype;

    if (!body && !mimetype)
      return m.reply(
        "💭 Provide text or media you would like to send to the group status.",
      );

    m.react("🕒");
    let content = {};

    if (mimetype) {
      let type;
      if (isMimeImage(mimetype)) type = "image";
      else if (isMimeVideo(mimetype)) type = "video";
      else if (isMimeAudio(mimetype)) type = "audio";
      else return m.reply("❌ Unsupported media type for status.");

      const bufferMedia = await q.download();
      if (!Buffer.isBuffer(bufferMedia))
        return m.reply("❌ Failed to download media.");

      content[type] = bufferMedia;
      if (body) content.caption = body;
      if (isMimeAudio(mimetype)) content.ptt = true;
      content.groupStatus = true;
    } else if (body) {
      content.text = body;
      content.groupStatus = true;
      content.backgroundColor = randomHex();
    }

    await sock.sendMessage(m.chat, content);
    m.reply("✅ Successfully sent group status.");
  },
  group: true,
  admin: true,
  botAdmin: true,
};
