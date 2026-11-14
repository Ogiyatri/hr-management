-- Data referensi yang WAJIB ada di setiap lingkungan (lokal & production):
-- jenis cuti, komponen gaji, parameter payroll. Nilai tarif & plafon BPJS
-- wajib dicek ulang tiap tahun lewat menu Pengaturan → Parameter Payroll.

insert into public.leave_types (code, name, default_quota, is_paid, requires_attachment) values
  ('ANNUAL',    'Cuti Tahunan',            12,   true,  false),
  ('SICK',      'Sakit (Surat Dokter)',    null, true,  true),
  ('MATERNITY', 'Cuti Melahirkan',         65,   true,  true),   -- ±3 bulan hari kerja
  ('MARRIAGE',  'Cuti Menikah',            3,    true,  false),
  ('BEREAVE',   'Cuti Duka',               2,    true,  false),
  ('UNPAID',    'Cuti Tanpa Gaji',         null, false, false)
on conflict (code) do nothing;

insert into public.salary_components (code, name, type, is_taxable, is_fixed) values
  ('T_JABATAN',   'Tunjangan Jabatan',       'earning',   true,  true),
  ('T_TRANSPORT', 'Tunjangan Transport',     'earning',   true,  true),
  ('T_MAKAN',     'Tunjangan Makan',         'earning',   true,  true),
  ('LEMBUR',      'Upah Lembur',             'earning',   true,  false),
  ('BONUS',       'Bonus',                   'earning',   true,  false),
  ('POT_TELAT',   'Potongan Keterlambatan',  'deduction', false, false),
  ('POT_ALPA',    'Potongan Tidak Hadir',    'deduction', false, false),
  ('KASBON',      'Kasbon / Pinjaman',       'deduction', false, false)
on conflict (code) do nothing;

insert into public.payroll_settings (key, value, description) values
  -- BPJS Kesehatan
  ('bpjs_kes_employee_rate',  0.01,     'BPJS Kesehatan porsi karyawan (1%)'),
  ('bpjs_kes_company_rate',   0.04,     'BPJS Kesehatan porsi perusahaan (4%)'),
  ('bpjs_kes_wage_cap',       12000000, 'Plafon upah BPJS Kesehatan'),
  -- BPJS Ketenagakerjaan
  ('bpjs_jht_employee_rate',  0.02,     'JHT porsi karyawan (2%)'),
  ('bpjs_jht_company_rate',   0.037,    'JHT porsi perusahaan (3,7%)'),
  ('bpjs_jp_employee_rate',   0.01,     'Jaminan Pensiun porsi karyawan (1%)'),
  ('bpjs_jp_company_rate',    0.02,     'Jaminan Pensiun porsi perusahaan (2%)'),
  ('bpjs_jp_wage_cap',        10547400, 'Plafon upah JP — CEK nilai terbaru (berubah tiap Maret)'),
  ('bpjs_jkk_company_rate',   0.0024,   'JKK, tergantung tingkat risiko (0,24%–1,74%)'),
  ('bpjs_jkm_company_rate',   0.003,    'JKM porsi perusahaan (0,3%)'),
  -- Aturan internal (sesuaikan dengan kebijakan perusahaan)
  ('late_deduction_per_minute', 0,      'Potongan per menit telat (Rp); 0 = tidak ada'),
  ('absent_deduction_divisor',  21,     'Potongan alpa = gaji pokok / pembagi ini per hari'),
  ('overtime_hourly_divisor',   173,    'Upah lembur per jam = 1/173 x upah sebulan (PP 35/2021)')
on conflict (key) do nothing;


-- Shift default agar karyawan baru langsung bisa absen
insert into public.shifts (name, start_time, end_time, late_tolerance_minutes)
select 'Reguler', '08:00', '17:00', 10
where not exists (select 1 from public.shifts);
