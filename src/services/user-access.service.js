class UserAccessService {
    constructor(db, config) {
        this.db = db;
        this.config = config;
    }

    isLeader(userId) {
        // userId can be JID or TG ID
        const leaderTele = this.config.owner.id_tele.toString();
        const leaderWa = this.config.owner.num_wa.toString();

        const cleanId = userId.toString().split("@")[0];
        return cleanId === leaderTele || cleanId === leaderWa;
    }

    isManager(userId) {
        const managers = this.db.get("managers") || [];
        return managers.includes(userId) || managers.includes(parseInt(userId));
    }

    isOwner(userId) {
        return this.isLeader(userId) || this.isManager(userId);
    }

    isPremium(userId) {
        const premiumUsers = this.db.get("premium") || [];
        return premiumUsers.includes(userId) || premiumUsers.includes(parseInt(userId));
    }
}

module.exports = UserAccessService;
