const { downloadContentFromMessage } = require("@whiskeysockets/baileys");
const { Sticker, StickerTypes } = require("wa-sticker-formatter");
const didyoumean = require("didyoumean");
const middleware = require("./middleware");
const ruleProcessor = require("./rule-processor");

module.exports = async (sock, m, db, waBot, items, services, config, tools, consolefy) => {
    const { userAccess, economy, inventory: inventoryService, linking, cooldown, game, mining, ruleEngine } = services;
    const from = m.key.remoteJid;
    const sender = m.key.participant || m.key.remoteJid;
    const type = Object.keys(m.message)[0];
    const pushName = m.pushName || "User";

    middleware.registerUser(db, sender);

    let body = "";
    if (type === "conversation") body = m.message.conversation;
    else if (type === "extendedTextMessage") body = m.message.extendedTextMessage.text;
    else if (type === "imageMessage") body = m.message.imageMessage.caption;
    else if (type === "videoMessage") body = m.message.videoMessage.caption;
    body = body || "";
    const isRuleHandled = await ruleProcessor(sock, m, body, from, sender, { ...services, db }, config, { userAccess, economy, inventory: inventoryService, linking, cooldown, game, mining });
    if (isRuleHandled) return;

    const prefix = config.bot.prefix || "/";
    const isCmd = body.startsWith(prefix);
    const commandName = isCmd ? body.slice(prefix.length).trim().split(" ")[0].toLowerCase() : "";
    const args = body.trim().split(/ +/).slice(1);

    const getTarget = (m, args, types = ["quoted", "mentioned", "text"]) => {
        const type = Object.keys(m.message)[0];
        const contextInfo = m.message[type]?.contextInfo;
        let target = "";
        if (types.includes("quoted") && contextInfo?.participant) target = contextInfo.participant;
        else if (types.includes("mentioned") && contextInfo?.mentionedJid?.length > 0) target = contextInfo.mentionedJid[0];
        else if (types.includes("text") && args[0]) {
            const numeric = args[0].replace(/[^0-9]/g, "");
            if (numeric.length > 0) target = numeric + "@s.whatsapp.net";
        }
        return target;
    };

    const downloadMedia = async (message) => {
        const type = Object.keys(message)[0];
        const stream = await downloadContentFromMessage(message[type], type.split("Message")[0]);
        let buffer = Buffer.from([]);
        for await (const chunk of stream) buffer = Buffer.concat([buffer, chunk]);
        return buffer;
    };

    const getGroupDb = (jid) => {
        if (!jid.endsWith("@g.us")) return null;
        return new Proxy({}, {
            get: (target, prop) => {
                if (prop === "save") return () => {};
                const groups = db.get("groups") || {};
                const group = groups[jid] || {};
                return group[prop];
            },
            set: (target, prop, value) => {
                const groups = db.get("groups") || {};
                if (!groups[jid]) groups[jid] = {};
                groups[jid][prop] = value;
                db.set("groups", groups);
                return true;
            }
        });
    };
    const ctx = {
        // Legacy fields (Deprecated: use helpers or specialized ctx fields instead)
        m, id: from, args, sender, me: sock.user.id, getId: (jid) => jid || from,
        reply: async (content, options = {}) => {
            if (typeof content === "string") return await sock.sendMessage(from, { text: content, ...options }, { quoted: m });
            else return await sock.sendMessage(from, { ...content, ...options }, { quoted: m });
        },
        replyWithJid: async (jid, content, options = {}) => {
            if (typeof content === "string") return await sock.sendMessage(jid, { text: content, ...options });
            else return await sock.sendMessage(jid, { ...content, ...options });
        },
        target: async (types) => getTarget(m, args, types),
        db: { group: from.endsWith("@g.us") ? getGroupDb(from) : null },
        core: { onWhatsApp: async (jid) => { const [result] = await sock.onWhatsApp(jid); return result ? [result] : []; } },
        msg: { messageType: type, download: async () => await downloadMedia(m.message) },
        group: (jid = from) => ({
            name: async () => { if (!jid.endsWith("@g.us")) return null; const metadata = await sock.groupMetadata(jid); return metadata.subject; },
            isOwner: async (participantJid) => { if (!jid.endsWith("@g.us")) return false; const metadata = await sock.groupMetadata(jid); return metadata.owner === participantJid || metadata.owner === participantJid.replace("@s.whatsapp.net", "@c.us"); },
            kick: async (participantJid) => { if (!jid.endsWith("@g.us")) return false; return await sock.groupParticipantsUpdate(jid, [participantJid], "remove"); },
            add: async (participantJid) => { if (!jid.endsWith("@g.us")) return false; return await sock.groupParticipantsUpdate(jid, [participantJid], "add"); },
            promote: async (participantJid) => { if (!jid.endsWith("@g.us")) return false; return await sock.groupParticipantsUpdate(jid, [participantJid], "promote"); },
            demote: async (participantJid) => { if (!jid.endsWith("@g.us")) return false; return await sock.groupParticipantsUpdate(jid, [participantJid], "demote"); },
            inviteCode: async () => { if (!jid.endsWith("@g.us")) return null; return await sock.groupInviteCode(jid); },
            members: async () => { if (!jid.endsWith("@g.us")) return []; const metadata = await sock.groupMetadata(jid); return metadata.participants.map(p => ({ ...p, jid: p.id })); },
            pendingMembers: async () => { if (!jid.endsWith("@g.us")) return []; return await sock.groupRequestParticipantsList(jid); },
            approve: async (participantJid) => { if (!jid.endsWith("@g.us")) return false; return await sock.groupRequestParticipantsUpdate(jid, [participantJid], "approve"); },
            reject: async (participantJid) => { if (!jid.endsWith("@g.us")) return false; return await sock.groupRequestParticipantsUpdate(jid, [participantJid], "reject"); },
            setSubject: async (subject) => { if (!jid.endsWith("@g.us")) return false; return await sock.groupUpdateSubject(jid, subject); },
            setDescription: async (description) => { if (!jid.endsWith("@g.us")) return false; return await sock.groupUpdateDescription(jid, description); },
            leave: async () => { if (!jid.endsWith("@g.us")) return false; return await sock.groupLeave(jid); },
            setting: async (setting) => { if (!jid.endsWith("@g.us")) return false; return await sock.groupSettingUpdate(jid, setting); }
        }),
        text: args.join(" "),
        quoted: m.message[type]?.contextInfo?.quotedMessage ? {
            text: m.message[type].contextInfo.quotedMessage.conversation || m.message[type].contextInfo.quotedMessage.extendedTextMessage?.text || m.message[type].contextInfo.quotedMessage.imageMessage?.caption || m.message[type].contextInfo.quotedMessage.videoMessage?.caption,
            messageType: Object.keys(m.message[type].contextInfo.quotedMessage)[0],
            download: async () => await downloadMedia(m.message[type].contextInfo.quotedMessage)
        } : null,
        used: { prefix, command: commandName }
    };

    const helpers = {
        userAccess, economy, inventory: inventoryService, linking, game, mining, auditLog: services.auditLog || global.auditLog, ctx, ruleEngine,
        tools, config,
        isLeader: (jid) => userAccess.isLeader(jid),
        isManager: (jid) => userAccess.isManager(jid),
        isOwner: (jid) => userAccess.isOwner(jid),
        isPremium: (jid) => userAccess.isPremium(jid),
        getSakuranite: (jid) => economy.getBalance(jid, "sakuranite"),
        updateSakuranite: (jid, amount) => economy.updateBalance(jid, amount, "sakuranite"),
        getInventory: (jid) => inventoryService.getInventory(jid),
        updateInventory: (id, item, amount) => inventoryService.addItem(id, item, amount),
        getMiningTickets: (jid) => mining.getTickets(jid),
        updateMiningTickets: (jid, amount) => mining.updateTickets(jid, amount),
        getMiningRate: (jid) => mining.getRate(jid),
        updateMiningRate: (jid, amount) => mining.updateRate(jid, amount),
        db, waBot, items, downloadContentFromMessage, Sticker, StickerTypes, prefix, pushName, sender, from, args
    };
    const activeGame = waBot.games.get(from);
    if (activeGame && !isCmd) {
        const result = game.handleAnswer(activeGame, body, sender, pushName || sender.split("@")[0]);
        if (result) {
            if (result.status === "game_over" || result.status === "surrender") { if (activeGame.timeoutRef) clearTimeout(activeGame.timeoutRef); waBot.games.delete(from); }
            return await sock.sendMessage(from, { text: result.message, mentions: result.mentions || [] }, { quoted: m });
        }
    }

    const session = waBot.sessions.get(sender);
    if (session && !isCmd) {
        if (session.type === "linking" && /^\d{4}$/.test(body)) {
            if (body === session.code) {
                linking.link(session.tgId, sender);
                waBot.sessions.delete(sender);
                return await sock.sendMessage(from, { text: "✅ Integrasi berhasil! Akun WhatsApp Anda sekarang terhubung dengan ID Telegram " + session.tgId + "." }, { quoted: m });
            } else {
                session.attempts = (session.attempts || 0) + 1;
                if (session.attempts >= 3) { waBot.sessions.delete(sender); return await sock.sendMessage(from, { text: "❌ Kode salah 3 kali. Sesi integrasi dibatalkan." }, { quoted: m }); }
                return await sock.sendMessage(from, { text: "❌ Kode salah. Silakan coba lagi (Sisa percobaan: " + (3 - session.attempts) + ")" }, { quoted: m });
            }
        }
    }

    if (isCmd) {
        const cmd = waBot.cmd.get(commandName);
        if (!cmd) {
            const allCommands = Array.from(waBot.cmd.keys());
            const suggestion = didyoumean(commandName, allCommands);
            if (suggestion) {
                return ctx.reply(`Command *${prefix}${commandName}* tidak ditemukan. Mungkin maksud Anda *${prefix}${suggestion}*?`);
            }
        }
        if (cmd) {
            const canonicalName = cmd.name || commandName;
            if (!["ping", "menu", "me", "start"].includes(canonicalName) && !userAccess.isOwner(sender)) {
                const cooldownDuration = userAccess.isPremium(sender) ? 3000 : 10000;
                const cooldownResult = cooldown.check(sender, canonicalName, cooldownDuration);
                if (cooldownResult.isLimited) {
                    return ctx.reply(`${config.msg.cooldown} ${cooldownResult.timeLeft.toFixed(1)}s`);
                }
            }
            try {
                if (cmd.permissions) {
                    const isGroup = from.endsWith("@g.us");
                    if (cmd.permissions.owner && !userAccess.isOwner(sender)) return ctx.reply(config.msg.owner);
                    if (cmd.permissions.leader && !userAccess.isLeader(sender)) return ctx.reply("Perintah ini hanya untuk Leader!");
                    if (cmd.permissions.premium && !userAccess.isPremium(sender) && !userAccess.isOwner(sender)) return ctx.reply(config.msg.premium);
                    if (cmd.permissions.group && !isGroup) return ctx.reply(config.msg.group);
                    if (isGroup && (cmd.permissions.admin || cmd.permissions.botAdmin)) {
                        const metadata = await sock.groupMetadata(from);
                        const admins = metadata.participants.filter(p => p.admin).map(p => p.id);
                        if (cmd.permissions.admin && !admins.includes(sender) && !userAccess.isOwner(sender)) return ctx.reply(config.msg.admin);
                        if (cmd.permissions.botAdmin && !admins.includes(sock.user.id.split(":")[0] + "@s.whatsapp.net")) return ctx.reply(config.msg.botAdmin);
                    }
                }
                await cmd.code(sock, m, helpers);
            } catch (err) {
                const errorMsg = `Error executing command ${commandName}:`;
                if (consolefy && consolefy.error) consolefy.error(errorMsg, err);
                else console.error(errorMsg, err);
                await ctx.reply(`Terjadi kesalahan: ${err.message}`);
            }
        }
    }
};
