-- DATA DEMO untuk development lokal saja (tidak ikut ke production).
-- Data referensi (jenis cuti, komponen gaji, parameter payroll, shift default)
-- ada di migration 20261115000000_reference_data.sql.

-- Contoh cabang & shift (hapus/ubah sesuai data klien)
insert into public.branches (code, name, address, latitude, longitude, radius_m) values
  ('HQ', 'Kantor Pusat', 'Jakarta', -6.200000, 106.816666, 100);


-- Tarif TER PPh 21 sudah diisi di migration 20261114000000_payroll_and_features.sql

-- =====================================================================
-- DATA CONTOH UNTUK DEVELOPMENT LOKAL SAJA (jangan dipakai di production)
-- Semua akun contoh memakai password: Password123
--   admin@hr.local (Admin) · hr@hr.local (HR) · manager@hr.local (Manager)
--   budi@hr.local, siti@hr.local, andi@hr.local (Karyawan)
-- =====================================================================
create or replace function pg_temp.dev_user(p_email text, p_password text)
returns uuid language plpgsql as $$
declare v_uid uuid := gen_random_uuid();
begin
  insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
                          raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
                          confirmation_token, recovery_token, email_change_token_new, email_change)
  values ('00000000-0000-0000-0000-000000000000', v_uid, 'authenticated', 'authenticated', p_email,
          extensions.crypt(p_password, extensions.gen_salt('bf')), now(),
          '{"provider":"email","providers":["email"]}', '{}', now(), now(), '', '', '', '');
  insert into auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
  values (gen_random_uuid(), v_uid, v_uid::text,
          jsonb_build_object('sub', v_uid::text, 'email', p_email, 'email_verified', true),
          'email', now(), now(), now());
  return v_uid;
end $$;

insert into public.branches (code, name, address, latitude, longitude, radius_m, timezone) values
  ('SBY', 'Cabang Surabaya', 'Surabaya', -7.257472, 112.752088, 150, 'Asia/Jakarta');

insert into public.departments (name) values ('Operasional'), ('Keuangan'), ('Human Resources'), ('Penjualan');

insert into public.positions (department_id, name, level, base_salary)
select d.id, p.name, p.level, p.salary from (values
  ('Human Resources', 'HR Officer',        2, 7000000),
  ('Operasional',     'Supervisor Operasional', 3, 9000000),
  ('Operasional',     'Staf Operasional',  1, 5500000),
  ('Keuangan',        'Staf Keuangan',     1, 6000000),
  ('Penjualan',       'Sales Executive',   1, 5000000)) p(dept, name, level, salary)
join public.departments d on d.name = p.dept;

do $$
declare
  v_hq uuid := (select id from public.branches where code = 'HQ');
  v_sby uuid := (select id from public.branches where code = 'SBY');
  v_shift uuid := (select id from public.shifts limit 1);
  v_admin uuid := gen_random_uuid();
  v_hr uuid; v_mgr uuid; v_budi uuid; v_siti uuid; v_andi uuid;
  e_mgr uuid;
  pos record;
