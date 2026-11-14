# HR Management

Sistem HR berbasis web untuk mengganti pencatatan absensi & gaji di Excel.

| Modul | Fitur |
|---|---|
| **Absensi** | Absen masuk/pulang lewat HP dengan GPS (radius per cabang) + selfie, jam dari server, telat & lembur otomatis, koreksi manual oleh HR |
| **Cuti** | Pengajuan + lampiran, kuota tahunan, hari libur tidak dihitung, approval **atasan → HR** |
| **Lembur** | Pengajuan + approval atasan → HR, dibayar sesuai PP 35/2021 |
| **Karyawan** | Data lengkap, jabatan, departemen, cabang, atasan, tunjangan tetap, undangan akun via email |
| **Penggajian** | Hitung otomatis dari absensi/cuti/lembur, BPJS (Kes, JHT, JP, JKK, JKM), **PPh 21 TER (PP 58/2023)** + perhitungan ulang Pasal 17 di Desember, bonus/kasbon per periode, finalisasi (terkunci), slip gaji cetak/PDF, export Excel + daftar transfer bank |
| **Rekrutmen** | Lowongan, halaman karier publik (`/karir`) dengan upload CV, pipeline seleksi, pelamar diterima → jadi karyawan |
| **Laporan** | Rekap absensi, cuti, dan gaji per periode/cabang + export Excel |
| **Dashboard** | Ringkasan hari ini, grafik kehadiran 14 hari, karyawan per departemen, tren gaji |
| **Multi-cabang** | Lokasi, radius & zona waktu (WIB/WITA/WIT) per cabang; HR bisa dibatasi per cabang |
| **Audit log** | Setiap perubahan karyawan, absensi, cuti, lembur & gaji tercatat (siapa, kapan, sebelum/sesudah) |

**Role:** Admin · HR · Manager (menyetujui bawahan langsung) · Karyawan. Hak akses dijaga di database dengan Row Level Security.

## Tech stack

Next.js 16 (App Router, Server Actions) · TypeScript · Tailwind CSS 4 + shadcn/ui · Supabase (Postgres, Auth, Storage, RLS) · Recharts · ExcelJS · Zod · deploy di Vercel.

Logika penting (validasi absen, approval, hitung gaji) ada di **fungsi Postgres** (`supabase/migrations`), jadi tidak bisa dilewati dari browser.

## Menjalankan di lokal

Butuh: Node.js **22+** (Supabase JS tidak lagi mendukung Node 20), Docker, Supabase CLI.

```bash
npm install
supabase start          # Postgres, Auth, Storage, Mailpit (email) di Docker
supabase db reset       # terapkan migration + data contoh
cp .env.example .env.local   # isi dari output `supabase status`
npm run dev             # http://localhost:3000
```

Akun contoh (password semua: `Password123`):

| Email | Role |
|---|---|
| admin@hr.local | Admin |
| hr@hr.local | HR |
| manager@hr.local | Manager (atasan Budi, Siti, Andi) |
| budi@hr.local, siti@hr.local, andi@hr.local | Karyawan |

Email undangan/lupa password di lokal masuk ke Mailpit: http://127.0.0.1:54324

> Absen butuh izin **lokasi & kamera**. Browser hanya mengizinkannya di `localhost` atau HTTPS — untuk mencoba dari HP, pakai URL Vercel.

## Deploy (Supabase Cloud + Vercel)

1. **Supabase** — buat project di https://supabase.com, lalu:
   ```bash
   supabase link --project-ref <ref-project>
   supabase db push        # terapkan semua migration (TANPA data contoh)
   supabase config push    # terapkan pengaturan auth + template email
   ```
   Di Dashboard → Authentication:
   - **Sign In / Providers**: matikan *Allow new users to sign up* (akun dibuat HR), **Email provider tetap aktif**.
   - **URL Configuration**: Site URL = `https://<domain-vercel>`, Redirect URLs = `https://<domain-vercel>/**`.
   - **SMTP**: pasang SMTP sendiri (mis. Resend/SendGrid) — SMTP bawaan Supabase dibatasi beberapa email/jam.
2. **Vercel** — import repo, isi Environment Variables:
   | Nama | Nilai |
   |---|---|
   | `NEXT_PUBLIC_SUPABASE_URL` | Project URL |
   | `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Publishable key |
   | `SUPABASE_SECRET_KEY` | Secret key (**server-only**, jangan diberi prefix `NEXT_PUBLIC_`) |
   | `NEXT_PUBLIC_SITE_URL` | `https://<domain-vercel>` |
3. **Akun admin pertama** — Dashboard Supabase → Authentication → *Add user* (email + password), lalu jalankan di SQL Editor:
   ```sql
   with u as (select id, email from auth.users where email = 'admin@perusahaan.com'),
        b as (insert into branches (code, name, latitude, longitude)
              values ('HQ', 'Kantor Pusat', -6.2, 106.8) returning id),  -- koordinat diperbaiki nanti di Pengaturan
        r as (insert into user_roles (user_id, role) select id, 'admin' from u)
   insert into employees (user_id, employee_no, full_name, email, branch_id)
   select u.id, 'EMP-0001', 'Nama Admin', u.email, b.id from u, b;
   ```
   Setelah login: lengkapi **Pengaturan** (koordinat cabang, shift, hari libur, jabatan), lalu tambah karyawan & kirim undangan.

## Wajib dicek sebelum dipakai

- **Plafon upah BPJS** (Pengaturan → Parameter Payroll) — plafon Jaminan Pensiun berubah tiap Maret; plafon BPJS Kesehatan mengikuti Perpres.
- **Tarif JKK** sesuai tingkat risiko usaha (0,24%–1,74%).
- **Aturan potongan** telat & alpa sesuai kebijakan perusahaan (default: telat tidak dipotong, alpa = gaji pokok/21 per hari).
- **Hari libur nasional & cuti bersama** tahun berjalan (Pengaturan → Shift & Libur).
- Validasi hasil PPh 21 & BPJS bulan pertama dengan perhitungan konsultan pajak/HR.

## Struktur

```
supabase/migrations/   skema, RLS, fungsi (clock_in, decide_leave, generate_payroll, …), tarif TER
supabase/seed.sql      data contoh (lokal saja)
src/app/(auth)/        login, lupa password, buat password
src/app/(app)/         halaman setelah login (per modul: page.tsx + actions.ts)
src/app/karir/         halaman karier publik
src/lib/               supabase client, auth, format, helper action
```

Setelah mengubah skema: `supabase gen types typescript --local > src/lib/database.types.ts`.
