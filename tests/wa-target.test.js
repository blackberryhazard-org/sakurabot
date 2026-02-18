// Mocking the getTarget function from wa/handler.js logic
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

describe("WA Target Resolver", () => {
    test("should resolve target from quoted message", () => {
        const m = {
            message: {
                extendedTextMessage: {
                    contextInfo: { participant: "123@s.whatsapp.net" }
                }
            }
        };
        expect(getTarget(m, [])).toBe("123@s.whatsapp.net");
    });

    test("should resolve target from mentions", () => {
        const m = {
            message: {
                extendedTextMessage: {
                    contextInfo: { mentionedJid: ["456@s.whatsapp.net"] }
                }
            }
        };
        expect(getTarget(m, [], ["mentioned"])).toBe("456@s.whatsapp.net");
    });

    test("should resolve target from numeric text", () => {
        const m = { message: { conversation: "hello" } };
        const args = ["628123456789"];
        expect(getTarget(m, args, ["text"])).toBe("628123456789@s.whatsapp.net");
    });

    test("should handle non-numeric text correctly (only numbers)", () => {
        const m = { message: { conversation: "hello" } };
        const args = ["@628123456789"];
        expect(getTarget(m, args, ["text"])).toBe("628123456789@s.whatsapp.net");
    });

    test("should return empty if no numeric found in text", () => {
        const m = { message: { conversation: "hello" } };
        const args = ["abc"];
        expect(getTarget(m, args, ["text"])).toBe("");
    });
});
