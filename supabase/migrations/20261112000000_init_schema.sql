-- =====================================================================
-- HR Management System — skema awal
-- Modul: cabang, organisasi, karyawan, absensi (GPS + selfie), cuti
-- (approval atasan -> HR), lembur, penggajian (BPJS + PPh 21 TER),
-- rekrutmen, audit log.
-- =====================================================================

-- ---------------------------------------------------------------------
-- ENUMS
-- ---------------------------------------------------------------------
create type public.app_role          as enum ('admin', 'hr', 'manager', 'employee');
create type public.gender            as enum ('male', 'female');
create type public.employment_type   as enum ('permanent', 'contract', 'probation', 'intern');
create type public.employee_status   as enum ('active', 'resigned', 'terminated');
create type public.attendance_status as enum ('present', 'late', 'absent', 'leave', 'sick', 'holiday');
create type public.request_status    as enum ('pending', 'approved_supervisor', 'approved', 'rejected', 'cancelled');
create type public.payroll_status    as enum ('draft', 'finalized', 'paid');
create type public.component_type    as enum ('earning', 'deduction');
create type public.job_status        as enum ('draft', 'open', 'closed');
create type public.applicant_stage   as enum ('applied', 'screening', 'interview', 'offering', 'hired', 'rejected');

-- ---------------------------------------------------------------------
-- UTIL: updated_at
-- ---------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end $$;

