# Referensi dan Analisis Migrasi ke Wileys (npm:wileys)

Dokumen ini berisi hasil penelitian terhadap source code bot WhatsApp berbasis library **Wileys** dan perbandingannya dengan sistem bot yang saat ini diimplementasikan.

## Apa itu Wileys?

Berdasarkan dokumentasi Context7 dan analisis source code:
- **Wileys** adalah wrapper atau fork dari library Baileys yang dioptimalkan untuk kecepatan dan fitur modern.
- Mengatasi masalah pemetaan `@lid` ke `@pn` yang sering ditemui pada akun WhatsApp terbaru (khususnya fitur komunitas dan newsletter).
- Mendukung enkripsi *end-to-end* yang kuat dan performa tinggi.
- Dalam `package.json` referensi, ia dipasang sebagai alias: `"@whiskeysockets/baileys": "npm:wileys"`.

## Perbandingan Fitur

| Fitur | Bot Saat Ini (Baileys) | Bot Referensi (Wileys) |
|-------|------------------------|------------------------|
| **Koneksi** | Standard Baileys socket. | Dioptimalkan dengan default setting untuk stabilitas (msRetryCounterCache). |
| **Media** | Manual handling via utility. | Memiliki method built-in pada socket (`conn.sendAudio` dengan waveform, `conn.sendImage`). |
| **Pesan** | Destructuring manual di handler. | Menggunakan sistem serialisasi pesan (`smsg`) yang sangat komprehensif (mirip library robot). |
| **Plugin** | Modular via dynamic loader. | Dynamic loader dengan fitur hot-reload (`fs.watchFile`) untuk pengembangan real-time. |
| **ESM Support** | CommonJS. | Full ESM (`type: module`). |

## Temuan Penting Selama Penelitian

1.  **Waveform Audio**: Library atau implementasi bot referensi memiliki generator waveform otomatis untuk pesan audio (`ptt: true`), memberikan tampilan profesional seperti pesan suara asli WhatsApp.
2.  **Robust Media Downloader**: Terdapat method `downloadAndSaveMediaMessage` yang menangani stream buffer dan deteksi extension secara otomatis menggunakan `file-type`.
3.  **Hot Reloading**: Bot referensi memantau perubahan file `index.js` dan me-restart proses secara otomatis tanpa bantuan `nodemon` (menggunakan `spawn` internal).
4.  **LID Handling**: Wileys menangani format ID baru WhatsApp secara transparan, yang sangat penting untuk kompatibilitas jangka panjang seiring WhatsApp beralih dari JID berbasis nomor telepon ke ID unik.

## Analisis Migrasi: Seberapa Menjanjikan?

Migrasi ke Wileys sangat **menjanjikan** karena beberapa alasan:
1.  **Kompatibilitas**: Wileys dirancang sebagai drop-in replacement untuk Baileys (menggunakan namespace yang sama).
2.  **Maintenance**: Menangani masalah ID baru WhatsApp yang sering menyebabkan bot Baileys gagal mengidentifikasi pengirim atau target grup.
3.  **Produktivitas**: Helper media yang lebih kaya akan mengurangi boilerplate code di setiap command.

## Rencana Migrasi (Jika Dilakukan)

Jika kita memutuskan untuk migrasi, langkah-langkahnya adalah:

1.  **Tahap Persiapan**:
    - Backup seluruh database dan state saat ini.
    - Ganti dependensi: `npm install @whiskeysockets/baileys@npm:wileys`.

2.  **Tahap Adaptasi Socket**:
    - Perbarui `wa/index.js` untuk menggunakan konfigurasi socket dari bot referensi (terutama fitur `emitOwnEvents` dan cache retry).

3.  **Tahap Refaktor Handler**:
    - Mengintegrasikan sistem serialisasi pesan (`smsg`) agar akses property pesan lebih konsisten (misal: `m.sender`, `m.isGroup`, `m.quoted`).
    - Porting fungsi `sendAudio` dengan waveform ke dalam helper shared kita di `src/`.

4.  **Tahap Pembersihan**:
    - Menghilangkan utility manual yang sudah dicover oleh method internal Wileys.
    - Uji coba fungsionalitas grup dan newsletter (cek `@lid` support).

## Kesimpulan

Bot referensi menunjukkan bahwa Wileys memberikan lapisan abstraksi yang lebih matang di atas Baileys. Meskipun struktur bot kita saat ini sudah sangat modular dan menggunakan Dependency Injection (DI) yang rapi, mengadopsi Wileys sebagai engine utamanya akan meningkatkan stabilitas bot terhadap update internal WhatsApp.
