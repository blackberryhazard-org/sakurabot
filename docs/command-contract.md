# Command Contract & Dependency Injection Pattern

Dokumen ini menjelaskan antarmuka (contract) antara platform adapter (WA/TG) dengan perintah (commands) serta pola Dependency Injection yang digunakan di SakuraBot.

## Command Interface

Setiap file perintah di `wa/commands/` atau `tg/commands/` harus mengekspor objek dengan struktur berikut:

```javascript
module.exports = {
    name: "commandname",        // Nama perintah (tanpa prefix)
    aliases: ["alias1", "c1"],  // (Opsional) Alias perintah
    category: "user",           // Kategori perintah
    permissions: {              // (Opsional) Pembatasan akses
        owner: false,
        leader: false,
        premium: false,
        group: false,
        admin: false,           // Hanya untuk grup
        botAdmin: false         // Bot harus admin di grup
    },
    code: async (context, helpers) => {
        // Logika perintah di sini
    },
    callback: async (context, helpers) => {
        // (Opsional) Penanganan interaksi/callback (TG button, dll)
    }
};
```

## Dependency Injection (DI)

Alih-alih mengandalkan global state atau `require` langsung ke konfigurasi, SakuraBot menggunakan pola DI di mana adapter menyuntikkan (inject) dependensi ke dalam fungsi `code` perintah melalui argumen `helpers`.

### Objek Helpers (Shared)

Objek `helpers` menyediakan akses ke layanan bersama dan utilitas:

- `userAccess`: Layanan manajemen peran (`isOwner`, `isPremium`, dll).
- `economy`: Layanan transaksi mata uang (`getBalance`, `updateBalance`, `addBalance`).
- `inventory`: Layanan manajemen item.
- `linking`: Layanan penghubung akun WA-TG.
- `auditLog`: Layanan pencatatan aktivitas sensitif.
- `db`: Akses langsung ke database platform terkait.
- `config`: Akses ke konfigurasi aplikasi.

### Platform-Specific Context

Argumen pertama (`context`) bersifat platform-specific:

- **Telegram**: Merupakan objek `ctx` dari Telegraf.
- **WhatsApp**: Merupakan objek `ctx` kustom yang membungkus fungsi `sock.sendMessage` dan menyediakan metadata pesan (`m`, `args`, `sender`, `target`).

## Rekomendasi Pengembangan

1.  **Hindari Global**: Gunakan `helpers` yang disediakan daripada mengakses `global.*` secara langsung.
2.  **Validasi Input**: Selalu validasi argumen pengguna sebelum memproses data.
3.  **Error Handling**: Gunakan blok `try-catch` dan catat error menggunakan `auditLog` jika bersifat sensitif.
4.  **Audit Log**: Catat aksi administratif (ban, give currency, dll) ke `auditLog`.
