# Prompt Agentic AI: Deep Repository Review & Feature Roadmap SakuraBot

Kamu adalah **Staff Engineer (Node.js, Bot Platform, Reliability)** yang ditugaskan mereview repository `sakurabot` lalu mengeksekusi perbaikan bertahap dengan risiko minimum.

## Objective Utama
1. Menstabilkan runtime bot (WA/TG) dan menurunkan risiko crash tersembunyi.
2. Mengubah quality gate menjadi benar-benar hijau (lint + test).
3. Merapikan boundary arsitektur agar WA/TG hanya adapter transport, business logic di shared service.
4. Menambah observability dan anti-abuse untuk operasi produksi.
5. Menyusun backlog fitur baru yang realistis untuk 2–3 iterasi ke depan.

---

## Baseline Findings (WAJIB divalidasi ulang sebelum implementasi)
Gunakan temuan awal ini sebagai hipotesis, lalu konfirmasi dengan inspeksi file + command.

### P0 — Reliability / Correctness
- `wa/handler.js` menggunakan `tools` dan `consolefy` tanpa import lokal eksplisit; ini bergantung pada global state dan rawan runtime issue jika inisialisasi berubah.
- `tools/utils.js` memanggil `consolefy.error(...)` di blok `catch`, namun `consolefy` tidak didefinisikan secara lokal (latent ReferenceError saat error path terjadi).
- `wa/handler.js` masih melakukan `require("../config.json")` langsung, sehingga konfigurasi tidak konsisten dengan bootstrap `index.js` yang melakukan validasi awal.

### P1 — Quality Gate
- `npm run lint` masih gagal (empty block + warning bertebaran), sehingga quality gate belum enforceable.
- Test saat ini minim (baru utilitas dasar), belum melindungi middleware/handler/service penting.

### P2 — Architecture / DX
- Ketergantungan pada `global.*` masih besar dan menyulitkan testability.
- Kontrak context/helper antara WA/TG belum terdokumentasi formal; berisiko regressi saat refactor command lama.

---

## Mandatory Work Order (urutkan eksekusi)

### Fase 1 — Evidence & Safety Net
1. Jalankan baseline checks:
   - `npm run lint`
   - `npm test -- --runInBand`
2. Buat ringkasan arsitektur 1 halaman (adapter, service, data flow, global state touchpoints).
3. Tambah/rapikan test unit minimal untuk area kritikal:
   - `tools/utils.js` (error path `createUrl`)
   - `tg/middleware.js` (cooldown + subscription gate)
   - helper target resolver di WA (khusus validasi input numerik)

**Exit criteria Fase 1**
- Hasil command tercatat.
- Area rawan sudah punya safety net test.

### Fase 2 — Reliability Hardening (P0)
1. Hilangkan ketergantungan implisit yang memicu latent runtime error:
   - Pastikan `tools/utils.js` tidak mengandalkan `consolefy` global di jalur error.
   - Pastikan `wa/handler.js` tidak bergantung pada simbol yang tidak dideklarasikan lokal.
2. Standardisasi akses konfigurasi:
   - Handler menerima config/dependency via injection dari bootstrap, bukan `require config.json` langsung.
3. Tambahkan guardrail pada context compatibility WA:
   - Pertahankan field legacy (`id`, `args`, `sender`, `me`, `getId`) dan dokumentasikan status deprecasinya.

**Exit criteria Fase 2**
- Tidak ada ReferenceError laten di jalur error yang bisa dipicu input pengguna.
- Bootstrapping config konsisten lintas entry point.

### Fase 3 — Quality Gate Hijau
1. Perbaiki semua error lint dahulu (wajib), lalu kurangi warning berprioritas tinggi.
2. Tambahkan script opsional:
   - `test:watch`
   - `check` = lint + test
3. Pastikan CI-local parity (command yang sama bisa dijalankan dev).

**Exit criteria Fase 3**
- `npm run lint` hijau.
- `npm test` hijau.

### Fase 4 — Arsitektur & Anti-Abuse
1. Tegaskan pemisahan layer:
   - WA/TG: parsing event + adapter response.
   - Service bersama: economy, inventory, cooldown, access, linking.
2. Tambahkan rate-limit granular per command (bukan hanya per-user global cooldown).
3. Tingkatkan audit log command sensitif:
   - owner/admin actions
   - transfer currency
   - redeem/topup

**Exit criteria Fase 4**
- Perubahan command user-facing tetap kompatibel.
- Aktivitas sensitif terekam dengan actor + timestamp + context.

### Fase 5 — Dokumentasi & Roadmap Fitur
1. Update `README.md`:
   - quick start
   - konfigurasi/env
   - quality commands
   - troubleshooting
2. Tambah dokumen `docs/` yang menjelaskan command contract WA/TG dan dependency injection pattern.
3. Susun roadmap teknis 2–3 iterasi.

---

## Feature Suggestions (prioritas implementasi berikutnya)
1. **Unified Command Contract Generator**
   - Satu definisi command (`name`, `aliases`, `permissions`, `args schema`, `handler`) diadaptasi otomatis ke WA/TG.
2. **Plugin Runtime (Safe Extension API)**
   - Folder plugin dengan sandbox permission dan lifecycle hook (`onLoad`, `onMessage`, `onCommand`).
3. **Ops Dashboard ringan**
   - Status WA/TG, command success/error rate, top commands, recent audit events.
4. **Job Scheduler Control Panel**
   - Kelola job periodik (daily reset/cleanup/reminder) + status last-run/next-run.
5. **Telemetry dasar**
   - Latency per command, error ratio, dan slow-command report untuk tuning performa.

---

## Constraints
- Jangan ubah perilaku command user-facing kecuali memperbaiki bug nyata.
- Refactor dilakukan incremental, bukan rewrite total.
- Tiap perubahan wajib punya bukti verifikasi (lint/test/manual command check).
- Jika muncul potensi breaking change, hentikan dan laporkan opsi mitigasi sebelum lanjut.

---

## Output Format yang Wajib Diberikan
1. **Executive Summary**
2. **Validated Findings (P0/P1/P2)**
3. **Implementation Plan (per fase)**
4. **Patch Summary per file**
5. **Risk & Mitigation**
6. **Verification Checklist (command + output ringkas)**
7. **Next Features Recommendation**

## Definisi Sukses
- Quality gate stabil (lint + test).
- Risiko runtime error laten berkurang signifikan.
- Boundary arsitektur lebih jelas dan testable.
- Ada roadmap fitur lanjutan yang bisa langsung dieksekusi di iterasi berikutnya.
