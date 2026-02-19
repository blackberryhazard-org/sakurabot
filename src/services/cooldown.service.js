class CooldownService {
    constructor() {
        this.cooldowns = new Map();
    }

    /**
     * Check if a user is in cooldown for a specific command
     * @param {string|number} userId
     * @param {string} commandName
     * @param {number} duration Cooldown duration in ms
     * @returns {Object} { isLimited: boolean, timeLeft: number }
     */
    check(userId, commandName = "global", duration = 3000) {
        const now = Date.now();
        const key = `${userId}:${commandName}`;
        const lastTime = this.cooldowns.get(key) || 0;

        if (now - lastTime < duration) {
            return {
                isLimited: true,
                timeLeft: (duration - (now - lastTime)) / 1000
            };
        }

        this.cooldowns.set(key, now);
        return { isLimited: false, timeLeft: 0 };
    }

    clear(userId, commandName = null) {
        if (commandName) {
            this.cooldowns.delete(`${userId}:${commandName}`);
        } else {
            // Clear all cooldowns for this user (not efficient but possible)
            for (const key of this.cooldowns.keys()) {
                if (key.startsWith(`${userId}:`)) this.cooldowns.delete(key);
            }
        }
    }
}

module.exports = CooldownService;
