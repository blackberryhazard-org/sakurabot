import fs from 'fs';
import path from 'path';
import config from './config.js';

// Flatten config so it maps to global variables
for (const [sectionKey, sectionObj] of Object.entries(config)) {
    for (const [key, value] of Object.entries(sectionObj)) {
        global[key] = value;
    }
}
// Specifically handle geminiApiKey (which might have been googleApiKey previously)
global.googleApiKey = config.misc.geminiApiKey;