-- ---------------------------------------------------------------------
-- ORGANISASI
-- ---------------------------------------------------------------------
create table public.branches (
  id          uuid primary key default gen_random_uuid(),
  code        text not null unique,
  name        text not null,
  address     text,
  latitude    double precision not null,
  longitude   double precision not null,
  radius_m    integer not null default 100 check (radius_m > 0),   -- radius absen yang diizinkan
  timezone    text not null default 'Asia/Jakarta',                -- WIB/WITA/WIT
  is_active   boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table public.departments (
  id          uuid primary key default gen_random_uuid(),
  name        text not null unique,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table public.positions (
  id            uuid primary key default gen_random_uuid(),
  department_id uuid references public.departments(id) on delete set null,
  name          text not null,
  level         smallint not null default 1,
  base_salary   numeric(14,2) not null default 0 check (base_salary >= 0),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique (department_id, name)
);

create table public.shifts (
  id                     uuid primary key default gen_random_uuid(),
  branch_id              uuid references public.branches(id) on delete cascade, -- null = berlaku semua cabang
  name                   text not null,
  start_time             time not null,
  end_time               time not null,
  late_tolerance_minutes smallint not null default 0,
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now()
);

create table public.holidays (
  id         uuid primary key default gen_random_uuid(),
  branch_id  uuid references public.branches(id) on delete cascade, -- null = libur nasional
  date       date not null,
  name       text not null,
  created_at timestamptz not null default now()
);
create unique index holidays_unique on public.holidays (date, coalesce(branch_id, '00000000-0000-0000-0000-000000000000'::uuid));

-- ---------------------------------------------------------------------
-- KARYAWAN & ROLE
-- ---------------------------------------------------------------------
create table public.employees (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid unique references auth.users(id) on delete set null,
  employee_no      text not null unique,
  full_name        text not null,
  email            text not null unique,
  phone            text,
  nik              text unique,                  -- No. KTP
  npwp             text,
  gender           public.gender,
  birth_date       date,
  address          text,
  photo_path       text,
  branch_id        uuid not null references public.branches(id),
  department_id    uuid references public.departments(id) on delete set null,
  position_id      uuid references public.positions(id) on delete set null,
  shift_id         uuid references public.shifts(id) on delete set null,
  supervisor_id    uuid references public.employees(id) on delete set null,
  employment_type  public.employment_type not null default 'permanent',
  status           public.employee_status not null default 'active',
  join_date        date not null default current_date,
  end_date         date,
  -- Status PTKP untuk PPh 21 (TK/0 .. K/3) -> menentukan kategori TER A/B/C
  ptkp_status      text not null default 'TK/0'
                   check (ptkp_status in ('TK/0','TK/1','TK/2','TK/3','K/0','K/1','K/2','K/3')),
  base_salary      numeric(14,2) check (base_salary >= 0), -- null = ikut gaji pokok jabatan
  bank_name        text,
  bank_account     text,
  bpjs_kesehatan_no   text,
  bpjs_ketenagakerjaan_no text,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  check (supervisor_id is null or supervisor_id <> id)
);
create index on public.employees (branch_id);
create index on public.employees (supervisor_id);

create table public.user_roles (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  role       public.app_role not null default 'employee',
  branch_id  uuid references public.branches(id) on delete set null, -- null = semua cabang (untuk admin/HR pusat)
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- HELPER AUTH (SECURITY DEFINER agar bisa dipakai di policy tanpa rekursi)
-- ---------------------------------------------------------------------
create or replace function public.current_app_role()
returns public.app_role language sql stable security definer set search_path = public as $$
  select coalesce((select role from public.user_roles where user_id = auth.uid()), 'employee'::public.app_role)
$$;

create or replace function public.current_employee_id()
returns uuid language sql stable security definer set search_path = public as $$
  select id from public.employees where user_id = auth.uid()
$$;

-- HR/admin; jika user_roles.branch_id diisi, hanya berlaku di cabang tsb
create or replace function public.is_hr(p_branch_id uuid default null)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.user_roles ur
    where ur.user_id = auth.uid()
      and ur.role in ('admin','hr')
      and (ur.role = 'admin' or ur.branch_id is null or p_branch_id is null or ur.branch_id = p_branch_id)
  )
$$;

-- Apakah employee p_employee_id adalah bawahan (langsung) user saat ini
create or replace function public.is_supervisor_of(p_employee_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.employees e
    where e.id = p_employee_id and e.supervisor_id = public.current_employee_id()
  )
$$;

create or replace function public.employee_branch(p_employee_id uuid)
returns uuid language sql stable security definer set search_path = public as $$
  select branch_id from public.employees where id = p_employee_id
$$;

-- Bisa melihat data karyawan: diri sendiri, atasan langsung, atau HR cabangnya
create or replace function public.can_view_employee(p_employee_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select p_employee_id = public.current_employee_id()
      or public.is_supervisor_of(p_employee_id)
      or public.is_hr(public.employee_branch(p_employee_id))
$$;

-- ---------------------------------------------------------------------
-- KOMPONEN GAJI
-- ---------------------------------------------------------------------
create table public.salary_components (
  id          uuid primary key default gen_random_uuid(),
  code        text not null unique,
  name        text not null,
  type        public.component_type not null,
  is_taxable  boolean not null default true,   -- masuk penghasilan bruto PPh 21
  is_fixed    boolean not null default true,   -- tetap tiap bulan vs. variabel
  created_at  timestamptz not null default now()
);

create table public.employee_salary_components (
  id           uuid primary key default gen_random_uuid(),
  employee_id  uuid not null references public.employees(id) on delete cascade,
  component_id uuid not null references public.salary_components(id) on delete restrict,
  amount       numeric(14,2) not null check (amount >= 0),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  unique (employee_id, component_id)
);

-- Parameter payroll (tarif BPJS, plafon, aturan potongan telat, dll.)
create table public.payroll_settings (
  key         text primary key,
  value       numeric(14,6) not null,
  description text,
  updated_at  timestamptz not null default now()
);

-- Tabel tarif efektif rata-rata (TER) PPh 21 — PP 58/2023
create table public.pph21_ter_rates (
  category    char(1) not null check (category in ('A','B','C')),
  min_income  numeric(14,2) not null,
  max_income  numeric(14,2),            -- null = tak terhingga
  rate        numeric(6,4) not null,    -- persen, mis. 0.2500 = 0,25%
  primary key (category, min_income)
);

-- ---------------------------------------------------------------------
-- ABSENSI
-- ---------------------------------------------------------------------
create table public.attendances (
  id                    uuid primary key default gen_random_uuid(),
  employee_id           uuid not null references public.employees(id) on delete cascade,
  branch_id             uuid not null references public.branches(id),
  work_date             date not null,
  status                public.attendance_status not null default 'present',
  check_in_at           timestamptz,
  check_in_lat          double precision,
  check_in_lng          double precision,
  check_in_accuracy_m   double precision,
  check_in_distance_m   double precision,
  check_in_photo_path   text,
  check_out_at          timestamptz,
  check_out_lat         double precision,
  check_out_lng         double precision,
  check_out_distance_m  double precision,
  check_out_photo_path  text,
  late_minutes          integer not null default 0,
  overtime_minutes      integer not null default 0,  -- tercatat; dibayar hanya jika ada lembur yang disetujui
  note                  text,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),
  unique (employee_id, work_date)
);
create index on public.attendances (work_date);
create index on public.attendances (branch_id, work_date);

-- Jarak 2 titik (meter), haversine — tanpa PostGIS
create or replace function public.haversine_m(lat1 double precision, lng1 double precision,
                                              lat2 double precision, lng2 double precision)
returns double precision language sql immutable as $$
  select 2 * 6371000 * asin(sqrt(
    power(sin(radians(lat2 - lat1) / 2), 2) +
    cos(radians(lat1)) * cos(radians(lat2)) * power(sin(radians(lng2 - lng1) / 2), 2)
  ))
$$;

-- Absen masuk: waktu diambil dari server, lokasi dicek terhadap radius cabang
create or replace function public.clock_in(p_lat double precision, p_lng double precision,
                                           p_photo_path text, p_accuracy_m double precision default null)
returns public.attendances
language plpgsql security definer set search_path = public as $$
declare
  v_emp    public.employees;
  v_branch public.branches;
  v_shift  public.shifts;
  v_local  timestamp;
  v_dist   double precision;
  v_diff   integer;
  v_late   integer := 0;
  v_row    public.attendances;
begin
  select * into v_emp from public.employees where user_id = auth.uid() and status = 'active';
  if not found then raise exception 'Akun tidak terhubung ke karyawan aktif'; end if;

  if p_photo_path is null or split_part(p_photo_path, '/', 1) <> auth.uid()::text then
    raise exception 'Foto selfie wajib diunggah';
  end if;

  select * into v_branch from public.branches where id = v_emp.branch_id;
  v_local := now() at time zone v_branch.timezone;
  v_dist  := public.haversine_m(p_lat, p_lng, v_branch.latitude, v_branch.longitude);

  if v_dist > v_branch.radius_m then
    raise exception 'Di luar area kantor: % m dari %, maksimal % m', round(v_dist), v_branch.name, v_branch.radius_m;
  end if;

  if v_emp.shift_id is not null then
    select * into v_shift from public.shifts where id = v_emp.shift_id;
    v_diff := floor(extract(epoch from (v_local::time - v_shift.start_time)) / 60)::int;
    if v_diff > v_shift.late_tolerance_minutes then v_late := v_diff; end if;
  end if;

  insert into public.attendances (employee_id, branch_id, work_date, status, check_in_at,
                                  check_in_lat, check_in_lng, check_in_accuracy_m,
                                  check_in_distance_m, check_in_photo_path, late_minutes)
  values (v_emp.id, v_branch.id, v_local::date,
          case when v_late > 0 then 'late' else 'present' end::public.attendance_status,
          now(), p_lat, p_lng, p_accuracy_m, v_dist, p_photo_path, v_late)
  returning * into v_row;

  return v_row;
exception when unique_violation then
  raise exception 'Anda sudah absen masuk hari ini';
end $$;

create or replace function public.clock_out(p_lat double precision, p_lng double precision, p_photo_path text)
returns public.attendances
language plpgsql security definer set search_path = public as $$
declare
  v_emp    public.employees;
  v_branch public.branches;
  v_shift  public.shifts;
  v_local  timestamp;
  v_dist   double precision;
  v_ot     integer := 0;
  v_row    public.attendances;
begin
  select * into v_emp from public.employees where user_id = auth.uid() and status = 'active';
  if not found then raise exception 'Akun tidak terhubung ke karyawan aktif'; end if;

  if p_photo_path is null or split_part(p_photo_path, '/', 1) <> auth.uid()::text then
    raise exception 'Foto selfie wajib diunggah';
  end if;

  select * into v_branch from public.branches where id = v_emp.branch_id;
  v_local := now() at time zone v_branch.timezone;
  v_dist  := public.haversine_m(p_lat, p_lng, v_branch.latitude, v_branch.longitude);

  if v_dist > v_branch.radius_m then
    raise exception 'Di luar area kantor: % m dari %, maksimal % m', round(v_dist), v_branch.name, v_branch.radius_m;
  end if;

  if v_emp.shift_id is not null then
    select * into v_shift from public.shifts where id = v_emp.shift_id;
    v_ot := greatest(0, floor(extract(epoch from (v_local::time - v_shift.end_time)) / 60)::int);
  end if;

  update public.attendances
     set check_out_at = now(), check_out_lat = p_lat, check_out_lng = p_lng,
         check_out_distance_m = v_dist, check_out_photo_path = p_photo_path,
         overtime_minutes = v_ot
   where employee_id = v_emp.id and work_date = v_local::date and check_out_at is null
         and check_in_at is not null
  returning * into v_row;

  if not found then raise exception 'Belum absen masuk hari ini, atau sudah absen pulang'; end if;
  return v_row;
end $$;

-- ---------------------------------------------------------------------
-- CUTI (approval 2 tahap: atasan -> HR)
-- ---------------------------------------------------------------------
create table public.leave_types (
  id                  uuid primary key default gen_random_uuid(),
  code                text not null unique,
  name                text not null,
  default_quota       smallint,          -- hari/tahun; null = tidak dibatasi kuota
  is_paid             boolean not null default true,
  requires_attachment boolean not null default false,
  created_at          timestamptz not null default now()
);

create table public.leave_balances (
  employee_id   uuid not null references public.employees(id) on delete cascade,
  leave_type_id uuid not null references public.leave_types(id) on delete cascade,
  year          smallint not null,
  quota         numeric(5,1) not null,
  used          numeric(5,1) not null default 0,
  primary key (employee_id, leave_type_id, year),
  check (used <= quota)
);

create table public.leave_requests (
  id                    uuid primary key default gen_random_uuid(),
  employee_id           uuid not null references public.employees(id) on delete cascade,
  leave_type_id         uuid not null references public.leave_types(id),
  start_date            date not null,
  end_date              date not null,
  days                  numeric(5,1) not null default 0,
  reason                text not null,
  attachment_path       text,
  status                public.request_status not null default 'pending',
  supervisor_id         uuid references public.employees(id) on delete set null,
  supervisor_decided_at timestamptz,
  supervisor_note       text,
  hr_id                 uuid references public.employees(id) on delete set null,
  hr_decided_at         timestamptz,
  hr_note               text,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),
  check (end_date >= start_date)
);
create index on public.leave_requests (employee_id, start_date);
create index on public.leave_requests (supervisor_id, status);

-- Hari kerja (Senin–Jumat, di luar libur nasional & libur cabang)
create or replace function public.working_days(p_start date, p_end date, p_branch_id uuid)
returns setof date language sql stable as $$
  select d::date
  from generate_series(p_start, p_end, interval '1 day') d
  where extract(isodow from d) < 6
    and not exists (
      select 1 from public.holidays h
      where h.date = d::date and (h.branch_id is null or h.branch_id = p_branch_id)
    )
$$;

-- Validasi saat pengajuan: hitung hari, set atasan, cek kuota & tumpang tindih
create or replace function public.leave_request_before_insert()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_emp   public.employees;
  v_type  public.leave_types;
  v_bal   public.leave_balances;
begin
  select * into v_emp  from public.employees   where id = new.employee_id;
  select * into v_type from public.leave_types where id = new.leave_type_id;

  new.status        := 'pending';
  new.supervisor_id := v_emp.supervisor_id;
  new.days          := (select count(*) from public.working_days(new.start_date, new.end_date, v_emp.branch_id));

  if new.days = 0 then raise exception 'Rentang tanggal tidak berisi hari kerja'; end if;
  if v_type.requires_attachment and new.attachment_path is null then
    raise exception 'Cuti % wajib melampirkan dokumen', v_type.name;
  end if;

  if exists (select 1 from public.leave_requests r
             where r.employee_id = new.employee_id
               and r.status in ('pending','approved_supervisor','approved')
               and daterange(r.start_date, r.end_date, '[]') && daterange(new.start_date, new.end_date, '[]')) then
    raise exception 'Tanggal bertabrakan dengan pengajuan cuti lain';
  end if;

  if v_type.default_quota is not null then
    if extract(year from new.start_date) <> extract(year from new.end_date) then
      raise exception 'Pengajuan cuti berkuota tidak boleh melewati pergantian tahun; pisahkan menjadi 2 pengajuan';
    end if;
    select * into v_bal from public.leave_balances
     where employee_id = new.employee_id and leave_type_id = new.leave_type_id
       and year = extract(year from new.start_date);
    if not found then
      insert into public.leave_balances (employee_id, leave_type_id, year, quota)
      values (new.employee_id, new.leave_type_id, extract(year from new.start_date), v_type.default_quota)
      returning * into v_bal;
    end if;
    if v_bal.quota - v_bal.used < new.days then
      raise exception 'Sisa kuota % tinggal % hari, diajukan % hari', v_type.name, v_bal.quota - v_bal.used, new.days;
    end if;
  end if;
  return new;
end $$;

create trigger leave_request_before_insert
before insert on public.leave_requests
for each row execute function public.leave_request_before_insert();

-- Keputusan cuti. Tahap 1: atasan langsung. Tahap 2: HR.
-- Jika karyawan tidak punya atasan, HR langsung memutuskan tahap 1.
create or replace function public.decide_leave(p_request_id uuid, p_approve boolean, p_note text default null)
returns public.leave_requests
language plpgsql security definer set search_path = public as $$
declare
  v_req    public.leave_requests;
  v_me     uuid := public.current_employee_id();
  v_branch uuid;
  v_type   public.leave_types;
  v_status public.attendance_status;
begin
  select * into v_req from public.leave_requests where id = p_request_id for update;
  if not found then raise exception 'Pengajuan tidak ditemukan'; end if;
  if v_req.employee_id = v_me then raise exception 'Tidak boleh menyetujui pengajuan sendiri'; end if;
  v_branch := public.employee_branch(v_req.employee_id);

  if v_req.status = 'pending' then
    if not (v_req.supervisor_id = v_me or (v_req.supervisor_id is null and public.is_hr(v_branch))) then
      raise exception 'Hanya atasan langsung yang dapat memproses tahap ini';
    end if;
    update public.leave_requests
       set status = case when p_approve then 'approved_supervisor' else 'rejected' end::public.request_status,
           supervisor_decided_at = now(), supervisor_note = p_note
     where id = p_request_id returning * into v_req;

  elsif v_req.status = 'approved_supervisor' then
    if not public.is_hr(v_branch) then raise exception 'Hanya HR yang dapat memproses tahap ini'; end if;
    update public.leave_requests
       set status = case when p_approve then 'approved' else 'rejected' end::public.request_status,
           hr_id = v_me, hr_decided_at = now(), hr_note = p_note
     where id = p_request_id returning * into v_req;

    if p_approve then
      select * into v_type from public.leave_types where id = v_req.leave_type_id;
      if v_type.default_quota is not null then
        update public.leave_balances set used = used + v_req.days
         where employee_id = v_req.employee_id and leave_type_id = v_req.leave_type_id
           and year = extract(year from v_req.start_date);
      end if;
      v_status := case when v_type.code = 'SICK' then 'sick' else 'leave' end;
      insert into public.attendances (employee_id, branch_id, work_date, status, note)
      select v_req.employee_id, v_branch, d, v_status, 'Cuti: ' || v_type.name
        from public.working_days(v_req.start_date, v_req.end_date, v_branch) d
      on conflict (employee_id, work_date) do nothing;
    end if;
  else
    raise exception 'Pengajuan sudah final (%)', v_req.status;
  end if;

  return v_req;
end $$;

-- ---------------------------------------------------------------------
-- LEMBUR (approval sama: atasan -> HR)
-- ---------------------------------------------------------------------
create table public.overtime_requests (
  id                    uuid primary key default gen_random_uuid(),
  employee_id           uuid not null references public.employees(id) on delete cascade,
  work_date             date not null,
  hours                 numeric(4,1) not null check (hours > 0 and hours <= 12),
  reason                text not null,
  status                public.request_status not null default 'pending',
  supervisor_id         uuid references public.employees(id) on delete set null,
  supervisor_decided_at timestamptz,
  hr_id                 uuid references public.employees(id) on delete set null,
  hr_decided_at         timestamptz,
  note                  text,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),
  unique (employee_id, work_date)
);

