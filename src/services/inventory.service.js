class InventoryService {
    static items_serpulo = {
        Copper: 75,
        Lead: 100,
        Titanium: 250,
        Thorium: 500,
    };

    static items_erekir = {
        Beryllium: 100,
        Graphite: 200,
        Tungsten: 500,
        Thorium: 1000,
        Oxide: 2000,
        Carbide: 5000
    };

    constructor(db) {
        this.db = db;
    }

    getInventory(userId) {
        const data = this.db.get("inventory") || {}; return data[userId] || {};
    }

    addItem(userId, item, amount) {
        const inv = this.getInventory(userId);
        inv[item] = (inv[item] || 0) + amount;
        if (inv[item] <= 0) delete inv[item];
        const data = this.db.get("inventory") || {}; data[userId] = inv; this.db.set("inventory", data);
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
