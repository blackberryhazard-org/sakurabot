# Prompt Agentic AI: Repository Review & Rencana Pengembangan SakuraBot

Kamu adalah **Senior Engineer + Tech Lead** yang diminta melakukan review menyeluruh pada repository `sakurabot` (Node.js, WhatsApp + Telegram bot), lalu mengeksekusi perbaikan bertahap.

## Tujuan
1. Mengurangi duplikasi logic antara platform WA dan TG.
2. Meningkatkan keamanan konfigurasi dan kesiapan production.
3. Menambahkan quality gate (lint/test) agar refactor aman.
4. Meningkatkan observability (audit log + health diagnostics).
5. Menyusun fondasi fitur baru tanpa merusak command existing.

## Konteks Temuan Awal (jadikan baseline, lalu validasi ulang)
- Entry point `index.js` masih membaca `config.json` langsung dan menyimpan banyak state di `global`.
- Logic ekonomi/game/user-state tersebar dan berulang di `wa/handler.js` dan `tg/index.js`.
- Belum ada script lint/test di `package.json`.
- Handler utama WA terlalu gemuk (parsing, command dispatch, permission, game state, util context campur jadi satu).
- Dokumentasi setup & operasional masih minimal.

## Instruksi Eksekusi (wajib berurutan)

### Fase 1 — Baseline & Safety Net
1. Lakukan audit struktur project dan buat ringkasan arsitektur saat ini (maksimal 1 halaman markdown).
2. Tambahkan script quality gate di `package.json`:
   - `lint`
   - `test`
   - `test:watch` (opsional)
3. Setup test minimal untuk utility penting (contoh: formatter/escape/url helper).
4. Jalankan seluruh test dan laporkan hasilnya.

**Output Fase 1:**
- Daftar file yang diubah
- Alasan perubahan
- Hasil command verifikasi

### Fase 2 — Hardening Konfigurasi
1. Introduce `config.example.json` sebagai template aman.
2. Migrasikan nilai sensitif agar bisa dibaca dari environment variable.
3. Tambahkan validasi startup (fail-fast + pesan error jelas per field wajib).
4. Pastikan fallback tetap kompatibel untuk pengguna lama.

**Acceptance Criteria Fase 2:**
- Tidak ada token/nomor sensitif hardcoded.
- Aplikasi gagal start dengan pesan jelas jika config wajib kosong.

### Fase 3 — Refactor Arsitektur Inti
1. Ekstrak service bersama untuk domain berikut ke folder baru `src/services/`:
   - `economy.service`
   - `user-access.service`
   - `inventory.service`
   - `cooldown.service`
2. WA/TG dijadikan adapter transport:
   - WA/TG hanya menangani parsing event + kirim response.
   - Logic bisnis utama pindah ke service bersama.
3. Pecah `wa/handler.js` per concern (parser, permission, context builder, command executor).
4. Pastikan behavior command existing tetap sama (backward compatible).

**Acceptance Criteria Fase 3:**
- Penghapusan duplikasi logic signifikan antara WA dan TG.
- Perubahan tidak menghilangkan command lama.

### Fase 4 — Observability & Anti-Abuse
1. Tambahkan audit log untuk command kritikal:
   - owner/admin command
   - transfer currency
   - redeem/topup
2. Tambahkan rate limiter granular per user + per command.
3. Tambahkan command diagnostics (`/health` atau setara) untuk owner:
   - status DB
   - uptime
   - platform status WA/TG
   - ringkasan error terakhir (jika ada)

**Acceptance Criteria Fase 4:**
- Aktivitas sensitif terekam dengan timestamp dan actor.
- Spam command berat bisa dibatasi tanpa memblokir command normal.

### Fase 5 — Dokumentasi & Developer Experience
1. Update `README.md` agar mencakup:
   - quick start
   - env/config setup
   - daftar command utama
   - troubleshooting umum
2. Tambahkan dokumen arsitektur ringkas di `docs/` (diagram/penjelasan modular).
3. Sertakan roadmap teknis 2–3 iterasi ke depan.

## Batasan Implementasi
- Jangan ubah perilaku command user-facing kecuali ada bug jelas.
- Prioritaskan incremental refactor, bukan rewrite total.
- Semua perubahan harus menyertakan verifikasi command/tes terkait.
- Jika menemukan risiko breaking change, hentikan dan laporkan opsi mitigasi sebelum lanjut.

## Format Laporan yang Harus Kamu Berikan
Berikan output dengan struktur berikut:
1. **Executive Summary** (ringkas)
2. **Temuan Prioritas (P0/P1/P2)**
3. **Rencana Implementasi Bertahap**
4. **Patch Summary per File**
5. **Risiko & Mitigasi**
6. **Checklist Verifikasi** (command + hasil)
7. **Next Recommended Features**

## Daftar Usulan Fitur Baru (prioritas)
1. **Dashboard Admin ringan (web)** untuk status bot, user aktif, command terpopuler, error terakhir.
2. **Unified Command Contract** supaya satu definisi command bisa dipakai di WA dan TG.
3. **Sistem Plugin/Extension** untuk menambah command tanpa menyentuh core.
4. **Scheduled Jobs Management** (daily reward reset, cleanup, reminder) dengan monitoring.
5. **Telemetry dasar** (latency command, error rate, success rate).

## Definisi Sukses
Task dianggap selesai jika:
- Ada peningkatan kualitas kode yang terukur (duplikasi turun, test/lint tersedia, startup lebih aman).
- Ada dokumentasi implementasi yang bisa diikuti developer baru.
- Ada daftar fitur lanjutan yang realistis dan siap dieksekusi pada iterasi berikutnya.
