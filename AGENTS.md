# CLAUDE.md — [Nama Project]

> Catatan penting: Sebaiknya tulis isi CLAUDE.md dalam Bahasa Inggris.
> Claude Code memproses instruksi Bahasa Inggris lebih optimal.
> Template ini ditulis dalam Bahasa Indonesia untuk kemudahan pemahaman.

---

## 1. Project Overview

- Name : [Nama project kamu]
- Description : [Deskripsi singkat, project ini tentang apa]
- Goal : [Tujuan utama, problem apa yang diselesaikan]
- Target Users: [Siapa pengguna project ini]
- Version : [Versi saat ini, contoh: v1.0.0]
- Status : [Active development / Maintenance / Production]

---

## 2. Tech Stack

- Language : [TypeScript / JavaScript / Python / Go / dll]
- Framework : [Next.js / React / Express / Laravel / dll]
- Styling : [Tailwind CSS / CSS Modules / Styled Components / dll]
- UI Library : [shadcn/ui / MUI / Ant Design / dll]
- Database : [PostgreSQL / MySQL / MongoDB / SQLite / dll]
- ORM : [Prisma / Drizzle / TypeORM / Eloquent / dll]
- Auth : [NextAuth / Better Auth / Passport.js / dll]
- State Management: [Zustand / Redux / Pinia / Jotai / dll]
- Data Fetching : [SWR / React Query / Axios / fetch / dll]
- Package Manager : [npm / yarn / pnpm / bun]
- Deployment : [Vercel / Railway / VPS / AWS / dll]

---

## 3. Commands

```bash
# Development
[pm] run dev          # Jalankan dev server
[pm] run build        # Build untuk production
[pm] run start        # Jalankan production build
[pm] run lint         # Jalankan linter
[pm] run format       # Format kode

# Package Management
[pm] add [package]    # Install package baru

# Testing
[pm] run test         # Jalankan semua test
[pm] run test:unit    # Jalankan unit test saja
[pm] run test:e2e     # Jalankan e2e test saja

# Database
[pm] run db:migrate   # Jalankan migrasi
[pm] run db:seed      # Seed data awal
[pm] run db:reset     # Reset database
```

> [pm] = package manager yang kamu pakai: npm / yarn / pnpm / bun
> Jika ada package manager yang TIDAK boleh dipakai, tulis juga di sini.
> Contoh: Never use npm — always use bun.

---

## 4. Project Structure

Architecture: [clean architecture / by feature / MVC / dll]

```
[root]/
  src/
    [folder-1]/    # [Untuk apa folder ini, boleh isi apa saja]
    [folder-2]/    # [Untuk apa folder ini, boleh isi apa saja]
    [folder-3]/    # [Untuk apa folder ini, boleh isi apa saja]
  public/          # Static assets yang bisa diakses publik
  [config-files]   # File konfigurasi project
```

Aturan penempatan file:

- Komponen UI baru selalu di [folder]
- Logic bisnis selalu di [folder]
- Tipe TypeScript selalu di [folder]
- Helper dan utility selalu di [folder]
- Jangan buat folder baru tanpa konfirmasi terlebih dahulu

---

## 5. Naming Conventions

```
# File dan Folder
- Komponen      : PascalCase    contoh: UserCard.tsx
- Non-komponen  : camelCase     contoh: useAuth.ts, getUserById.ts
- Folder        : kebab-case    contoh: user-profile/
- Halaman       : page.tsx atau index.tsx
- Layout        : layout.tsx
- Test file     : [nama].test.ts atau [nama].spec.ts

# Di dalam Kode
- Variabel      : camelCase     contoh: userData, isLoading
- Konstanta     : UPPER_SNAKE   contoh: MAX_RETRY, BASE_URL
- Fungsi        : camelCase     contoh: getUserById, formatDate
- Tipe/Interface: PascalCase    contoh: UserType, ApiResponse
- Enum          : PascalCase    contoh: UserRole, OrderStatus
- CSS Class     : kebab-case    contoh: user-card, nav-item

# Git Branch
- Fitur baru    : feat/[nama-fitur]
- Bug fix       : fix/[nama-bug]
- Hotfix        : hotfix/[nama]
- Refactor      : refactor/[nama]
```

---

## 6. Code Conventions

```
# Pendekatan Coding
- Terapkan prinsip [clean code / DRY / SOLID / dll]
- Hindari duplikasi kode, jadikan function jika dipakai lebih dari sekali
- Tulis kode yang mudah dibaca, bukan yang paling singkat

# TypeScript (jika pakai TypeScript)
- Gunakan strict mode
- Tidak boleh menggunakan tipe 'any'
- Selalu tulis tipe return function secara eksplisit
- Gunakan interface untuk object, type untuk union atau intersection

# Urutan Import
1. Library eksternal (React, Next.js, dll)
2. Internal absolut (@/components, @/utils, dll)
3. Internal relatif (./Component, ../utils)
4. Tipe dan Interface
5. Assets dan styles

# Export Pattern
- Gunakan named export untuk komponen dan fungsi
- Gunakan default export hanya untuk page.tsx dan layout.tsx

# Error Handling
- Selalu gunakan try-catch untuk async function
- Jangan biarkan error tanpa penanganan
- Tulis pesan error yang informatif dan spesifik
```

