const moment = require("moment-timezone");
const levelling = require("./levelling");

/**
 * RuleEngineService
 * Centralized engine for moderation and automation rules.
 */
class RuleEngineService {
    /**
     * @param {object} db - Platform-specific database instance (simpl.db)
     * @param {object} auditLog - AuditLogService instance
     * @param {object} config - Application configuration
     */
    constructor(db, auditLog, config) {
        this.db = db;
        this.auditLog = auditLog;
        this.config = config;
        this.rules = new Map();

        // Ensure rule_settings exists in DB
        if (!this.db.has("rule_settings")) {
            this.db.set("rule_settings", {});
        }

        this.initDefaultRules();
    }

    /**
     * Register a new rule
     * @param {object} ruleDef - Rule definition
     */
    register(ruleDef) {
        if (!ruleDef.name || !ruleDef.event || typeof ruleDef.execute !== "function") {
            throw new Error("Invalid rule definition");
        }
        this.rules.set(ruleDef.name, {
            enabled: true,
            description: "",
            ...ruleDef
        });
    }

    /**
     * Evaluate rules for a given event
     * @param {string} event - Event type (onMessage, onCommand, onSchedule)
     * @param {object} context - Execution context
     */
    async evaluate(event, context) {
        const { chatId } = context;
        const chatRules = this.getChatSettings(chatId);
        const results = [];

        for (const [name, rule] of this.rules) {
            if (rule.event !== event) continue;

            // Check if rule is enabled for this chat
            const isEnabled = chatRules[name] !== undefined ? chatRules[name] : rule.enabled;
            if (!isEnabled) continue;

            try {
                const result = await rule.execute(context, chatRules[name + "_settings"] || {});
                if (result) {
                    results.push({ rule: name, ...result });

                    // Log sensitive actions
                    if (result.log) {
                        this.auditLog.log(context.userId || "SYSTEM", `RULE_${name.toUpperCase()}`, {
                            chatId,
                            action: result.action,
                            details: result.log
                        });
                    }
                }
            } catch (error) {
                console.error(`[RuleEngine] Error executing rule ${name}:`, error);
            }
        }

        return results;
    }

    /**
     * Get rule settings for a specific chat
     * @param {string} chatId
     */
    getChatSettings(chatId) {
        const allSettings = this.db.get("rule_settings") || {};
        return allSettings[chatId] || {};
    }

    /**
     * Update rule setting for a specific chat
     * @param {string} chatId
     * @param {string} ruleName
     * @param {any} value
     */
    updateChatSetting(chatId, ruleName, value) {
        const allSettings = this.db.get("rule_settings") || {};
        if (!allSettings[chatId]) allSettings[chatId] = {};
        allSettings[chatId][ruleName] = value;
        this.db.set("rule_settings", allSettings);
    }

    /**
     * List all registered rules
     */
    listRules() {
        return Array.from(this.rules.values()).map(r => ({
            name: r.name,
            description: r.description,
            event: r.event,
            enabled: r.enabled
        }));
    }

    /**
     * Initialize default rules migrated from etx
     */
    initDefaultRules() {
        // Anti-Link Rule
        this.register({
            name: "anti-link",
            description: "Detects and deletes group links, wa.me links, and generic URLs.",
            event: "onMessage",
            enabled: false,
            execute: async (ctx) => {
                if (ctx.isAdmin || ctx.userId === ctx.botId) return null;

                const gclinkRegex = /chat.whatsapp.com\/(?:invite\/)?([0-9A-Za-z]{20,24})/gi;
                const walinkRegex = /wa\.me\/([0-9])/gi;
                const genericLinkRegex = /(https?:\/\/(?:www\.|(?!www))[^\s\.]+\.[^\s]{2,}|www\.[^\s]+\.[^\s]{2,})/gi;

                const text = ctx.text || "";
                const isGroupLink = gclinkRegex.test(text);
                const isWaLink = walinkRegex.test(text);
                const isLink = genericLinkRegex.test(text);

                if (isGroupLink || isWaLink || isLink) {
                    return {
                        action: "delete",
                        reply: "*乂 Link Terdeteksi!*\nPesan kamu dihapus demi keamanan grup.",
                        log: { type: isGroupLink ? "group_link" : isWaLink ? "wa_link" : "generic_link", text }
                    };
                }
                return null;
            }
        });

        // Anti-Toxic Rule
        this.register({
            name: "anti-toxic",
            description: "Detects and deletes messages containing bad words.",
            event: "onMessage",
            enabled: false,
            execute: async (ctx) => {
                if (ctx.isAdmin || ctx.userId === ctx.botId) return null;

                const badwordRegex = /anj(k|g)|ajn?(g|k)|a?njin(g|k)|bajingan|b(a?n)?gsa?t|ko?nto?l|me?me?(k|q)|pe?pe?(k|q)|meki|titi(t|d)|pe?ler|tetek|toket|ngewe|go?blo?k|to?lo?l|idiot|(k|ng)e?nto?(t|d)|jembut|bego|dajj?al|janc(u|o)k|pantek|puki ?(mak)?|kimak|kampang|lonte|col(i|mek?)|pelacur|henceu?t|nigga|fuck|dick|bitch|tits|bastard|asshole/i;

                if (badwordRegex.test(ctx.text)) {
                    return {
                        action: "delete",
                        reply: "*📮 Kata-kata Kasar Terdeteksi!*\nMohon jaga etika dalam berbicara.",
                        log: { text: ctx.text }
                    };
                }
                return null;
            }
        });

        // Auto Level-up Notifier Rule
        this.register({
            name: "auto-levelup",
            description: "Notifies users when they level up.",
            event: "onMessage",
            enabled: true,
            execute: async (ctx) => {
                const { userId } = ctx;
                const expData = ctx.helpers.db.get("exp") || {};
                const levelData = ctx.helpers.db.get("level") || {};

                const exp = expData[userId] || 0;
                const currentLevel = levelData[userId] || 0;

                if (levelling.canLevelUp(currentLevel, exp, 38)) {
                    let newLevel = currentLevel;
                    while (levelling.canLevelUp(newLevel, exp, 38)) newLevel++;

                    return {
                        action: "reply",
                        text: `*🎉 C O N G R A T S 🎉*\n*\${currentLevel}* ➔ *\${newLevel}*\n\n*Note:* _Semakin sering berinteraksi dengan bot Semakin Tinggi level kamu_`,
                        updateLevel: newLevel
                    };
                }
                return null;
            }
        });

        // Broadcast Rule
        this.register({
            name: "broadcast",
            description: "Mass broadcast with metadata and audit log.",
            event: "onCommand",
            enabled: true,
            execute: async (ctx) => {
                if (!ctx.isOwner) return null;

                const time = moment().tz("Asia/Jakarta").format("YYYY-MM-DD HH:mm:ss");
                const footer = `\n\n––––––『 *BROADCAST* 』––––––\nDate: ${time}`;

                return {
                    action: "broadcast",
                    payload: ctx.text + footer,
                    log: { targetCount: ctx.targetCount, timestamp: time }
                };
            }
        });

        // Daily Cleanup Rule
        this.register({
            name: "daily-cleanup",
            description: "Daily system cleanup reminder.",
            event: "onSchedule",
            enabled: true,
            execute: async () => {
                const now = moment().tz("Asia/Jakarta");
                if (now.hour() === 0 && now.minute() === 0) {
                    return {
                        action: "log",
                        message: "System daily cleanup triggered.",
                        log: { timestamp: now.format() }
                    };
                }
                return null;
            }
        });
    }
}

module.exports = RuleEngineService;
