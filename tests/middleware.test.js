const middlewareFactory = require("../tg/middleware");

describe("TG Middleware", () => {
    let db, config, helpers, bot, userCooldowns, dependencies;
    let ctx, next;

    beforeEach(() => {
        db = {
            get: jest.fn(),
            set: jest.fn(),
            delete: jest.fn()
        };
        config = {
            msg: {
                banned: "You are banned",
                cooldown: "Wait for"
            },
            bot: {
                tg_newsletterid: "123"
            }
        };
        helpers = {
            userAccess: {
                isOwner: jest.fn(),
                isPremium: jest.fn()
            },
            economy: {
                addBalance: jest.fn()
            }
        };
        bot = {
            telegram: {
                sendMessage: jest.fn()
            },
            cmd: new Map([
                ["kick", { name: "kick" }],
                ["dor", { name: "kick" }]
            ])
        };
        userCooldowns = {
            check: jest.fn()
        };
        dependencies = { db, config, helpers, bot, userCooldowns };

        ctx = {
            from: { id: 123, first_name: "Test" },
            chat: { type: "private" },
            message: { text: "/kick" },
            reply: jest.fn(),
            telegram: {
                getChatMember: jest.fn(),
                getChat: jest.fn()
            }
        };
        next = jest.fn();
    });

    test("addUserMiddleware should save user ID", () => {
        const { addUserMiddleware } = middlewareFactory(dependencies);
        db.get.mockReturnValue([]);
        addUserMiddleware(ctx, next);
        expect(db.set).toHaveBeenCalledWith("users", [123]);
        expect(next).toHaveBeenCalled();
    });

    test("banMiddleware should block banned users", () => {
        const { banMiddleware } = middlewareFactory(dependencies);
        const now = new Date();
        const future = new Date(now.getTime() + 10000);
        db.get.mockReturnValue([{ id: 123, until: future.toISOString() }]);

        banMiddleware(ctx, next);
        expect(ctx.reply).toHaveBeenCalledWith(config.msg.banned);
        expect(next).not.toHaveBeenCalled();
    });

    test("cooldownMiddleware should block commands if in cooldown", () => {
        const { cooldownMiddleware } = middlewareFactory(dependencies);
        helpers.userAccess.isOwner.mockReturnValue(false);
        helpers.userAccess.isPremium.mockReturnValue(false);

        userCooldowns.check.mockReturnValue({ isLimited: true, timeLeft: 5.0 });

        cooldownMiddleware(ctx, next);
        expect(ctx.reply).toHaveBeenCalledWith(expect.stringContaining(config.msg.cooldown));
        expect(next).not.toHaveBeenCalled();
    });

    test("cooldownMiddleware should use canonical name for aliases", () => {
        const { cooldownMiddleware } = middlewareFactory(dependencies);
        helpers.userAccess.isOwner.mockReturnValue(false);
        helpers.userAccess.isPremium.mockReturnValue(false);
        userCooldowns.check.mockReturnValue({ isLimited: false });

        ctx.message.text = "/dor"; // alias for /kick
        cooldownMiddleware(ctx, next);

        expect(userCooldowns.check).toHaveBeenCalledWith(123, "kick", expect.any(Number));
        expect(next).toHaveBeenCalled();
    });
});
