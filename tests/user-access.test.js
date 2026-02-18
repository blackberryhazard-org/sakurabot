const UserAccessService = require("../src/services/user-access.service");

describe("UserAccessService", () => {
    let db, config, service;

    beforeEach(() => {
        db = {
            get: jest.fn()
        };
        config = {
            owner: {
                id_tele: "123456789",
                num_wa: "628123456789"
            }
        };
        service = new UserAccessService(db, config);
    });

    test("normalizeUserId should handle different ID formats", () => {
        expect(service.normalizeUserId("123456789")).toBe("123456789");
        expect(service.normalizeUserId(123456789)).toBe("123456789");
        expect(service.normalizeUserId("628123456789@s.whatsapp.net")).toBe("628123456789");
        expect(service.normalizeUserId("628123456789:5@s.whatsapp.net")).toBe("628123456789");
    });

    test("isLeader should identify owner correctly", () => {
        expect(service.isLeader("123456789")).toBe(true);
        expect(service.isLeader("628123456789@s.whatsapp.net")).toBe(true);
        expect(service.isLeader("628123456789:1@s.whatsapp.net")).toBe(true);
        expect(service.isLeader("987654321")).toBe(false);
    });

    test("isManager should identify manager correctly", () => {
        db.get.mockReturnValue(["987654321"]);
        expect(service.isManager("987654321")).toBe(true);
        expect(service.isManager("987654321@s.whatsapp.net")).toBe(true);
        expect(service.isManager("111111111")).toBe(false);
    });
});