begin
  v_admin := pg_temp.dev_user('admin@hr.local', 'Password123');
  v_hr    := pg_temp.dev_user('hr@hr.local', 'Password123');
  v_mgr   := pg_temp.dev_user('manager@hr.local', 'Password123');
  v_budi  := pg_temp.dev_user('budi@hr.local', 'Password123');
  v_siti  := pg_temp.dev_user('siti@hr.local', 'Password123');
  v_andi  := pg_temp.dev_user('andi@hr.local', 'Password123');

  insert into public.user_roles (user_id, role) values
    (v_admin, 'admin'), (v_hr, 'hr'), (v_mgr, 'manager'),
    (v_budi, 'employee'), (v_siti, 'employee'), (v_andi, 'employee');

  insert into public.employees (user_id, employee_no, full_name, email, branch_id, shift_id, join_date, department_id, position_id, ptkp_status, gender)
  values (v_admin, 'EMP-0001', 'Administrator', 'admin@hr.local', v_hq, v_shift, '2023-01-02',
          (select id from public.departments where name = 'Human Resources'),
          (select id from public.positions where name = 'HR Officer'), 'TK/0', 'male');

  insert into public.employees (user_id, employee_no, full_name, email, branch_id, shift_id, join_date, department_id, position_id, ptkp_status, gender)
  values (v_hr, 'EMP-0002', 'Rina Wulandari', 'hr@hr.local', v_hq, v_shift, '2023-03-01',
          (select id from public.departments where name = 'Human Resources'),
          (select id from public.positions where name = 'HR Officer'), 'K/1', 'female');

  insert into public.employees (user_id, employee_no, full_name, email, branch_id, shift_id, join_date, department_id, position_id, ptkp_status, gender)
  values (v_mgr, 'EMP-0003', 'Dimas Pratama', 'manager@hr.local', v_hq, v_shift, '2023-05-15',
          (select id from public.departments where name = 'Operasional'),
          (select id from public.positions where name = 'Supervisor Operasional'), 'K/2', 'male')
  returning id into e_mgr;

  insert into public.employees (user_id, employee_no, full_name, email, branch_id, shift_id, join_date, department_id, position_id, supervisor_id, ptkp_status, gender) values
    (v_budi, 'EMP-0004', 'Budi Santoso', 'budi@hr.local', v_hq, v_shift, '2024-02-01',
     (select id from public.departments where name = 'Operasional'),
     (select id from public.positions where name = 'Staf Operasional'), e_mgr, 'K/0', 'male'),
    (v_siti, 'EMP-0005', 'Siti Nurhaliza', 'siti@hr.local', v_hq, v_shift, '2024-06-10',
     (select id from public.departments where name = 'Keuangan'),
     (select id from public.positions where name = 'Staf Keuangan'), e_mgr, 'TK/0', 'female'),
    (v_andi, 'EMP-0006', 'Andi Wijaya', 'andi@hr.local', v_sby, v_shift, '2025-01-06',
     (select id from public.departments where name = 'Penjualan'),
     (select id from public.positions where name = 'Sales Executive'), e_mgr, 'TK/1', 'male');

  -- Tunjangan tetap
  insert into public.employee_salary_components (employee_id, component_id, amount)
  select e.id, c.id, v.amount
    from (values ('T_TRANSPORT', 500000), ('T_MAKAN', 600000)) v(code, amount)
    join public.salary_components c on c.code = v.code
   cross join public.employees e;
  insert into public.employee_salary_components (employee_id, component_id, amount)
  select e.id, c.id, 1500000 from public.employees e, public.salary_components c
   where c.code = 'T_JABATAN' and e.employee_no in ('EMP-0002', 'EMP-0003');

  -- Riwayat absensi 75 hari terakhir (hari kerja), dengan variasi telat/alpa
  insert into public.attendances (employee_id, branch_id, work_date, status, check_in_at, check_out_at, late_minutes)
  select e.id, e.branch_id, d::date,
         case when (extract(day from d)::int + length(e.full_name)) % 9 = 0 then 'late' else 'present' end::public.attendance_status,
         (d::date + time '07:50' + (case when (extract(day from d)::int + length(e.full_name)) % 9 = 0 then interval '35 minutes' else interval '0' end)) at time zone 'Asia/Jakarta',
         (d::date + time '17:05') at time zone 'Asia/Jakarta',
         case when (extract(day from d)::int + length(e.full_name)) % 9 = 0 then 25 else 0 end
    from public.employees e
   cross join generate_series(current_date - 75, current_date - 1, interval '1 day') d
   where extract(isodow from d) < 6
     and (extract(day from d)::int * 7 + length(e.full_name)) % 17 <> 0;   -- sesekali tidak hadir
end $$;

insert into public.job_postings (title, branch_id, department_id, position_id, description, requirements, quota, status, opened_at)
select 'Staf Operasional Gudang', b.id, d.id, p.id,
       'Mengelola keluar-masuk barang dan stok gudang.',
       E'- Pendidikan min. SMA/SMK\n- Teliti dan bisa bekerja dalam tim\n- Bersedia kerja shift',
       2, 'open', current_date - 7
  from public.branches b, public.departments d, public.positions p
 where b.code = 'HQ' and d.name = 'Operasional' and p.name = 'Staf Operasional';

insert into public.applicants (job_posting_id, full_name, email, phone, stage, rating)
select j.id, a.name, a.email, a.phone, a.stage::public.applicant_stage, a.rating
  from public.job_postings j,
       (values ('Fajar Nugroho', 'fajar@example.com', '081200000001', 'interview', 4),
               ('Lestari Ayu',   'lestari@example.com', '081200000002', 'screening', 3),
               ('Rizky Maulana', 'rizky@example.com', '081200000003', 'applied', null)) a(name, email, phone, stage, rating);
