const config = require("../config.json");
const { downloadContentFromMessage } = require("@whiskeysockets/baileys");
const { Sticker, StickerTypes } = require("wa-sticker-formatter");
const moment = require("moment-timezone");
const fs = require("fs");
const path = require("path");
const middleware = require("./middleware");

module.exports = async (sock, m, db, waBot, items, services) => {
    const { userAccess, economy, inventory: inventoryService } = services;
    const from = m.key.remoteJid;
    const sender = m.key.participant || m.key.remoteJid;
    const type = Object.keys(m.message)[0];
    const pushName = m.pushName || "User";

    // Track users in database (Middleware)
    middleware.registerUser(db, sender);

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

    const getTarget = (m, args, types = ["quoted", "mentioned", "text"]) => {
        const type = Object.keys(m.message)[0];
        const contextInfo = m.message[type]?.contextInfo;
        let target = "";
        if (types.includes("quoted") && contextInfo?.participant) {
            target = contextInfo.participant;
        } else if (types.includes("mentioned") && contextInfo?.mentionedJid?.length > 0) {
            target = contextInfo.mentionedJid[0];
        } else if (types.includes("text") && args[0]) {
            const numeric = args[0].replace(/[^0-9]/g, "");
            if (numeric.length > 0) {
                target = numeric + "@s.whatsapp.net";
            }
        }
        return target;
    };

    const downloadMedia = async (message) => {
        const type = Object.keys(message)[0];
        const stream = await downloadContentFromMessage(message[type], type.split("Message")[0]);
        let buffer = Buffer.from([]);
        for await (const chunk of stream) {
            buffer = Buffer.concat([buffer, chunk]);
        }
        return buffer;
    };

    const getGroupDb = (jid) => {
        if (!jid.endsWith("@g.us")) return null;
        return new Proxy({}, {
            get: (target, prop) => {
                if (prop === "save") return () => {};
                return db.get(`groups.${jid}.${prop}`);
            },
            set: (target, prop, value) => {
                db.set(`groups.${jid}.${prop}`, value);
                return true;
            }
        });
    };

    const ctx = {
        m,
        id: from,
        args,
        sender,
        me: sock.user.id,
        getId: (jid) => jid || from,
        reply: async (content, options = {}) => {
            if (typeof content === "string") {
                return await sock.sendMessage(from, { text: content, ...options }, { quoted: m });
            } else {
                return await sock.sendMessage(from, { ...content, ...options }, { quoted: m });
            }
        },
        replyWithJid: async (jid, content, options = {}) => {
            if (typeof content === "string") {
                return await sock.sendMessage(jid, { text: content, ...options });
            } else {
                return await sock.sendMessage(jid, { ...content, ...options });
            }
        },
        target: async (types) => getTarget(m, args, types),
        db: {
            group: from.endsWith("@g.us") ? getGroupDb(from) : null
        },
        core: {
            onWhatsApp: async (jid) => {
                const [result] = await sock.onWhatsApp(jid);
                return result ? [result] : [];
            }
        },
        msg: {
            messageType: type,
            download: async () => await downloadMedia(m.message)
        },
        group: (jid = from) => ({
            name: async () => {
                if (!jid.endsWith("@g.us")) return null;
                const metadata = await sock.groupMetadata(jid);
                return metadata.subject;
            },
            isOwner: async (participantJid) => {
                if (!jid.endsWith("@g.us")) return false;
                const metadata = await sock.groupMetadata(jid);
                return metadata.owner === participantJid || metadata.owner === participantJid.replace("@s.whatsapp.net", "@c.us");
            },
            kick: async (participantJid) => {
                if (!jid.endsWith("@g.us")) return false;
                return await sock.groupParticipantsUpdate(jid, [participantJid], "remove");
            },
            add: async (participantJid) => {
                if (!jid.endsWith("@g.us")) return false;
                return await sock.groupParticipantsUpdate(jid, [participantJid], "add");
            },
            promote: async (participantJid) => {
                if (!jid.endsWith("@g.us")) return false;
                return await sock.groupParticipantsUpdate(jid, [participantJid], "promote");
            },
            demote: async (participantJid) => {
                if (!jid.endsWith("@g.us")) return false;
                return await sock.groupParticipantsUpdate(jid, [participantJid], "demote");
            },
            inviteCode: async () => {
                if (!jid.endsWith("@g.us")) return null;
                return await sock.groupInviteCode(jid);
            },
            members: async () => {
                if (!jid.endsWith("@g.us")) return [];
                const metadata = await sock.groupMetadata(jid);
                return metadata.participants.map(p => ({ ...p, jid: p.id }));
            },
            pendingMembers: async () => {
                if (!jid.endsWith("@g.us")) return [];
                return await sock.groupRequestParticipantsList(jid);
            },
            approve: async (participantJid) => {
                if (!jid.endsWith("@g.us")) return false;
                return await sock.groupRequestParticipantsUpdate(jid, [participantJid], "approve");
            },
            reject: async (participantJid) => {
                if (!jid.endsWith("@g.us")) return false;
                return await sock.groupRequestParticipantsUpdate(jid, [participantJid], "reject");
            },
            setSubject: async (subject) => {
                if (!jid.endsWith("@g.us")) return false;
                return await sock.groupUpdateSubject(jid, subject);
            },
            setDescription: async (description) => {
                if (!jid.endsWith("@g.us")) return false;
                return await sock.groupUpdateDescription(jid, description);
            },
            leave: async () => {
                if (!jid.endsWith("@g.us")) return false;
                return await sock.groupLeave(jid);
            },
            setting: async (setting) => {
                if (!jid.endsWith("@g.us")) return false;
                return await sock.groupSettingUpdate(jid, setting);
            }
        }),
        text: args.join(" "),
        quoted: m.message[type]?.contextInfo?.quotedMessage ? {
            text: m.message[type].contextInfo.quotedMessage.conversation ||
                  m.message[type].contextInfo.quotedMessage.extendedTextMessage?.text ||
                  m.message[type].contextInfo.quotedMessage.imageMessage?.caption ||
                  m.message[type].contextInfo.quotedMessage.videoMessage?.caption,
            download: async () => await downloadMedia(m.message[type].contextInfo.quotedMessage)
        } : null,
        used: { prefix, command: commandName }
    };

    const helpers = {
        // Services
        userAccess,
        economy,
        inventory: inventoryService,

        // Compatibility
        ctx,
        isLeader: (jid) => userAccess.isLeader(jid),
        isManager: (jid) => userAccess.isManager(jid),
        isOwner: (jid) => userAccess.isOwner(jid),
        isPremium: (jid) => userAccess.isPremium(jid),
        getSakuranite: (jid) => economy.getBalance(jid, "sakuranite"),
        updateSakuranite: (jid, amount) => economy.updateBalance(jid, amount, "sakuranite"),
        getInventory: (jid) => inventoryService.getInventory(jid),
        updateInventory: (jid, item, amount) => inventoryService.addItem(jid, item, amount),

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

    const activeGame = waBot.games.get(from);
    if (activeGame && !isCmd) {
        const result = tools.game.handleAnswer(
            activeGame,
            body,
            sender,
            pushName || sender.split("@")[0],
            helpers.updateSakuranite,
            helpers.getSakuranite
        );

        if (result) {
            if (result.status === "game_over" || result.status === "surrender") {
                if (activeGame.timeoutRef) clearTimeout(activeGame.timeoutRef);
                waBot.games.delete(from);
            }

            return await sock.sendMessage(from, {
                text: result.message,
                mentions: result.mentions || []
            }, { quoted: m });
        }
    }

    if (isCmd) {
        const cmd = waBot.cmd.get(commandName);
        if (cmd) {
            try {
                if (cmd.permissions) {
                    const isGroup = from.endsWith("@g.us");
                    const senderIsOwner = userAccess.isOwner(sender);
                    const senderIsLeader = userAccess.isLeader(sender);
                    const senderIsPremium = userAccess.isPremium(sender);

                    if (cmd.permissions.owner && !senderIsOwner) return ctx.reply(config.msg.owner);
                    if (cmd.permissions.leader && !senderIsLeader) return ctx.reply("Perintah ini hanya untuk Leader!");
                    if (cmd.permissions.premium && !senderIsPremium && !senderIsOwner) return ctx.reply(config.msg.premium);
                    if (cmd.permissions.group && !isGroup) return ctx.reply(config.msg.group);

                    if (isGroup && (cmd.permissions.admin || cmd.permissions.botAdmin)) {
                        const groupMetadata = await sock.groupMetadata(from);
                        const participants = groupMetadata.participants;
                        const admins = participants.filter(p => p.admin).map(p => p.id);
                        const botId = sock.user.id.split(":")[0] + "@s.whatsapp.net";

                        if (cmd.permissions.admin && !admins.includes(sender) && !senderIsOwner) return ctx.reply(config.msg.admin);
                        if (cmd.permissions.botAdmin && !admins.includes(botId)) return ctx.reply(config.msg.botAdmin);
                    }
                }
                await cmd.code(sock, m, helpers);
            } catch (err) {
                consolefy.error(`Error executing command ${commandName}:`, err);
                await ctx.reply(`Terjadi kesalahan: ${err.message}`);
            }
        }
    }
};
