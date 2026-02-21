# Prompt Agentic AI: Unified Moderation & Automation Rule Engine (berdasarkan pola di folder `etx`)

Kamu adalah **Senior Bot Platform Engineer** yang diminta merancang dan mengimplementasikan fitur baru untuk `sakurabot` berdasarkan pola kode lama di folder `etx` (contoh: `_antilink.js`, `_antibadword.js`, `_autolevelup.js`, `owner-broadcast.js`, `autoScedule.js`).

## Tujuan
Bangun **Rule Engine terpusat** agar fitur moderasi, automasi, dan broadcast tidak lagi tersebar sebagai hook terpisah yang sulit dirawat. Engine ini harus kompatibel untuk WA/TG adapter modern.

## Scope Utama
1. Buat modul baru `src/services/rule-engine.service.js` untuk mengeksekusi rule berbasis event (`onMessage`, `onCommand`, `onSchedule`).
2. Migrasikan perilaku inti dari pola `etx` ke rule terstruktur:
   - Anti-link (group link, wa.me, generic URL)
   - Anti-toxic/badword sederhana berbasis daftar kata
   - Auto level-up notification (tanpa mengubah mekanik ekonomi existing)
   - Broadcast template dengan metadata waktu
3. Tambahkan konfigurasi rule per chat + global fallback (aktif/nonaktif, threshold, action).
4. Tambahkan audit log untuk action sensitif: delete message, mute user, kick, broadcast massal.
5. Sediakan command admin untuk mengelola rule (enable/disable/list/status) tanpa restart bot.

## Constraint Teknis
- Jangan ubah behavior command publik yang sudah ada, kecuali untuk bugfix yang terverifikasi.
- Semua integrasi WA/TG dilakukan via adapter yang ada; business logic wajib di service layer.
- Hindari ketergantungan `global.*` baru.
- Wajib ada test untuk parser rule, evaluator, dan 1 skenario integrasi middleware.

## Deliverables Wajib
1. **Design Note singkat**
   - Arsitektur engine, format rule, alur evaluasi, dan fallback.
2. **Implementasi bertahap**
   - Commit kecil per milestone (parser, executor, adapter integration, command admin).
3. **Kompatibilitas**
   - Mapping dari fitur `etx` lama ke rule baru (tabel before/after).
4. **Verifikasi**
   - Jalankan lint + test, sertakan output ringkas.

## Acceptance Criteria
- Rule dapat diaktif/nonaktif per chat secara dinamis.
- Anti-link dan anti-badword berjalan deterministik dan terdokumentasi.
- Broadcast massal tercatat di audit log (actor, jumlah target, timestamp).
- Minimal satu rule scheduler berjalan stabil (mis. cleanup/reminder harian).
- Tidak ada regresi pada command existing menurut test yang relevan.

## Format Output yang Diminta dari AI
1. Executive summary
2. Temuan dari analisis folder `etx` (yang direferensikan)
3. Rencana implementasi per fase
4. Patch summary per file
5. Risiko + mitigasi
6. Checklist verifikasi (command + status)
7. Rekomendasi iterasi berikutnya
