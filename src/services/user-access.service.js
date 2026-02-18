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
        const leaderTele = this.config.owner.id_tele.toString();
        const leaderWa = this.config.owner.num_wa.toString();

        const cleanId = this.normalizeUserId(userId);
        return cleanId === leaderTele || cleanId === leaderWa;
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
