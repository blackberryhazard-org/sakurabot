const { formatUptime, escapeHTML, createUrl } = require("../tools/utils");

describe("Utils", () => {
    test("formatUptime should return formatted string", () => {
        const startTime = Date.now() - 100000; // 100 seconds ago
        const uptime = formatUptime(startTime);
        expect(uptime).toMatch(/\d+d \d+h \d+m \d+s/);
    });

    test("escapeHTML should escape special characters", () => {
        expect(escapeHTML("<b>Hello</b>")).toBe("&lt;b&gt;Hello&lt;/b&gt;");
        expect(escapeHTML("&")).toBe("&amp;");
        expect(escapeHTML("\"")).toBe("&quot;");
        expect(escapeHTML("'")).toBe("&#039;");
    });

    test("createUrl should build correct URL", () => {
        const url = createUrl("turu", "/test", { q: "abc" });
        expect(url).toBe("https://mending-turu.web.id/test?q=abc");
    });

    test("createUrl should handle invalid URL error", () => {
        // Mock global consolefy to avoid ReferenceError during test if it's used
        global.consolefy = { error: jest.fn() };
        const url = createUrl("invalid-api", "/test");
        expect(url).toBeNull();
        expect(global.consolefy.error).toHaveBeenCalled();
        delete global.consolefy;
    });
});
