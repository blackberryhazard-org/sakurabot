const { downloadContentFromMessage } = require("@whiskeysockets/baileys");
const { Sticker, StickerTypes } = require("wa-sticker-formatter");
const moment = require("moment-timezone");
const fs = require("fs");
const path = require("path");

module.exports = async (sock, m, db) => {
    const from = m.key.remoteJid;
    const sender = m.key.participant || m.key.remoteJid;
    const type = Object.keys(m.message)[0];
    const pushName = m.pushName || "User";

    // Track users in database
    const users = db.get("users") || [];
    if (!users.includes(sender)) {
        users.push(sender);
        db.set("users", users);
    }

    // Extracting text body
    let body = "";
    if (type === "conversation") {
        body = m.message.conversation;
    } else if (type === "extendedTextMessage") {
        body = m.message.extendedTextMessage.text;
    } else if (type === "imageMessage") {
        body = m.message.imageMessage.caption;
    } else if (type === "videoMessage") {
        body = m.message.videoMessage.caption;
    }
    body = body || "";

    const prefix = config.bot.prefix || "/";
    const isCmd = body.startsWith(prefix);
    const command = isCmd ? body.slice(prefix.length).trim().split(" ")[0].toLowerCase() : "";
    const args = body.trim().split(/ +/).slice(1);

    if (!isCmd) return;

    switch (command) {
        case "menu":
        case "help": {
            const date = moment().tz('Asia/Jakarta').format('dddd, DD MMMM YYYY');
            const time = moment().tz('Asia/Jakarta').format('HH:mm:ss');
            const uptime = global.formatUptime(global.botStartTime);

            let dbSize = 0;
            try {
                const dbFilePath = path.resolve(__dirname, '../database/wa/database.json');
                const stats = fs.statSync(dbFilePath);
                dbSize = stats.size;
            } catch (e) {}
            const dbSizeFormatted = (dbSize / 1024).toFixed(2) + ' KB';

            const menuText = `— Halo, *${pushName}*! 👋\n\n` +
                `➛ *Tanggal*: ${date}\n` +
                `➛ *Waktu*: ${time}\n` +
                `➛ *Uptime*: ${uptime}\n` +
                `➛ *Database*: ${dbSizeFormatted}\n` +
                `➛ *Library*: Baileys\n\n` +
                `*Command List*:\n` +
                `➛ ${prefix}s - Create sticker from image/video\n` +
                `➛ ${prefix}ping - Check bot status`;

            await sock.sendMessage(from, {
                image: { url: config.bot.thumbnail },
                caption: menuText
            }, { quoted: m });
            break;
        }
        case "ping": {
            const tgStatus = global.botStatus.tg ? "Online" : "Offline";
            const text = `*PONG!*\n\n` +
                         `*TG Bot Status*: ${tgStatus}`;
            await sock.sendMessage(from, { text }, { quoted: m });
            break;
        }
        case "s":
        case "sticker": {
            // Get the message to be converted to sticker (check quoted first)
            const q = m.message.extendedTextMessage?.contextInfo?.quotedMessage ? m.message.extendedTextMessage.contextInfo.quotedMessage : m.message;
            const qType = Object.keys(q)[0];
            const mediaMessage = q[qType] || q;
            const mime = mediaMessage?.mimetype || "";

            if (/image|video/.test(mime)) {
                await sock.sendMessage(from, { text: config.msg.wait }, { quoted: m });

                const messageType = qType.replace("Message", "");
                const stream = await downloadContentFromMessage(mediaMessage, messageType === 'extendedText' ? 'image' : messageType);
                let buffer = Buffer.from([]);
                for await (const chunk of stream) {
                    buffer = Buffer.concat([buffer, chunk]);
                }

                const sticker = new Sticker(buffer, {
                    pack: config.sticker.packname || config.bot.name,
                    author: config.sticker.author || "SakuraBot",
                    type: StickerTypes.FULL,
                    categories: ["🤩", "🎉"],
                    quality: 50,
                });

                await sock.sendMessage(from, { sticker: await sticker.toBuffer() }, { quoted: m });
            } else {
                await sock.sendMessage(from, { text: `Reply or send an image/video with ${prefix}${command}` }, { quoted: m });
            }
            break;
        }
    }
};
