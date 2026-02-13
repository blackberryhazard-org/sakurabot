# SakuraBot 🌸

SakuraBot adalah bot multi-platform (WhatsApp & Telegram) yang canggih dengan fitur ekonomi, game, dan manajemen grup.

## Fitur Utama
- **Multi-Platform**: Mendukung Telegram (Telegraf) dan WhatsApp (Baileys).
- **Sistem Ekonomi**: Sakuranite, Coins, Gacha Tickets, dan Inventory.
- **Game**: Berbagai macam game interaktif (Family 100, Tebak-tebakan, dll).
- **Keamanan**: Sistem Ban, Cooldown (Rate Limiter), dan Verifikasi Langganan Channel.
- **Observability**: Audit Log dan Diagnostic Health Check.

## Persiapan & Instalasi

### Prasyarat
- Node.js v18 atau lebih baru.
- Token BotFather (untuk Telegram).
- Nomor WhatsApp (untuk WhatsApp).

### Langkah Instalasi
1. Clone repository ini.
2. Instal dependensi:
   ```bash
   npm install --legacy-peer-deps
   ```
3. Salin konfigurasi contoh:
   ```bash
   cp config.example.json config.json
   ```
4. Edit `config.json` atau set environment variables (lihat di bawah).

### Environment Variables
Anda dapat mengatur konfigurasi melalui file `.env`:
- `SAKURABOT_BOT_TOKEN`: Token Telegram Bot.
- `SAKURABOT_PHONE_NUMBER`: Nomor WhatsApp (format: 628xxx).
- `SAKURABOT_OWNER_TELE`: ID Telegram Owner.
- `SAKURABOT_OWNER_WA`: Nomor WhatsApp Owner.

## Penggunaan
Jalankan bot dengan perintah:
```bash
node .
```

Untuk melakukan pengecekan kualitas kode:
```bash
npm run lint
npm test
```

## Arsitektur
Informasi detail mengenai arsitektur proyek dapat ditemukan di [docs/architecture-summary.md](docs/architecture-summary.md).

## Lisensi
MIT