# Dokumen Referensi: Analisis Mendalam Simple-bot-main (Wileys Engine)

Dokumen ini menyajikan hasil penelitian menyeluruh terhadap seluruh isi direktori **Simple-bot-main** (karya Fauzialifatah) yang menggunakan library **Wileys** (npm:wileys) sebagai engine utamanya.

## 1. Arsitektur Engine & Socket (Root & Settings)

Engine utama menggunakan `wileys` yang dipasang melalui alias `@whiskeysockets/baileys`.

### Fitur Engine Wileys:
- **Resiliensi Identitas**: Mendukung pemetaan `@lid` ke `@pn` secara native, yang sangat penting untuk kompatibilitas dengan fitur Newsletter dan Community terbaru.
- **Koneksi Stabil**: Implementasi `msRetryCounterCache` untuk mencegah loop koneksi dan penanganan error `Bad MAC` yang lebih elegan.
- **Socket Prototype Extension (`index.js`)**: Bot ini menyuntikkan fungsi helper langsung ke objek `conn` (seperti `conn.sendImage`, `conn.sendAudio`, `conn.sendVideo`, `conn.downloadAndSaveMediaMessage`). Ini membuat pemanggilan fungsi media sangat ringkas di level command.
- **Auto-Restart & Hot-Reload**: Menggunakan `fs.watchFile` pada `index.js` untuk me-restart proses secara otomatis dan `fs.watch` pada folder `cmd/` untuk memuat ulang plugin tanpa mematikan bot.

## 2. Core Logic & Serialization (`source/`)

Bagian ini adalah "otak" arsitektur yang membuat bot ini sangat fleksibel.

### Sistem `smsg` (`source/message.js`):
- Melakukan serialisasi mendalam pada objek pesan Baileys yang kompleks.
- Menambahkan properti flat seperti `m.chat`, `m.sender`, `m.isGroup`, `m.mtype`, dan `m.body`.
- Menangani berbagai tipe respon interaktif seperti `interactiveResponseMessage`, `buttonsResponseMessage`, dan `listResponseMessage` secara transparan.
- Menambahkan method internal ke pesan seperti `m.reply()`, `m.download()`, dan `m.quoted.delete()`.

### Self-Modifying Code (`source/events/system.js`):
- Implementasi sistem yang memungkinkan bot untuk membaca, menambah, dan menghapus kode "case" di dalam file `source/message.js` melalui chat. Ini memungkinkan evolusi fitur bot tanpa akses terminal/SSH.

### Fake Context & AdReply (`source/quoted.js` & `source/events/_sticker.js`):
- Memiliki kemampuan untuk membuat "Fake Quoted" (misal: mengutip pesan dari 'Official WhatsApp' atau 'Meta AI').
- Menggunakan `externalAdReply` secara masif pada setiap pengiriman media untuk meningkatkan aspek visual (thumbnail besar, source URL, dll).

## 3. Sistem Plugin & Command (`cmd/`)

Struktur folder `cmd/` dirancang untuk skalabilitas ekstrem.

### Global Hooks (`cmd/events/`):
- **`_antitoxic.js`**: Menggunakan pola `handler.before` untuk memindai pesan secara global sebelum diproses oleh command. Jika terdeteksi kata kasar, pesan langsung dihapus oleh bot (jika bot adalah admin).

### Owner Administrative Tools (`cmd/owner/`):
- **`fixvar.js`**: Alat refactoring massal berbasis Regex untuk mengubah nama variabel di file plugin (misal: dari `sock` ke `conn`). Sangat berguna saat mengadopsi kode dari base lain.
- **`addplugin.js` / `editplugin.js`**: Fitur untuk menulis kode JavaScript baru langsung melalui WhatsApp.
- **`logs.js`**: Mengambil output `stdout` dan `stderr` VPS secara real-time menggunakan perintah `tail -n`.
- **`ping.js` (Dashboard Grafis)**: Menggunakan library `canvas` untuk merender dashboard performa VPS (CPU, RAM, Disk, Latency) menjadi sebuah gambar profesional, bukan sekadar teks.

## 4. Temuan Penting & Teknik "Underground"

1.  **Waveform Audio**: Menggunakan `ffmpeg` untuk memproses audio dan menghasilkan visual waveform yang dikirimkan dalam metadata PTT WhatsApp.
2.  **LID Interaction**: Fungsi `loadConnect` di `myfunc.js` yang memaksa bot mengikuti kanal newsletter tertentu saat berhasil tersambung.
3.  **Advanced Serialization**: Teknik `m.quoted.fakeObj` di `message.js` yang memungkinkan manipulasi metadata pesan kutipan untuk keperluan proteksi atau estetika.
4.  **Exif Sticker Manipulation**: Penggunaan library `node-webpmux` untuk menyuntikkan metadata (packname/author) secara dinamis ke dalam file WebP.

## 5. Analisis Strategis & Rencana Migrasi

Migrasi ke arsitektur berbasis Wileys sangat **MENJANJIKAN** karena memberikan stabilitas jangka panjang terhadap update protokol WhatsApp.

### Roadmap Migrasi:
1.  **Fase 1 (Core)**: Ganti engine ke Wileys dan adaptasi socket extension di `wa/index.js`.
2.  **Fase 2 (Abstraksi)**: Porting sistem `smsg` ke handler utama untuk menyederhanakan penulisan command.
3.  **Fase 3 (Visual)**: Implementasi Dashboard VPS berbasis Canvas dan Audio Waveform.
4.  **Fase 4 (Deployment)**: Mengadopsi sistem Plugin Loader dengan Hot-Reload untuk siklus pengembangan yang lebih cepat.

## Kesimpulan
Analisis terhadap **Simple-bot-main** menunjukkan bahwa bot ini mengutamakan fleksibilitas dan kecepatan pengembangan di atas segalanya. Meskipun arsitektur SakuraBot saat ini lebih terstruktur (Service-Oriented), mengadopsi fitur-fitur "native-hacker" dari referensi ini akan membuat SakuraBot jauh lebih tangguh dan modern di mata pengguna.
