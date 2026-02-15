# Ringkasan Arsitektur SakuraBot

## Deskripsi Umum
SakuraBot adalah bot multi-platform (WhatsApp dan Telegram) yang dibangun menggunakan Node.js. Bot ini mengintegrasikan fitur ekonomi, game, dan manajemen grup/channel dalam satu ekosistem.

## Komponen Utama
1.  **Entry Point (`index.js`)**:
    - Mengatur siklus hidup aplikasi.
    - Memuat konfigurasi dari `config.json` dan menginisialisasi state global.
    - Meluncurkan adapter untuk masing-masing platform (WA & TG).

2.  **WhatsApp Adapter (`wa/`)**:
    - **Library**: `@whiskeysockets/baileys` (v7).
    - **Handler**: Mengelola parsing pesan, validasi perintah, dan manajemen sesi game/interaksi.
    - **Commands**: Dimuat secara dinamis dari subdirektori.

3.  **Telegram Adapter (`tg/`)**:
    - **Library**: `telegraf`.
    - **Middleware**: Mengatur keamanan (ban), registrasi user, pengecekan langganan channel, dan cooldown.
    - **Commands**: Dimuat secara dinamis dan didaftarkan ke Telegraf.

4.  **Shared Services (`src/services/`)**:
    - `UserAccessService`: Manajemen peran terpusat (Leader, Manager, Premium).
    - `EconomyService`: Logika transaksi mata uang dengan dukungan audit log.
    - `InventoryService`: Manajemen item pemain.
    - `CooldownService`: Pengaturan rate limit perintah.
    - `AuditLogService`: Pencatatan aktivitas sensitif ke file log harian.

5.  **Business Logic & Tools (`tools/`)**:
    - **Game Engine**: Logic game (`family100`, `tebak-tebakan`, dll) bersifat platform-agnostic.
    - **Utils**: Fungsi pembantu untuk formatting, uptime, dan manipulasi teks.

6.  **Database Layer**:
    - Menggunakan `simpl.db` (JSON based).
    - Terpisah antara WhatsApp (`database/wa/`) dan Telegram (`database/tg/`).

## Alur Data (Pesan Masuk)
1.  Pesan diterima oleh socket (Baileys/Telegraf).
2.  Middleware/Handler memproses metadata (sender, chat type, user roles menggunakan `UserAccessService`).
3.  Jika berupa perintah (`isCmd`), sistem mencari command yang sesuai di `Map`.
4.  Perintah dieksekusi dengan melewatkan objek `helpers` yang berisi akses ke DB, fungsi utilitas, dan Shared Services.

## Keamanan & Observability
- **Fail-Closed Verification**: Middleware Telegram akan menolak akses jika pengecekan langganan channel gagal.
- **Audit Logs**: Transaksi ekonomi dicatat dalam folder `logs/`.
- **Health Check**: Perintah `/health` (owner-only) untuk memantau status sistem.
- **Quality Gates**: Menggunakan ESLint untuk linting dan Jest untuk testing.
