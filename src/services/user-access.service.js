class UserAccessService {
    constructor(db, config) {
        this.db = db;
        this.config = config;
    }

    normalizeUserId(userId) {
        if (!userId) return "";
        let id = userId.toString();
        if (id.includes("@")) {
            // Handles WhatsApp JIDs like 628xxx:device@s.whatsapp.net
            id = id.split("@")[0].split(":")[0];
        }
        return id;
    }

    isLeader(userId) {
        const leaderTele = (this.config.owner.telegramId || "").toString();
        const leaderWa = (this.config.owner.whatsappNumber || "").toString().replace(/[^0-9]/g, "");

        const cleanId = this.normalizeUserId(userId);
        let altLeaderWa = leaderWa;
        if (leaderWa.startsWith("0")) {
            altLeaderWa = "62" + leaderWa.slice(1);
        }

        return cleanId === leaderTele || cleanId === leaderWa || cleanId === altLeaderWa;
    }

    isManager(userId) {
        const cleanId = this.normalizeUserId(userId);
        const managers = this.db.get("managers") || [];
        return managers.some(m => this.normalizeUserId(m) === cleanId);
    }

    isOwner(userId) {
        return this.isLeader(userId) || this.isManager(userId);
    }

    isPremium(userId) {
        const cleanId = this.normalizeUserId(userId);
        const premiumUsers = this.db.get("premium") || [];
        return premiumUsers.some(p => this.normalizeUserId(p) === cleanId);
    }
}

module.exports = UserAccessService;
