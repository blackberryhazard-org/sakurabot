import fs from "fs";
import path from "path";
import config from "./config.js";

// Hardcoded paths
global.authFolder = "data/wa/session";
global.databaseFilename = "data/wa/database.json";
global.storeFilename = "data/wa/store.json";
global.temporaryFolder = "data/temp";

// Flatten config so it maps to global variables
for (const [sectionKey, sectionObj] of Object.entries(config)) {
  for (const [key, value] of Object.entries(sectionObj)) {
    if (
      ![
        "authFolder",
        "databaseFilename",
        "storeFilename",
        "temporaryFolder",
      ].includes(key)
    ) {
      global[key] = value;
    }
  }
}
// Specifically handle geminiApiKey (which might have been googleApiKey previously)
global.googleApiKey = config.misc.geminiApiKey;
