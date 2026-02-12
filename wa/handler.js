const config = require("../config.json");
const { downloadContentFromMessage } = require("@whiskeysockets/baileys");
const { Sticker, StickerTypes } = require("wa-sticker-formatter");
const moment = require("moment-timezone");
const fs = require("fs");
const path = require("path");
const middleware = require("./middleware");

module.exports = async (sock, m, db, waBot, items) => {
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

    const getSakuranite = (jid) => {
        return db.get(`sakuranite.${jid}`) || 0;
    };

    const updateSakuranite = (jid, amount) => {
        db.set(`sakuranite.${jid}`, amount);
    };
    const getMiningTickets = (jid) => {
        return db.get(`mining_tickets.${jid}`) || 0;
    };

    const updateMiningTickets = (jid, amount) => {
        db.set(`mining_tickets.${jid}`, amount);
    };

    const getMiningRate = (jid) => {
        return db.get(`mining_rate.${jid}`) || 0.10;
    };

    const updateMiningRate = (jid, amount) => {
        db.set(`mining_rate.${jid}`, amount);
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

    const getTarget = (m, args, types = ["quoted", "mentioned", "text"]) => {
        const type = Object.keys(m.message)[0];
        const contextInfo = m.message[type]?.contextInfo;
        let target = "";
        if (types.includes("quoted") && contextInfo?.participant) {
            target = contextInfo.participant;
        } else if (types.includes("mentioned") && contextInfo?.mentionedJid?.length > 0) {
            target = contextInfo.mentionedJid[0];
        } else if (types.includes("text") && args[0]) {
            target = args[0].replace(/[^0-9]/g, "") + "@s.whatsapp.net";
        }
        return target;
    };

    const downloadMedia = async (message) => {
        const type = Object.keys(message)[0];
        const mime = message[type].mimetype;
        const stream = await downloadContentFromMessage(message[type], type.split("Message")[0]);
        let buffer = Buffer.from([]);
        for await (const chunk of stream) {
            buffer = Buffer.concat([buffer, chunk]);
        }
        return buffer;
    };

    const getGroupDb = (jid) => {
        if (!jid.endsWith('@g.us')) return null;
        return new Proxy({}, {
            get: (target, prop) => {
                if (prop === 'save') return () => {}; // Auto-save is on
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
        reply: async (content, options = {}) => {
            if (typeof content === 'string') {
                return await sock.sendMessage(from, { text: content, ...options }, { quoted: m });
            } else {
                return await sock.sendMessage(from, { ...content, ...options }, { quoted: m });
            }
        },
        replyWithJid: async (jid, content, options = {}) => {
            if (typeof content === 'string') {
                return await sock.sendMessage(jid, { text: content, ...options });
            } else {
                return await sock.sendMessage(jid, { ...content, ...options });
            }
        },
        target: async (types) => getTarget(m, args, types),
        db: {
            group: from.endsWith('@g.us') ? getGroupDb(from) : null
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
                if (!jid.endsWith('@g.us')) return null;
                const metadata = await sock.groupMetadata(jid);
                return metadata.subject;
            },
            isOwner: async (participantJid) => {
                if (!jid.endsWith('@g.us')) return false;
                const metadata = await sock.groupMetadata(jid);
                return metadata.owner === participantJid || metadata.owner === participantJid.replace('@s.whatsapp.net', '@c.us');
            },
            kick: async (participantJid) => {
                if (!jid.endsWith('@g.us')) return false;
                return await sock.groupParticipantsUpdate(jid, [participantJid], "remove");
            },
            add: async (participantJid) => {
                if (!jid.endsWith('@g.us')) return false;
                return await sock.groupParticipantsUpdate(jid, [participantJid], "add");
            },
            promote: async (participantJid) => {
                if (!jid.endsWith('@g.us')) return false;
                return await sock.groupParticipantsUpdate(jid, [participantJid], "promote");
            },
            demote: async (participantJid) => {
                if (!jid.endsWith('@g.us')) return false;
                return await sock.groupParticipantsUpdate(jid, [participantJid], "demote");
            },
            inviteCode: async () => {
                if (!jid.endsWith('@g.us')) return null;
                return await sock.groupInviteCode(jid);
            },
            members: async () => {
                if (!jid.endsWith('@g.us')) return [];
                const metadata = await sock.groupMetadata(jid);
                return metadata.participants.map(p => ({ ...p, jid: p.id }));
            },
            pendingMembers: async () => {
                if (!jid.endsWith('@g.us')) return [];
                return await sock.groupRequestParticipantsList(jid);
            },
            approve: async (participantJid) => {
                if (!jid.endsWith('@g.us')) return false;
                return await sock.groupRequestParticipantsUpdate(jid, [participantJid], "approve");
            },
            reject: async (participantJid) => {
                if (!jid.endsWith('@g.us')) return false;
                return await sock.groupRequestParticipantsUpdate(jid, [participantJid], "reject");
            },
            setSubject: async (subject) => {
                if (!jid.endsWith('@g.us')) return false;
                return await sock.groupUpdateSubject(jid, subject);
            },
            setDescription: async (description) => {
                if (!jid.endsWith('@g.us')) return false;
                return await sock.groupUpdateDescription(jid, description);
            },
            leave: async () => {
                if (!jid.endsWith('@g.us')) return false;
                return await sock.groupLeave(jid);
            },
            setting: async (setting) => {
                if (!jid.endsWith('@g.us')) return false;
                // setting can be 'announcement' or 'not_announcement' etc
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
        used: {
            prefix,
            command: commandName
        }
    };

    const helpers = {
        getMiningTickets,
        updateMiningTickets,
        getMiningRate,
        updateMiningRate,
        ctx,
        isLeader: (jid) => middleware.isLeader(jid),
        isManager: (jid) => middleware.isManager(db, jid),
        isOwner: (jid) => middleware.isOwner(db, jid),
        isPremium: (jid) => middleware.isPremium(db, jid),
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

    const bodyLower = body.toLowerCase();
    const activeGame = waBot.games.get(from);
    if (activeGame && !isCmd) {
        const result = tools.game.handleAnswer(
            activeGame,
            body,
            sender,
            pushName || sender.split("@")[0],
            updateSakuranite,
            getSakuranite
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
    // Handle Sessions (e.g., for /link)
    const session = waBot.sessions.get(sender);
    if (session && !isCmd) {
        if (session.type === 'linking' && /^\d{4}$/.test(body)) {
            if (body === session.code) {
                // Link success
                const waLinks = db.get('links') || {};
                waLinks[sender] = session.tgId;
                db.set('links', waLinks);

                // Also update TG database
                const { Database } = require('simpl.db');
                const tgDbPath = path.resolve(__dirname, '../database/tg/database.json');
                const tgDb = new Database({ dataFile: tgDbPath });
                const tgLinks = tgDb.get('links') || {};
                tgLinks[session.tgId] = sender;
                tgDb.set('links', tgLinks);

                waBot.sessions.delete(sender);
                return await sock.sendMessage(from, { text: `✅ Integrasi berhasil! Akun WhatsApp Anda sekarang terhubung dengan ID Telegram ${session.tgId}.` }, { quoted: m });
            } else {
                session.attempts = (session.attempts || 0) + 1;
                if (session.attempts >= 3) {
                    waBot.sessions.delete(sender);
                    return await sock.sendMessage(from, { text: `❌ Kode salah 3 kali. Sesi integrasi dibatalkan.` }, { quoted: m });
                }
                return await sock.sendMessage(from, { text: `❌ Kode salah. Silakan coba lagi (Sisa percobaan: ${3 - session.attempts})` }, { quoted: m });
            }
        }
    }

    if (isCmd) {
        const cmd = waBot.cmd.get(commandName);
        if (cmd) {
            try {
                // Permission checking
                if (cmd.permissions) {
                    const isGroup = from.endsWith('@g.us');
                    const senderIsOwner = helpers.isOwner(sender);
                    const senderIsLeader = helpers.isLeader(sender);
                    const senderIsPremium = helpers.isPremium(sender);

                    if (cmd.permissions.owner && !senderIsOwner) {
                        return await sock.sendMessage(from, { text: config.msg.owner }, { quoted: m });
                    }

                    if (cmd.permissions.leader && !senderIsLeader) {
                        return await sock.sendMessage(from, { text: "Perintah ini hanya untuk Leader!" }, { quoted: m });
                    }

                    if (cmd.permissions.premium && !senderIsPremium && !senderIsOwner) {
                        return await sock.sendMessage(from, { text: config.msg.premium }, { quoted: m });
                    }

                    if (cmd.permissions.group && !isGroup) {
                        return await sock.sendMessage(from, { text: config.msg.group }, { quoted: m });
                    }

                    if (isGroup && (cmd.permissions.admin || cmd.permissions.botAdmin)) {
                        const groupMetadata = await sock.groupMetadata(from);
                        const participants = groupMetadata.participants;
                        const admins = participants.filter(p => p.admin).map(p => p.id);
                        const botId = sock.user.id.split(':')[0] + '@s.whatsapp.net';

                        if (cmd.permissions.admin && !admins.includes(sender) && !senderIsOwner) {
                            return await sock.sendMessage(from, { text: config.msg.admin }, { quoted: m });
                        }

                        if (cmd.permissions.botAdmin && !admins.includes(botId)) {
                            return await sock.sendMessage(from, { text: config.msg.botAdmin }, { quoted: m });
                        }
                    }
                }

                await cmd.code(sock, m, helpers);
            } catch (err) {
                consolefy.error(`Error executing command ${commandName}:`, err);
                await sock.sendMessage(from, { text: `Terjadi kesalahan: ${err.message}` }, { quoted: m });
            }
        }
    }
};