-- ---------------------------------------------------------------------
-- PENGGAJIAN
-- ---------------------------------------------------------------------
create table public.payroll_periods (
  id           uuid primary key default gen_random_uuid(),
  branch_id    uuid references public.branches(id),  -- null = semua cabang
  period_month date not null check (extract(day from period_month) = 1),
  start_date   date not null,   -- periode absensi (bisa cut-off, mis. 26–25)
  end_date     date not null,
  status       public.payroll_status not null default 'draft',
  created_by   uuid references public.employees(id) on delete set null,
  finalized_at timestamptz,
  paid_at      timestamptz,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  check (end_date >= start_date)
);
create unique index payroll_periods_unique
  on public.payroll_periods (period_month, coalesce(branch_id, '00000000-0000-0000-0000-000000000000'::uuid));

create table public.payslips (
  id                uuid primary key default gen_random_uuid(),
  period_id         uuid not null references public.payroll_periods(id) on delete cascade,
  employee_id       uuid not null references public.employees(id) on delete restrict,
  branch_id         uuid not null references public.branches(id),
  -- snapshot data karyawan saat payroll dibuat
  position_name     text,
  ptkp_status       text not null,
  ter_category      char(1) not null,
  -- rekap absensi
  working_days      smallint not null default 0,
  present_days      smallint not null default 0,
  absent_days       smallint not null default 0,
  leave_days        smallint not null default 0,
  late_minutes      integer not null default 0,
  overtime_hours    numeric(5,1) not null default 0,
  -- nominal
  base_salary       numeric(14,2) not null default 0,
  total_earnings    numeric(14,2) not null default 0,
  total_deductions  numeric(14,2) not null default 0,
  gross_taxable     numeric(14,2) not null default 0,
  bpjs_employee     numeric(14,2) not null default 0,
  bpjs_company      numeric(14,2) not null default 0,
  pph21             numeric(14,2) not null default 0,
  net_salary        numeric(14,2) not null default 0,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  unique (period_id, employee_id)
);
create index on public.payslips (employee_id);