---

## 7. Component Rules

```
# Urutan Penulisan dalam Satu Komponen
1. Import
2. Tipe atau Interface props
3. Definisi komponen
4. Hooks (useState, useEffect, dll)
5. Handler dan fungsi lokal
6. Return JSX
7. Export

# Aturan Props
- Selalu tulis tipe props secara eksplisit
- Gunakan default value untuk props yang opsional
- Maksimal [angka] props per komponen

# Server vs Client Component (untuk Next.js)
- Default: gunakan Server Component
- Gunakan 'use client' hanya jika butuh:
    useState / useEffect / hooks lainnya
    Event listener (onClick, onChange, dll)
    Browser API (localStorage, window, dll)
    Library yang tidak support SSR

# Komponen Kecil
- Pisah ke file sendiri jika dipakai lebih dari satu tempat
- Boleh digabung dalam satu file jika hanya dipakai di satu komponen
```

---

## 8. Styling Rules

```
# Pendekatan Styling
- Gunakan [Tailwind CSS / CSS Modules / Styled Components / dll]
- Jangan gunakan inline style kecuali untuk nilai yang benar-benar dinamis
- Jangan gunakan !important

# Tailwind CSS (jika pakai Tailwind)
- Gunakan utility class langsung di JSX
- Gunakan clsx atau cn untuk conditional class
- Ekstrak ke komponen jika class yang sama dipakai lebih dari sekali
- Urutan class: layout > spacing > sizing > color > typography > state

# Responsive Design
- Pendekatan mobile-first
- Breakpoint: sm (640px) / md (768px) / lg (1024px) / xl (1280px)

# Dark Mode
- Gunakan [dark: prefix Tailwind / CSS variables / dll]
- Selalu test tampilan di dark mode setelah membuat komponen baru

# Design Tokens
- Gunakan CSS variables untuk warna, spacing, dan typography
- Jangan hardcode nilai warna langsung
- Gunakan variabel yang sudah didefinisikan di [file config]
```

---

## 9. API & Data Fetching Rules

```
# Kapan Pakai Server vs Client Fetch
- Server fetch  : data yang tidak butuh interaksi user (halaman awal)
- Client fetch  : data yang berubah setelah interaksi user
- Gunakan [SWR / React Query] untuk client-side data fetching
- Jangan gunakan useEffect untuk fetching data

# Format Response API
- Selalu kembalikan format yang konsisten di semua endpoint:
  { success: boolean, data: T | null, message: string }

# Error Handling di API
- Selalu tangani error dengan try-catch
- Kembalikan status code yang tepat (200, 400, 401, 404, 500)
- Jangan expose detail error ke client di production

# Lokasi Fetch Function
- Semua fungsi fetch disimpan di folder [services / api / lib]
- Jangan tulis fungsi fetch langsung di dalam komponen

# Environment
- Gunakan environment variable untuk semua URL dan API key
- Jangan hardcode URL atau secret apapun langsung di kode
```

---

## 10. State Management Rules

```
# Hierarki State (gunakan dari yang paling sederhana dulu)
1. Local state (useState)   : hanya dipakai 1 komponen
2. Lifted state             : dipakai 2-3 komponen yang berdekatan
3. Global state             : dipakai banyak komponen di banyak tempat

# Kapan Pakai Global State
- Data user atau auth yang dibutuhkan banyak komponen
- UI state global (tema, bahasa, layout toggle)
- Data yang perlu persist antar halaman

# Aturan [Zustand / Redux / Pinia / dll]
- Buat store per domain atau fitur, jangan satu store untuk semuanya
- Jangan simpan data yang bisa dihitung dari data lain
- Gunakan selector untuk mengambil data spesifik dari store
- [Tambahkan aturan spesifik state manager yang kamu pakai]

# Kapan Pakai Context
- Untuk data yang jarang berubah (tema, locale, config global)
- Jangan gunakan Context untuk state yang sering berubah
```

---

## 11. Performance Rules

```
# Code Splitting
- Gunakan dynamic import untuk komponen besar yang tidak langsung terlihat
- Lazy load halaman dan komponen yang jarang diakses

# Image Optimization
- Selalu gunakan komponen Image dari framework (next/image, dll)
- Tentukan width dan height untuk setiap gambar
- Gunakan format WebP atau AVIF untuk gambar baru
- Jangan gunakan tag img HTML biasa

# Re-render Optimization
- Gunakan useMemo untuk kalkulasi yang berat
- Gunakan useCallback untuk fungsi yang dikirim sebagai props
- Jangan overuse memo, lakukan profiling dulu sebelum optimize

# Bundle Size
- Import hanya yang dibutuhkan, bukan seluruh library
  Benar : import { debounce } from 'lodash'
  Salah : import _ from 'lodash'

# SSR dan SSG (Next.js)
- Default ke Server Component untuk mengurangi JavaScript di client
- Gunakan Static Generation untuk halaman yang datanya jarang berubah
- Gunakan ISR untuk halaman yang butuh revalidasi berkala
```

