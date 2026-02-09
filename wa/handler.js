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
        if (!jid) return false;
        return config.owner.id === jid.split('@')[0];
    };

    const isManager = (jid) => {
        if (!jid) return false;
        const managers = db.get('managers') || [];
        return managers.includes(jid);
    };

    const isOwner = (jid) => {
        return isLeader(jid) || isManager(jid);
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
        } else if (types.includes("text") && args.length > 0) {
            const t = args[0].replace(/[^0-9]/g, '');
            if (t.length > 0) target = t + '@s.whatsapp.net';
        }
        return target;
    };

    const ctxType = Object.keys(m.message)[0];
    const contextInfo = m.message[ctxType]?.contextInfo;

    const downloadMedia = async (message) => {
        const mType = Object.keys(message)[0];
        const mediaMessage = message[mType];
        if (!mediaMessage) return null;
        const stream = await downloadContentFromMessage(mediaMessage, mType.replace('Message', ''));
        let buffer = Buffer.from([]);
        for await (const chunk of stream) {
            buffer = Buffer.concat([buffer, chunk]);
        }
        return buffer;
    };

    const getGroupDb = (jid) => {
        let groupData = db.get(`groups.${jid}`) || {};
        return new Proxy(groupData, {
            get(target, prop) {
                if (prop === 'save') {
                    return () => db.set(`groups.${jid}`, groupData);
                }
                return target[prop];
            },
            set(target, prop, value) {
                target[prop] = value;
                return true;
            }
        });
    };

    const ctx = {
        id: from,
        args,
        prefix,
        sender: { jid: sender },
        me: { lid: sock.user.id.split(':')[0] + '@s.whatsapp.net' },
        isGroup: () => from.endsWith('@g.us'),
        getId: (jid) => jid.split('@')[0],
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
        quoted: contextInfo?.quotedMessage ? {
            text: contextInfo.quotedMessage.conversation ||
                  contextInfo.quotedMessage.extendedTextMessage?.text ||
                  contextInfo.quotedMessage.imageMessage?.caption ||
                  contextInfo.quotedMessage.videoMessage?.caption,
            download: async () => await downloadMedia(contextInfo.quotedMessage)
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
        isLeader,
        isManager,
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

    const bodyLower = body.toLowerCase();
    const activeGame = waBot.games.get(from);
    if (activeGame && !isCmd) {
        if (activeGame.answers) {
            // Multi-answer game (like Family 100)
            if (activeGame.answers.includes(bodyLower)) {
                if (activeGame.answered.includes(bodyLower)) {
                    return await sock.sendMessage(from, { text: `Jawaban *${bodyLower.toUpperCase()}* sudah terjawab!` }, { quoted: m });
                }

                activeGame.answered.push(bodyLower);
                const reward = activeGame.rewardPerAnswer || 100;
                updateSakuranite(sender, getSakuranite(sender) + reward);

                const remaining = activeGame.answers.length - activeGame.answered.length;
                if (remaining === 0) {
                    const totalReward = activeGame.rewardAllAnswered || 500;
                    updateSakuranite(sender, getSakuranite(sender) + totalReward);
                    if (activeGame.timeoutRef) clearTimeout(activeGame.timeoutRef);
                    waBot.games.delete(from);
                    return await sock.sendMessage(from, {
                        text: `Selamat @${sender.split('@')[0]}! Jawaban *${bodyLower.toUpperCase()}* benar!\n\n` +
                              `Semua jawaban telah terjawab! Anda mendapatkan bonus tambahan ${totalReward} Sakuranite.`,
                        mentions: [sender]
                    }, { quoted: m });
                } else {
                    return await sock.sendMessage(from, {
                        text: `Selamat @${sender.split('@')[0]}! Jawaban *${bodyLower.toUpperCase()}* benar!\n` +
                              `Tersisa ${remaining} jawaban lagi.`,
                        mentions: [sender]
                    }, { quoted: m });
                }
            }
        } else if (bodyLower === activeGame.answer) {
            const reward = activeGame.reward || 500;
            updateSakuranite(sender, getSakuranite(sender) + reward);
            if (activeGame.timeoutRef) clearTimeout(activeGame.timeoutRef);
            waBot.games.delete(from);
            return await sock.sendMessage(from, {
                text: `Selamat @${sender.split('@')[0]}! Jawaban Anda benar: *${activeGame.answer.toUpperCase()}*\n\n` +
                      (activeGame.description ? `Deskripsi: ${activeGame.description}\n\n` : "") +
                      `Anda mendapatkan ${reward} Sakuranite!`,
                mentions: [sender]
            }, { quoted: m });
        }

        if (bodyLower === 'hint') {
            if (activeGame.answer) {
                const clue = activeGame.answer.replace(/[aiueo]/g, "_").toUpperCase();
                return await sock.sendMessage(from, { text: `Petunjuk: \`${clue}\`` }, { quoted: m });
            } else {
                return await sock.sendMessage(from, { text: `Petunjuk tidak tersedia untuk game ini.` }, { quoted: m });
            }
        } else if (bodyLower === 'surrender') {
            if (activeGame.timeoutRef) clearTimeout(activeGame.timeoutRef);
            if (activeGame.answers) {
                const remaining = activeGame.answers.filter(ans => !activeGame.answered.includes(ans));
                waBot.games.delete(from);
                return await sock.sendMessage(from, { text: `Anda menyerah! Jawaban yang belum terjawab adalah: *${remaining.join(", ").toUpperCase()}*` }, { quoted: m });
            } else {
                const ans = activeGame.answer;
                waBot.games.delete(from);
                return await sock.sendMessage(from, { text: `Anda menyerah! Jawabannya adalah *${ans.toUpperCase()}*.` }, { quoted: m });
            }
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
                    const senderIsOwner = isOwner(sender);
                    const senderIsLeader = isLeader(sender);
                    const senderIsPremium = isPremium(sender);

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
