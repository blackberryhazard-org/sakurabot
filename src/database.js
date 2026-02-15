const { Database } = require("simpl.db");
const path = require("path");
const fs = require("fs");

const databases = {};

function getDb(platform) {
    if (databases[platform]) return databases[platform];

    const dbPath = path.resolve(__dirname, `../database/${platform}`);
    if (!fs.existsSync(dbPath)) fs.mkdirSync(dbPath, { recursive: true });

    databases[platform] = new Database({
        dataFile: path.join(dbPath, "database.json"),
        autoSave: true,
        tabSize: 2
    });

    return databases[platform];
}

module.exports = { getDb };
