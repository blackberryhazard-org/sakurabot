const CooldownService = require("../src/services/cooldown.service");

describe("CooldownService", () => {
    let service;

    beforeEach(() => {
        service = new CooldownService();
    });

    test("should allow first call", () => {
        const result = service.check("user1", "ping", 1000);
        expect(result.isLimited).toBe(false);
    });

    test("should block subsequent call within duration", () => {
        service.check("user1", "ping", 1000);
        const result = service.check("user1", "ping", 1000);
        expect(result.isLimited).toBe(true);
        expect(result.timeLeft).toBeGreaterThan(0);
    });

    test("should allow different commands for same user", () => {
        service.check("user1", "ping", 1000);
        const result = service.check("user1", "help", 1000);
        expect(result.isLimited).toBe(false);
    });

    test("should allow same command for different users", () => {
        service.check("user1", "ping", 1000);
        const result = service.check("user2", "ping", 1000);
        expect(result.isLimited).toBe(false);
    });

    test("should allow call after duration expired", async () => {
        service.check("user1", "ping", 10); // 10ms
        await new Promise(resolve => setTimeout(resolve, 20));
        const result = service.check("user1", "ping", 10);
        expect(result.isLimited).toBe(false);
    });
});
