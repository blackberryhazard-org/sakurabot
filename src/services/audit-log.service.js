const fs = require("fs");
const path = require("path");
const moment = require("moment-timezone");

class AuditLogService {
    constructor(logDir) {
        this.logDir = logDir;
        if (!fs.existsSync(logDir)) fs.mkdirSync(logDir, { recursive: true });
    }

    log(actor, action, details) {
        const timestamp = moment().tz("Asia/Jakarta").format("YYYY-MM-DD HH:mm:ss");
        const logEntry = `[${timestamp}] ACTOR: ${actor} | ACTION: ${action} | DETAILS: ${JSON.stringify(details)}\n`;

        const fileName = `audit-${moment().tz("Asia/Jakarta").format("YYYY-MM-DD")}.log`;
        fs.appendFileSync(path.join(this.logDir, fileName), logEntry);
    }
}

module.exports = AuditLogService;