create table public.payslip_items (
  id         uuid primary key default gen_random_uuid(),
  payslip_id uuid not null references public.payslips(id) on delete cascade,
  code       text not null,
  name       text not null,
  type       public.component_type not null,
  amount     numeric(14,2) not null,
  is_company_contribution boolean not null default false, -- BPJS porsi perusahaan (info, tidak memotong gaji)
  sort_order smallint not null default 0
);
create index on public.payslip_items (payslip_id);

-- ---------------------------------------------------------------------
-- REKRUTMEN
-- ---------------------------------------------------------------------
create table public.job_postings (
  id            uuid primary key default gen_random_uuid(),
  title         text not null,
  branch_id     uuid references public.branches(id),
  department_id uuid references public.departments(id) on delete set null,
  position_id   uuid references public.positions(id) on delete set null,
  description   text,
  requirements  text,
  quota         smallint not null default 1,
  status        public.job_status not null default 'draft',
  opened_at     date,
  closed_at     date,
  created_by    uuid references public.employees(id) on delete set null,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create table public.applicants (
  id                uuid primary key default gen_random_uuid(),
  job_posting_id    uuid not null references public.job_postings(id) on delete cascade,
  full_name         text not null,
  email             text not null,
  phone             text,
  cv_path           text,
  stage             public.applicant_stage not null default 'applied',
  rating            smallint check (rating between 1 and 5),
  notes             text,
  hired_employee_id uuid references public.employees(id) on delete set null,
  applied_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  unique (job_posting_id, email)
);

-- ---------------------------------------------------------------------
-- AUDIT LOG (menjawab masalah "susah tracking")
-- ---------------------------------------------------------------------
create table public.audit_logs (
  id         bigint generated always as identity primary key,
  table_name text not null,
  record_id  uuid,
  action     text not null,
  old_data   jsonb,
  new_data   jsonb,
  actor_id   uuid default auth.uid(),
  created_at timestamptz not null default now()
);
create index on public.audit_logs (table_name, record_id);
create index on public.audit_logs (created_at desc);

create or replace function public.audit_trigger()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.audit_logs (table_name, record_id, action, old_data, new_data)
  values (tg_table_name,
          coalesce((case when tg_op = 'DELETE' then old.id else new.id end), null),
          tg_op,
          case when tg_op in ('UPDATE','DELETE') then to_jsonb(old) end,
          case when tg_op in ('INSERT','UPDATE') then to_jsonb(new) end);
  return coalesce(new, old);
end $$;

-- ---------------------------------------------------------------------
-- TRIGGERS: updated_at & audit
-- ---------------------------------------------------------------------
do $$
declare t text;
begin
  foreach t in array array['branches','departments','positions','shifts','employees',
                           'employee_salary_components','attendances','leave_requests',
                           'overtime_requests','payroll_periods','payslips','job_postings','applicants']
  loop
    execute format('create trigger set_updated_at before update on public.%I
                    for each row execute function public.set_updated_at()', t);
  end loop;

  foreach t in array array['branches','positions','employees','employee_salary_components',
                           'attendances','leave_requests','overtime_requests',
                           'payroll_periods','payslips','applicants']
  loop
    execute format('create trigger audit after insert or update or delete on public.%I
                    for each row execute function public.audit_trigger()', t);
  end loop;
end $$;

-- ---------------------------------------------------------------------
-- ROW LEVEL SECURITY
-- ---------------------------------------------------------------------
alter table public.branches                   enable row level security;
alter table public.departments                enable row level security;
alter table public.positions                  enable row level security;
alter table public.shifts                     enable row level security;
alter table public.holidays                   enable row level security;
alter table public.employees                  enable row level security;
alter table public.user_roles                 enable row level security;
alter table public.salary_components          enable row level security;
alter table public.employee_salary_components enable row level security;
alter table public.payroll_settings           enable row level security;
alter table public.pph21_ter_rates            enable row level security;
alter table public.attendances                enable row level security;
alter table public.leave_types                enable row level security;
alter table public.leave_balances             enable row level security;
alter table public.leave_requests             enable row level security;
alter table public.overtime_requests          enable row level security;
alter table public.payroll_periods            enable row level security;
alter table public.payslips                   enable row level security;
alter table public.payslip_items              enable row level security;
alter table public.job_postings               enable row level security;
alter table public.applicants                 enable row level security;
alter table public.audit_logs                 enable row level security;

-- Master data: semua user login boleh baca, HR yang kelola
do $$
declare t text;
begin
  foreach t in array array['branches','departments','positions','shifts','holidays',
                           'salary_components','leave_types','payroll_settings','pph21_ter_rates']
  loop
    execute format('create policy "read master" on public.%I for select to authenticated using (true)', t);
    execute format('create policy "hr manage master" on public.%I for all to authenticated
                    using (public.is_hr()) with check (public.is_hr())', t);
  end loop;
end $$;

-- Karyawan
create policy "view employees" on public.employees for select to authenticated
  using (public.can_view_employee(id));
create policy "hr manage employees" on public.employees for all to authenticated
  using (public.is_hr(branch_id)) with check (public.is_hr(branch_id));

-- Role
create policy "view own role" on public.user_roles for select to authenticated
  using (user_id = auth.uid() or public.current_app_role() = 'admin');
create policy "admin manage roles" on public.user_roles for all to authenticated
  using (public.current_app_role() = 'admin') with check (public.current_app_role() = 'admin');

-- Komponen gaji per karyawan: karyawan lihat miliknya, HR kelola
create policy "view salary components" on public.employee_salary_components for select to authenticated
  using (employee_id = public.current_employee_id() or public.is_hr(public.employee_branch(employee_id)));
create policy "hr manage salary components" on public.employee_salary_components for all to authenticated
  using (public.is_hr(public.employee_branch(employee_id)))
  with check (public.is_hr(public.employee_branch(employee_id)));

-- Absensi: insert/update karyawan HANYA lewat clock_in/clock_out; HR boleh koreksi
create policy "view attendances" on public.attendances for select to authenticated
  using (public.can_view_employee(employee_id));
create policy "hr manage attendances" on public.attendances for all to authenticated
  using (public.is_hr(branch_id)) with check (public.is_hr(branch_id));

-- Cuti
create policy "view leave balances" on public.leave_balances for select to authenticated
  using (public.can_view_employee(employee_id));
create policy "hr manage leave balances" on public.leave_balances for all to authenticated
  using (public.is_hr(public.employee_branch(employee_id)))
  with check (public.is_hr(public.employee_branch(employee_id)));

create policy "view leave requests" on public.leave_requests for select to authenticated
  using (public.can_view_employee(employee_id));
create policy "create own leave request" on public.leave_requests for insert to authenticated
  with check (employee_id = public.current_employee_id());
create policy "cancel own pending leave" on public.leave_requests for update to authenticated
  using (employee_id = public.current_employee_id() and status = 'pending')
  with check (employee_id = public.current_employee_id() and status = 'cancelled');

-- Lembur
create policy "view overtime" on public.overtime_requests for select to authenticated
  using (public.can_view_employee(employee_id));
create policy "create own overtime" on public.overtime_requests for insert to authenticated
  with check (employee_id = public.current_employee_id() and status = 'pending');

-- Payroll: HR kelola; karyawan hanya lihat slip miliknya yang sudah final
create policy "hr manage payroll periods" on public.payroll_periods for all to authenticated
  using (public.is_hr(branch_id)) with check (public.is_hr(branch_id));
create policy "view finalized periods" on public.payroll_periods for select to authenticated
  using (status in ('finalized','paid'));

create policy "hr manage payslips" on public.payslips for all to authenticated
  using (public.is_hr(branch_id)) with check (public.is_hr(branch_id));
create policy "view own payslip" on public.payslips for select to authenticated
  using (employee_id = public.current_employee_id()
         and exists (select 1 from public.payroll_periods p
                     where p.id = period_id and p.status in ('finalized','paid')));

create policy "view payslip items" on public.payslip_items for select to authenticated
  using (exists (select 1 from public.payslips s where s.id = payslip_id));  -- ikut RLS payslips
create policy "hr manage payslip items" on public.payslip_items for all to authenticated
  using (exists (select 1 from public.payslips s where s.id = payslip_id and public.is_hr(s.branch_id)))
  with check (exists (select 1 from public.payslips s where s.id = payslip_id and public.is_hr(s.branch_id)));

-- Rekrutmen: lowongan open bisa dilihat publik (halaman karier); pengelolaan oleh HR
create policy "public open jobs" on public.job_postings for select to anon, authenticated
  using (status = 'open' or public.is_hr(branch_id));
create policy "hr manage jobs" on public.job_postings for all to authenticated
  using (public.is_hr(branch_id)) with check (public.is_hr(branch_id));
create policy "hr manage applicants" on public.applicants for all to authenticated
  using (public.is_hr((select branch_id from public.job_postings j where j.id = job_posting_id)))
  with check (public.is_hr((select branch_id from public.job_postings j where j.id = job_posting_id)));

-- Audit: hanya admin/HR
create policy "hr view audit" on public.audit_logs for select to authenticated
  using (public.is_hr());

-- Hak akses tabel (RLS di atas tetap membatasi baris mana yang boleh disentuh)
grant usage on schema public to anon, authenticated;
grant select, insert, update, delete on all tables in schema public to authenticated;
grant usage, select on all sequences in schema public to authenticated;
revoke insert, update, delete on public.audit_logs from authenticated;
grant select on public.job_postings to anon;

-- Fungsi yang boleh dipanggil client
revoke execute on function public.clock_in(double precision, double precision, text, double precision) from public, anon;
revoke execute on function public.clock_out(double precision, double precision, text) from public, anon;
revoke execute on function public.decide_leave(uuid, boolean, text) from public, anon;
grant  execute on function public.clock_in(double precision, double precision, text, double precision) to authenticated;
grant  execute on function public.clock_out(double precision, double precision, text) to authenticated;
grant  execute on function public.decide_leave(uuid, boolean, text) to authenticated;

-- ---------------------------------------------------------------------
-- STORAGE BUCKETS (privat). Path file: <auth.uid()>/<nama-file>
-- ---------------------------------------------------------------------
insert into storage.buckets (id, name, public) values
  ('attendance-photos', 'attendance-photos', false),
  ('employee-documents', 'employee-documents', false),
  ('applicant-cvs', 'applicant-cvs', false)
on conflict (id) do nothing;

create policy "upload own attendance photo" on storage.objects for insert to authenticated
  with check (bucket_id = 'attendance-photos' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "view attendance photos" on storage.objects for select to authenticated
  using (bucket_id = 'attendance-photos'
         and ((storage.foldername(name))[1] = auth.uid()::text or public.is_hr()));

create policy "upload own documents" on storage.objects for insert to authenticated
  with check (bucket_id = 'employee-documents'
              and ((storage.foldername(name))[1] = auth.uid()::text or public.is_hr()));
create policy "view own documents" on storage.objects for select to authenticated
  using (bucket_id = 'employee-documents'
         and ((storage.foldername(name))[1] = auth.uid()::text or public.is_hr()));

create policy "hr manage cvs" on storage.objects for all to authenticated
  using (bucket_id = 'applicant-cvs' and public.is_hr())
  with check (bucket_id = 'applicant-cvs' and public.is_hr());
