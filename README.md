# SakuraBot 🌸

Multi-platform Bot (WhatsApp & Telegram) built with Node.js.

## Fitur Utama
- **Ekonomi & Game**: Sistem koin, sakuranite, gacha, dan mining.
- **Multi-Platform**: Dukungan penuh untuk WhatsApp (@whiskeysockets/baileys) dan Telegram (Telegraf).
- **Shared Core**: Logika bisnis (ekonomi, akses) terpusat dan dapat digunakan di kedua platform.
- **Account Linking**: Hubungkan akun WhatsApp dan Telegram Anda.
- **Reliability & Security**: Rate-limiting granular, audit logs, dan quality gates (lint + test).

## Quick Start

### Persiapan
1. Pastikan Anda memiliki Node.js v18+.
2. Salin `config.example.json` menjadi `config.json`.
3. Isi `config.json` dengan token dan kredensial Anda.

### Instalasi
```bash
npm install --legacy-peer-deps
```

### Menjalankan Bot
```bash
# Jalankan bot
node .

# Quality Check (Lint + Test)
npm run check
```

## Arsitektur
Informasi detail mengenai arsitektur dapat ditemukan di [docs/architecture-summary.md](docs/architecture-summary.md).

## Kontribusi & Pengembangan Command
Lihat [docs/command-contract.md](docs/command-contract.md) untuk panduan pembuatan perintah baru.

## Lisensi
MIT
