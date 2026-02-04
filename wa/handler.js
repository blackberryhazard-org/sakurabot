const { downloadContentFromMessage } = require("@whiskeysockets/baileys");
const { Sticker, StickerTypes } = require("wa-sticker-formatter");
const moment = require("moment-timezone");
const fs = require("fs");
const path = require("path");

module.exports = async (sock, m, db, waBot, items) => {
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
    const commandName = isCmd ? body.slice(prefix.length).trim().split(" ")[0].toLowerCase() : "";
    const args = body.trim().split(/ +/).slice(1);

    const isLeader = (jid) => {
        return config.owner.id === jid.split('@')[0];
    };

    const isOwner = (jid) => {
        const managers = db.get('managers') || [];
        const cos = config.owner.co || [];
        const coIds = cos.map(co => co.id);
        const jidId = jid.split('@')[0];
        return isLeader(jid) || managers.includes(jid) || coIds.includes(jidId);
    };

    const isPremium = (jid) => {
        const premiumUsers = db.get('premium') || [];
        return premiumUsers.includes(jid);
    };

    const getSakuranite = (jid) => {
        return db.get(`sakuranite.${jid}`) || 0;
    };

    const updateSakuranite = (jid, amount) => {
        db.set(`sakuranite.${jid}`, amount);
    };

    const getInventory = (jid) => {
        return db.get(`inventory.${jid}`) || {};
    };

    const updateInventory = (jid, item, amount) => {
        const inv = getInventory(jid);
        inv[item] = (inv[item] || 0) + amount;
        if (inv[item] <= 0) delete inv[item];
        db.set(`inventory.${jid}`, inv);
    };

    const helpers = {
        isLeader,
        isOwner,
        isPremium,
        getSakuranite,
        updateSakuranite,
        getInventory,
        updateInventory,
        db,
        config,
        waBot,
        items,
        downloadContentFromMessage,
        Sticker,
        StickerTypes,
        prefix,
        pushName,
        sender,
        from,
        args
    };

    if (isCmd) {
        const cmd = waBot.cmd.get(commandName);
        if (cmd) {
            try {
                await cmd.code(sock, m, helpers);
            } catch (err) {
                consolefy.error(`Error executing command ${commandName}:`, err);
                await sock.sendMessage(from, { text: `Terjadi kesalahan: ${err.message}` }, { quoted: m });
            }
        }
    }
};
