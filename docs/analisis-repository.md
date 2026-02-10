# Analisis Repository SakuraBot

## Ringkasan Arsitektur Saat Ini

Repository ini adalah bot **multi-platform** (WhatsApp + Telegram) dengan entry point tunggal di `index.js`.

- `index.js` melakukan bootstrap global config, logging, helper global, lalu menyalakan WA/TG sesuai validasi token/nomor.  
- `wa/index.js` dan `tg/index.js` masing-masing menginisialisasi database lokal (`simpl.db`), helper ekonomi/game, middleware, dan dynamic command loader.  
- Command diorganisir per platform dan kategori (`commands/<kategori>/<fitur>.js`).

## Temuan Utama

### 1) Risiko konfigurasi sensitif tercampur langsung di `config.json`
`config.json` berisi struktur konfigurasi produksi, termasuk bidang yang berpotensi sensitif (mis. nomor telepon bot dan token placeholder yang bisa saja terganti token asli di deployment). Ini meningkatkan risiko human error saat commit/push.

**Dampak:** kebocoran secret, sulit deploy multi environment (dev/staging/prod).

**Saran:**
- Pisahkan template ke `config.example.json`.
- Baca secret dari environment variable.
- Tambahkan validasi startup (cek field wajib, fail-fast dengan pesan jelas).

### 2) Duplikasi logika bisnis antara WA dan TG
Banyak helper ekonomi/user-state (premium, sakuranite, mining, inventory) muncul di `wa/handler.js` dan `tg/index.js` dengan pola hampir sama.

**Dampak:**
- Perubahan fitur harus dikerjakan 2x.
- Potensi behavior drift antara WA dan TG.

**Saran:**
- Extract ke layer service bersama, contoh:
  - `src/services/economy.js`
  - `src/services/user-access.js`
  - `src/services/linking.js`
- WA/TG cukup jadi adapter transport.

### 3) Tidak ada test otomatis
`package.json` belum memiliki script test/lint. Saat ini verifikasi perubahan cenderung manual.

**Dampak:** regresi mudah lolos, refactor berisiko tinggi.

**Saran:**
- Tambah `npm run test`, `npm run lint`, `npm run typecheck` (opsional JSDoc + TypeScript check mode).
- Mulai dari unit test utility (`tools/utils.js`) dan service ekonomi.

### 4) Penggunaan `global` yang cukup luas
`index.js` mengisi `global.config`, `global.tools`, `global.botStatus`, dst.

**Dampak:**
- Sulit dites secara isolated.
- Coupling tinggi antar modul.

**Saran:**
- Bertahap beralih ke dependency injection sederhana (pass `config`, `logger`, `db` via constructor/factory).

### 5) Handler WA sangat gemuk (`wa/handler.js`)
File ini mengerjakan parsing message, context API, state game, session linking, permission check, command execution.

**Dampak:** maintainability rendah, onboarding developer lebih sulit.

**Saran:** split per concern:
- `wa/core/message-parser.js`
- `wa/core/permission.js`
- `wa/core/game-engine.js`
- `wa/core/context-builder.js`

### 6) Dokumentasi masih minimal
README baru mencakup instalasi dependency, belum ada:
- arsitektur,
- konfigurasi minimum,
- flow command,
- troubleshooting,
- panduan deployment.

**Saran:** tambahkan “Quick Start + Production Notes”.

## Usulan Penambahan Fitur (Prioritas Tinggi)

### A. Dashboard admin ringan (Web)
Endpoint web sederhana untuk:
- status WA/TG,
- jumlah user aktif,
- top command,
- error terakhir.

Manfaat: observability meningkat tanpa harus melihat log mentah.

### B. Audit log command
Simpan jejak command penting (owner/admin/economy transfer).

Manfaat: debugging insiden, anti-abuse, forensik perubahan saldo.

### C. Rate limiter berbasis command + user
Saat ini cooldown sudah ada, tetapi bisa diperluas ke granular per command.

Manfaat: mencegah spam pada command mahal (AI/gacha/payment).

### D. Sistem plugin command bersama WA/TG
Definisikan kontrak command universal, lalu map ke adapter WA/TG.

Manfaat: satu implementasi logic, dua transport layer.

### E. Healthcheck & self-test command
Tambah `/health` dan `/diagnostics` untuk owner, berisi:
- status DB,
- status API eksternal,
- ukuran database,
- waktu respons sederhana.

## Roadmap Implementasi Bertahap

### Fase 1 (Cepat, low-risk)
1. Tambah `config.example.json` + env support.  
2. Tambah lint/test script minimal.  
3. Perbaiki README quickstart + env.

### Fase 2 (Stabilisasi)
1. Extract service ekonomi/access bersama.  
2. Refactor `wa/handler.js` per modul.  
3. Tambah audit log.

### Fase 3 (Skalabilitas fitur)
1. Plugin command universal WA/TG.  
2. Dashboard admin + metrics.

## Quick Wins yang bisa dikerjakan segera

1. `config.example.json` + `.gitignore` untuk file config lokal.  
2. Tambah `npm run lint` dan `npm run test` (baseline).  
3. Unit test pertama untuk `formatUptime`, `escapeHTML`, `createUrl`.  
4. Dokumentasi command lifecycle singkat di README.
