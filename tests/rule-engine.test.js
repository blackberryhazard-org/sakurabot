const RuleEngineService = require("../src/services/rule-engine.service");

// Mock database
class MockDb {
    constructor() {
        this.data = {};
    }
    get(key) { return this.data[key]; }
    set(key, val) { this.data[key] = val; }
    has(key) { return key in this.data; }
}

// Mock audit log
class MockAuditLog {
    constructor() {
        this.logs = [];
    }
    log(actor, action, details) {
        this.logs.push({ actor, action, details });
    }
}

describe("RuleEngineService", () => {
    let db, auditLog, config, ruleEngine;

    beforeEach(() => {
        db = new MockDb();
        auditLog = new MockAuditLog();
        config = { owner: { telegramId: "123" } };
        ruleEngine = new RuleEngineService(db, auditLog, config);
    });

    test("should register default rules", () => {
        const rules = ruleEngine.listRules();
        expect(rules.length).toBeGreaterThan(0);
        expect(rules.find(r => r.name === "anti-link")).toBeDefined();
    });

    test("should evaluate anti-link rule and detect link", async () => {
        // Enable anti-link for this test chat
        ruleEngine.updateChatSetting("chat1", "anti-link", true);

        const context = {
            chatId: "chat1",
            userId: "user1",
            text: "Check this out https://chat.whatsapp.com/invite/123",
            isAdmin: false,
            helpers: { db }
        };

        const results = await ruleEngine.evaluate("onMessage", context);
        expect(results.some(r => r.rule === "anti-link" && r.action === "delete")).toBe(true);
    });

    test("should not delete message if user is admin", async () => {
        ruleEngine.updateChatSetting("chat1", "anti-link", true);

        const context = {
            chatId: "chat1",
            userId: "user1",
            text: "https://chat.whatsapp.com/invite/123",
            isAdmin: true,
            helpers: { db }
        };

        const results = await ruleEngine.evaluate("onMessage", context);
        expect(results.some(r => r.rule === "anti-link" && r.action === "delete")).toBe(false);
    });

    test("should evaluate anti-toxic rule", async () => {
        ruleEngine.updateChatSetting("chat1", "anti-toxic", true);

        const context = {
            chatId: "chat1",
            userId: "user1",
            text: "dasar bajingan",
            isAdmin: false,
            helpers: { db }
        };

        const results = await ruleEngine.evaluate("onMessage", context);
        expect(results.some(r => r.rule === "anti-toxic" && r.action === "delete")).toBe(true);
    });

    test("should evaluate auto-levelup rule", async () => {
        // Mock leveling data
        db.set("exp", { "user1": 1000 });
        db.set("level", { "user1": 0 });

        const context = {
            chatId: "chat1",
            userId: "user1",
            helpers: { db }
        };

        const results = await ruleEngine.evaluate("onMessage", context);
        expect(results.some(r => r.rule === "auto-levelup" && r.action === "reply")).toBe(true);
    });

    test("should log sensitive actions to audit log", async () => {
        const context = {
            chatId: "chat1",
            userId: "owner1",
            isOwner: true,
            text: "Hello all",
            targetCount: 10,
            helpers: { db }
        };

        await ruleEngine.evaluate("onCommand", context);

        const broadcastLog = auditLog.logs.find(l => l.action === "RULE_BROADCAST");
        expect(broadcastLog).toBeDefined();
        expect(broadcastLog.details.details.targetCount).toBe(10);
    });
});
