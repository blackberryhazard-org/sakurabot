# Sakurabot

<div align="center">
   
![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black)
![Node.js](https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)
![Baileys](https://img.shields.io/badge/@itsliaaa/baileys-25D366?style=for-the-badge&logo=whatsapp&logoColor=white)
![License](https://img.shields.io/badge/License-Apache%202.0-violet?style=for-the-badge)

[![Stars](https://img.shields.io/github/stars/indra87g/sakurabot?style=for-the-badge)](https://github.com/indra87g/sakurabot/stargazers)
[![Forks](https://img.shields.io/github/forks/indra87g/sakurabot?style=for-the-badge)](https://github.com/indra87g/sakurabot/network/members)
[![Issues](https://img.shields.io/github/issues/indra87g/sakurabot?style=for-the-badge)](https://github.com/indra87g/sakurabot/issues)

[![DeepSource](https://app.deepsource.com/gh/indra87g/sakurabot.svg/?label=active+issues&show_trend=false&token=m7kgoYuFrGoUySJ9diJ7Zwix)](https://app.deepsource.com/gh/indra87g/sakurabot/)

</div>


> [!CAUTION]
This project is a fork of [`@itsliaaa/starseed`](https://github.com/itsliaaa/starseed#readme).


### 📄 System Requirements

| 🔹 Minimum | ✨ Recommended |
|------------|------------|
| 1 vCPU | 1 vCPU |
| 512 MB RAM | 1 GB RAM |
| 1 GB Free Space | 2 GB Free Space |
| FFmpeg v6.x.x | FFmpeg v6.x.x |
| Node.js v20.18.1 LTS | Node.js v24.x.x LTS |
| Yarn v1.x.x | Yarn v1.22.22 |

### 🗄️ Server

To run the bot, I highly recommend the following services. They are not only affordable, but also ensure that user data stored in the database remains secure:

- [x] NAT VPS [Hostdata](https://hostdata.id/nat-vps-usa/) (Highly Recommended)
- [x] Hosting Panel [The Hoster](https://thehoster.net/bot-hosting/)
- [x] VPS [OVH Hosting](https://www.ovhcloud.com/asia/vps/)

### ⬇️ How to Download

![DownloadStep](https://files.catbox.moe/4dz3ip.jpg)

1. Click the **Code** button.
2. Select **Download ZIP**.
3. Extract the downloaded file.

### 🔧 Configuration

Edit [config.js](https://github.com/indra87g/sakurabot/blob/main/config.js) to customize the bot:

```javascript
const wabot = {
   ownerName: 'OWNER_NAME',
   ownerNumber: 'OWNER_NUMBER',
   botName: 'BOT_NAME',
   footer: '✦ Sakurabot',
   botNumber: 'BOT_NUMBER',
   pairingCode: true,
   defaultLimit: 15,
   stickerPackName: '📦 Sakurabot Sticker',
   stickerPackPublisher: 'GitHub: indra87g',
   // ...
};

const tgbot = {
    ownerId: "OWNER_ID",
    newsletterId: "NEWSLETTER_ID",
    botname: "BOT_NAME",
    botfatherToken: "BOTFATHER_TOKEN"
};

const misc = {
    temporaryFolder: 'temp',
    pluginsFolder: 'plugins',
    storeFilename: 'store.json',
    databaseFilename: 'database.json',
    geminiApiKey: 'GEMINI_APIKEY'
};
```

### 📁 Plugins

You can follow this format to add your own plugins:

```javascript
export default {
   command: 'your_command',
   hidden: 'your_hidden_command',
   category: 'your_category_name',
   async run(m, {
      sock,
      // ...other values from handler.js
   }) {
      /* YOUR LOGIC HERE */
   },
   group: false, // is this command only for group chats?
   private: false, // is this command only for private chats?
   owner: false, // is this command only for the owner?
   partner: false, // is this command only for partners?
   admin: false, // is this command only for group admins?
   botAdmin: false, // does this command require the bot to be a group admin?
   limit: 1 // command usage cost
}
```

See the documentation in [`@itsliaaa/baileys`](https://github.com/itsliaaa/baileys#-sending-interactive-messages) for details about sending interactive messages.

### 👤 Credits

- [itsliaaa](https://github.com/itsliaaa) — Original Creator

#### 🌐 Third-Party Services

Starseed utilizes the following external APIs:

- [rynn-k](https://github.com/rynn-k) — Nekolabs API
- [elrayyxml](https://github.com/elrayyxml) — Nexray API
- [faa](https://whatsapp.com/channel/0029Vb7APG9InlqWTBGDnN3d) — Faa API
- [Deline Clarissa](https://whatsapp.com/channel/0029VbB8WYS4CrfhJCelw33j) — Deline API
- [ZenzzXD](https://github.com/ZenzzXD) — Zennz API

These services are used as external integrations and are not directly affiliated with the development of Starseed.
