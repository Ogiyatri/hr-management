# TODO — Roadmap Produk

Status sekarang: semua modul inti sudah jalan & teruji (absensi GPS+selfie, cuti, lembur, payroll BPJS + PPh 21 TER, rekrutmen, laporan, dashboard, multi-cabang).
Daftar ini berisi yang **belum** ada, diurutkan dari yang paling berdampak.

Legenda ukuran: 🟢 kecil (< ½ hari) · 🟡 sedang (½–2 hari) · 🔴 besar (> 2 hari)

---

## P1 — Kebenaran gaji & kepatuhan aturan (wajib sebelum dijual)

- [ ] 🟡 **THR (Tunjangan Hari Raya)** — Permenaker 6/2016
  - [ ] Jenis periode payroll baru: `thr` (terpisah dari gaji bulanan)
  - [ ] Hitung otomatis: masa kerja ≥ 12 bln = 1× upah; 1–12 bln = prorata (masa kerja/12 × upah)
  - [ ] Pengaturan dasar THR: gaji pokok saja / gaji pokok + tunjangan tetap
  - [ ] PPh 21 atas THR (TER bulan dibayarkan) + muncul di slip
- [ ] 🟡 **Gaji prorata** untuk karyawan masuk/keluar di tengah periode
  - [ ] Pengaturan metode: hari kerja (default) / hari kalender
  - [ ] Berlaku untuk gaji pokok & tunjangan tetap; tampilkan keterangan "prorata x/y hari" di slip
- [ ] 🟡 **Pola hari kerja yang bisa diatur** (sekarang dikunci Senin–Jumat)
  - [ ] Pengaturan per shift/cabang: 5 hari (Sen–Jum) atau 6 hari (Sen–Sab), atau pilih hari
  - [ ] Pakai di `working_days()`, cuti, rekap absensi, dan tarif lembur hari libur (aturan 6 hari kerja berbeda)
  - [ ] Pembagi potongan alpa ikut menyesuaikan (21 → 25 untuk 6 hari)
- [ ] 🟡 **PPh 21 karyawan keluar sebelum Desember**
  - [ ] Saat status resign/diberhentikan → payroll bulan terakhir pakai perhitungan Pasal 17 setahun (seperti Desember)
  - [ ] Karyawan masuk di tengah tahun: penghasilan tidak disetahunkan (sudah benar, tambahkan tes)
- [ ] 🟡 **Aturan cuti tahunan sesuai UU**
  - [ ] Hak cuti baru aktif setelah 12 bulan kerja (bisa diatur: langsung / setelah X bulan / prorata)
  - [ ] Sisa cuti akhir tahun: hangus / dibawa maks. X hari / dibawa sampai bulan tertentu
  - [ ] Job tahunan (pg_cron 1 Jan) untuk membuat saldo cuti tahun baru

## P2 — Wajib untuk pengalaman produk yang baik

- [ ] 🟡 **Import karyawan dari Excel/CSV** (calon pengguna pasti pindahan dari Excel)
  - [ ] Template unduhan, pratinjau + validasi per baris sebelum disimpan
  - [ ] Opsi kirim undangan massal setelah import
- [ ] 🟡 **Notifikasi**
  - [ ] Email: pengajuan baru → atasan; diteruskan → HR; disetujui/ditolak → karyawan; slip gaji terbit
  - [ ] Pengingat pengajuan tertahan > 2 hari
  - [ ] (Nanti) WhatsApp via penyedia pihak ketiga
- [ ] 🟢 **Halaman Audit Log** (data sudah tercatat di tabel `audit_logs`)
  - [ ] Filter per tabel, karyawan, user, tanggal; tampilkan sebelum → sesudah
- [ ] 🟡 **Shift malam** yang melewati tengah malam (mis. 22:00–06:00)
  - [ ] `work_date` mengikuti tanggal mulai shift; hitung telat/lembur lintas hari
- [ ] 🟢 **PWA** — manifest + ikon, bisa "Tambahkan ke layar utama" untuk absen
- [ ] 🟢 **Upgrade ke Node 22** (supabase-js sudah tidak mendukung Node 20)
- [ ] 🟢 **Pindahkan uji E2E ke repo** (Playwright) + jalankan di CI
  - [ ] Termasuk uji SQL hitung payroll (TER, BPJS, Desember, prorata, THR)

## P3 — Pembeda produk / nilai tambah

- [ ] 🟡 **Anti fake GPS**: kunci absen ke 1 perangkat per karyawan, tandai akurasi GPS buruk / lokasi melompat
- [ ] 🔴 **Verifikasi wajah** selfie vs foto profil
- [ ] 🟡 **Bukti potong PPh 21 (1721-A1)** tahunan + ekspor format e-Bupot
- [ ] 🟡 **Profil karyawan mandiri**: ubah data pribadi/rekening (perlu persetujuan HR), unggah dokumen (KTP, NPWP, BPJS)
- [ ] 🟡 **Kontrak & pengingat**: kontrak/percobaan hampir habis, ulang tahun kerja
- [ ] 🟡 **Reimbursement / klaim** (transport, kesehatan) dengan approval atasan → HR
- [ ] 🔴 **Penilaian kinerja (KPI)** sederhana per periode
- [ ] 🟢 **Mode gelap** (warna grafik dark mode sudah disiapkan)
- [ ] 🟢 **Pengaturan perusahaan**: nama, logo, alamat — tampil di slip & halaman karier

## P4 — Kalau mau dijual ke banyak perusahaan (SaaS)

- [ ] 🔴 **Multi-tenant**: tabel `companies`, `company_id` di semua tabel, RLS per perusahaan
- [ ] 🔴 **Onboarding**: daftar perusahaan → wizard (cabang, shift, jabatan, import karyawan)
- [ ] 🔴 **Langganan & billing** (per karyawan aktif / bulan), batas paket
- [ ] 🟡 **Landing page** produk + halaman harga + demo dengan data contoh
- [ ] 🟡 **Kebijakan privasi & UU PDP**: persetujuan data biometrik (selfie) & lokasi, retensi foto absen, ekspor/hapus data karyawan

## Rilis

- [ ] 🟢 Commit awal ke git + push ke GitHub
- [ ] 🟢 Buat project Supabase Cloud → `supabase db push` + `supabase config push`
- [ ] 🟢 Deploy Vercel + environment variables (lihat README)
- [ ] 🟢 Pasang SMTP (Resend/SendGrid) — SMTP bawaan Supabase dibatasi
- [ ] 🟢 Isi hari libur nasional & cuti bersama 2027
- [ ] 🟢 Cek ulang plafon upah BPJS JP (berubah tiap Maret)
