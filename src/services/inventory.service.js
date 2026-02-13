class InventoryService {
    constructor(db) {
        this.db = db;
    }

    getInventory(userId) {
        return this.db.get(`inventory.${userId}`) || {};
    }

    addItem(userId, item, amount) {
        const inv = this.getInventory(userId);
        inv[item] = (inv[item] || 0) + amount;
        if (inv[item] <= 0) delete inv[item];
        this.db.set(`inventory.${userId}`, inv);
        return inv;
    }

    removeItem(userId, item, amount) {
        return this.addItem(userId, item, -amount);
    }

    hasItem(userId, item, amount = 1) {
        const inv = this.getInventory(userId);
        return (inv[item] || 0) >= amount;
    }
}

module.exports = InventoryService;