---

## 12. Git Rules

Setiap kali Claude Code selesai membuat perubahan atau penambahan kode,
langsung commit ke GitHub sebelum melanjutkan ke task berikutnya.
Ini penting supaya kamu bisa membandingkan kode lama dan kode baru,
dan melakukan undo jika hasilnya tidak sesuai ekspektasi.

```
# Format Commit Message
feat     : [deskripsi fitur baru]
fix      : [deskripsi bug yang diperbaiki]
refactor : [deskripsi perubahan refactor]
style    : [perubahan styling atau formatting]
docs     : [perubahan dokumentasi]
test     : [penambahan atau perubahan test]
chore    : [perubahan konfigurasi atau tooling]

# Contoh
feat: add user authentication with Google OAuth
fix: resolve infinite scroll not triggering on mobile
refactor: extract user card into reusable component

# Aturan Tambahan
- Jangan commit file .env atau file yang berisi secret apapun
- Satu commit untuk satu perubahan yang spesifik
- Jangan gabungkan banyak perubahan yang tidak berkaitan dalam satu commit
```

---

## 13. Features

```
# Sudah selesai dan berjalan
- [x] [Nama fitur 1]
- [x] [Nama fitur 2]
- [x] [Nama fitur 3]

# Sedang dikerjakan — jangan diubah tanpa konfirmasi
- [ ] [Nama fitur yang sedang in-progress]
- [ ] [Nama fitur yang sedang in-progress]

# Belum dimulai
- [ ] [Nama fitur yang direncanakan]
- [ ] [Nama fitur yang direncanakan]
```

---

## 14. Testing

```
# Pendekatan Testing
- Jenis testing  : [Unit / Integration / E2E / Manual]
- Framework      : [Jest / Vitest / Playwright / Cypress / dll]

# Yang Perlu Di-test
- Semua fungsi utility dan helper
- Logic bisnis yang kompleks
- API endpoint (happy path dan error case)
- Komponen kritis yang sering dipakai banyak halaman

# Yang Tidak Perlu Di-test
- Komponen presentational yang sangat sederhana
- Third-party library (sudah di-test oleh pembuatnya)
- File konfigurasi

# Aturan Penulisan Test
- Satu test file per satu file yang di-test
- Nama test harus deskriptif:
  'should [expected behavior] when [condition]'
- Gunakan pola AAA: Arrange, Act, Assert

# Coverage Target
- Minimum coverage : [angka]%
- Prioritas        : fungsi bisnis > API > komponen UI
```

---

## 15. Do Not

Jika instruksi atau prompt kamu ambigu, TANYA DULU sebelum mulai coding.
Jangan berasumsi dan langsung mengerjakan tanpa konfirmasi.

```
# Struktur dan File
- Jangan buat folder baru tanpa konfirmasi
- Jangan hapus file tanpa konfirmasi
- Jangan pindahkan file tanpa konfirmasi
- Jangan ubah struktur folder yang sudah ada

# Kode
- Jangan gunakan tipe 'any' di TypeScript
- Jangan hardcode nilai yang seharusnya dari environment variable
- Jangan commit file .env atau file yang berisi secret
- Jangan install package baru tanpa konfirmasi
- Jangan hapus atau ubah fitur yang sudah berjalan tanpa instruksi jelas

# Pattern yang Dilarang
- Jangan gunakan [package atau pattern yang tidak boleh dipakai]
- Jangan gunakan useEffect untuk data fetching
- Jangan gunakan inline style untuk nilai yang bisa pakai utility class

# Database
- Jangan jalankan perintah yang mengubah atau menghapus data production
- Jangan buat migrasi database tanpa konfirmasi
- Jangan expose credential database ke sisi client

# Keamanan
- Jangan expose API key atau secret apapun ke client
- Jangan bypass validasi input dari user
- Jangan skip error handling di API routes
```

---

## 16. Environment Variables

```
# Setup
- Copy .env.example ke .env.local untuk development lokal
- Jangan pernah commit file .env atau .env.local ke repository

# Public Variables — aman dipakai di sisi client
NEXT_PUBLIC_[NAMA]      # [Deskripsi variabel ini untuk apa]
NEXT_PUBLIC_[NAMA]      # [Deskripsi variabel ini untuk apa]

# Server-only Variables — JANGAN pernah expose ke client
[DATABASE_URL]          # [Deskripsi]
[SECRET_KEY]            # [Deskripsi]
[API_KEY]               # [Deskripsi]
[SMTP_PASSWORD]         # [Deskripsi]

# Auth Variables
[AUTH_SECRET]           # Secret untuk JWT signing
[AUTH_URL]              # Base URL aplikasi
[OAUTH_CLIENT_ID]       # OAuth client ID
[OAUTH_CLIENT_SECRET]   # OAuth client secret — server only
```

---

_Template ini adalah titik awal. Semakin detail kamu mengisi setiap bagian sesuai kondisi project kamu, semakin baik hasil yang akan diberikan Claude Code. Update CLAUDE.md secara berkala seiring project kamu berkembang._
