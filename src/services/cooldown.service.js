class CooldownService {
    constructor() {
        this.cooldowns = new Map();
    }

    check(userId, duration = 3000) {
        const now = Date.now();
        const lastTime = this.cooldowns.get(userId) || 0;

        if (now - lastTime < duration) {
            return {
                isLimited: true,
                timeLeft: (duration - (now - lastTime)) / 1000
            };
        }

        this.cooldowns.set(userId, now);
        return { isLimited: false };
    }
}

module.exports = CooldownService;
