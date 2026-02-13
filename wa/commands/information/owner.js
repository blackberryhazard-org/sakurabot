module.exports = {
    name: "owner",
    aliases: ["developer"],
    code: async (sock, m, { config }) => {
        const owners = [config.owner, ...(config.owner.co || [])];
        const contacts = owners.map(owner => {
            const vcard = "BEGIN:VCARD\n" +
                "VERSION:3.0\n" +
                `FN:${owner.name}\n` +
                `ORG:${owner.organization || "SakuraBot"};\n` +
                `TEL;type=CELL;type=VOICE;waid=${owner.id}:+${owner.id}\n` +
                "END:VCARD";
            return {
                vcard,
                displayName: owner.name
            };
        });

        if (contacts.length === 1) {
            await sock.sendMessage(m.key.remoteJid, {
                contacts: {
                    displayName: contacts[0].displayName,
                    contacts: [contacts[0]]
                }
            }, { quoted: m });
        } else {
            await sock.sendMessage(m.key.remoteJid, {
                contacts: {
                    displayName: `${contacts.length} Contacts`,
                    contacts: contacts
                }
            }, { quoted: m });
        }
    }
};
