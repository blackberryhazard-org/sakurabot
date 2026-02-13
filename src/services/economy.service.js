class EconomyService {
    constructor(db, logger = null) {
        this.db = db;
        this.logger = logger;
    }

    getBalance(userId, type = "sakuranite") {
        return this.db.get(`${type}.${userId}`) || 0;
    }

    updateBalance(userId, amount, type = "sakuranite", reason = "system_update") {
        const oldBalance = this.getBalance(userId, type);
        this.db.set(`${type}.${userId}`, amount);

        if (this.logger) {
            this.logger.log(userId, `UPDATE_${type.toUpperCase()}`, {
                oldBalance,
                newBalance: amount,
                reason
            });
        }
        return amount;
    }

    addBalance(userId, amount, type = "sakuranite", reason = "reward") {
        const current = this.getBalance(userId, type);
        return this.updateBalance(userId, current + amount, type, reason);
    }

    subtractBalance(userId, amount, type = "sakuranite", reason = "payment") {
        const current = this.getBalance(userId, type);
        if (current < amount) return false;
        return this.updateBalance(userId, current - amount, type, reason);
    }
}

module.exports = EconomyService;
