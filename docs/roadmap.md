# Feature Roadmap SakuraBot

Berdasarkan review repositori, berikut adalah rencana pengembangan untuk 2–3 iterasi ke depan.

## Iterasi 1: Unified Command Generator
Membangun sistem pendaftaran perintah yang benar-benar terpadu sehingga pengembang hanya perlu menulis satu file perintah yang secara otomatis berjalan di WhatsApp dan Telegram tanpa perlu penyesuaian manual di masing-masing platform.

## Iterasi 2: Plugin Runtime & Sandboxing
Mengimplementasikan sistem plugin yang memungkinkan fitur baru ditambahkan tanpa menyentuh core bot. Mendukung isolasi (sandboxing) sederhana untuk keamanan.

## Iterasi 3: Ops Dashboard & Telemetry
- Dashboard berbasis web (atau bot dashboard) untuk memantau status bot secara real-time.
- Telemetry: Melacak latensi perintah, tingkat keberhasilan, dan penggunaan fitur untuk optimasi performa.

## Fitur Kecil Lainnya
- **Auto-Update**: Sistem pembaruan otomatis dari repositori Git.
- **Enhanced Anti-Abuse**: Deteksi pola spam yang lebih canggih menggunakan analisis frekuensi pesan.
- **Multi-Instance Support**: Memungkinkan menjalankan beberapa akun bot (WA/TG) dalam satu proses.
