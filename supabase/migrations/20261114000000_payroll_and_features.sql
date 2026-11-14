-- =====================================================================
-- Fitur lanjutan: pembatalan cuti, approval lembur, penyesuaian gaji,
-- perhitungan payroll (BPJS + PPh 21 TER / Pasal 17 Desember),
-- ringkasan dashboard & rekap laporan.
-- =====================================================================

-- ---------------------------------------------------------------------
-- CUTI: pembatalan lewat fungsi (bukan UPDATE langsung)
-- ---------------------------------------------------------------------
drop policy if exists "cancel own pending leave" on public.leave_requests;

create or replace function public.cancel_leave(p_request_id uuid)
returns public.leave_requests
language plpgsql security definer set search_path = public as $$
declare v_req public.leave_requests;
begin
  update public.leave_requests
     set status = 'cancelled'
   where id = p_request_id
     and employee_id = public.current_employee_id()
     and status in ('pending', 'approved_supervisor')
  returning * into v_req;
  if not found then raise exception 'Pengajuan tidak bisa dibatalkan'; end if;
  return v_req;
end $$;

-- ---------------------------------------------------------------------
-- LEMBUR: set atasan saat pengajuan + approval 2 tahap
-- ---------------------------------------------------------------------
create or replace function public.overtime_before_insert()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  new.status := 'pending';
  new.supervisor_id := (select supervisor_id from public.employees where id = new.employee_id);
  if new.work_date < current_date - 30 then
    raise exception 'Pengajuan lembur maksimal 30 hari ke belakang';
  end if;
  return new;
end $$;

create trigger overtime_before_insert
before insert on public.overtime_requests
for each row execute function public.overtime_before_insert();

create or replace function public.decide_overtime(p_request_id uuid, p_approve boolean, p_note text default null)
returns public.overtime_requests
language plpgsql security definer set search_path = public as $$
declare
  v_req    public.overtime_requests;
  v_me     uuid := public.current_employee_id();
  v_branch uuid;
begin
  select * into v_req from public.overtime_requests where id = p_request_id for update;
  if not found then raise exception 'Pengajuan tidak ditemukan'; end if;
  if v_req.employee_id = v_me then raise exception 'Tidak boleh menyetujui pengajuan sendiri'; end if;
  v_branch := public.employee_branch(v_req.employee_id);

  if v_req.status = 'pending' then
    if not (v_req.supervisor_id = v_me or (v_req.supervisor_id is null and public.is_hr(v_branch))) then
      raise exception 'Hanya atasan langsung yang dapat memproses tahap ini';
    end if;
    update public.overtime_requests
       set status = case when p_approve then 'approved_supervisor' else 'rejected' end::public.request_status,
           supervisor_decided_at = now(), note = coalesce(p_note, note)
     where id = p_request_id returning * into v_req;
  elsif v_req.status = 'approved_supervisor' then
    if not public.is_hr(v_branch) then raise exception 'Hanya HR yang dapat memproses tahap ini'; end if;
    update public.overtime_requests
       set status = case when p_approve then 'approved' else 'rejected' end::public.request_status,
           hr_id = v_me, hr_decided_at = now(), note = coalesce(p_note, note)
     where id = p_request_id returning * into v_req;
  else
    raise exception 'Pengajuan sudah final (%)', v_req.status;
  end if;
  return v_req;
end $$;

create or replace function public.cancel_overtime(p_request_id uuid)
returns public.overtime_requests
language plpgsql security definer set search_path = public as $$
declare v_req public.overtime_requests;
begin
  update public.overtime_requests set status = 'cancelled'
   where id = p_request_id and employee_id = public.current_employee_id()
     and status in ('pending', 'approved_supervisor')
  returning * into v_req;
  if not found then raise exception 'Pengajuan tidak bisa dibatalkan'; end if;
  return v_req;
end $$;

-- ---------------------------------------------------------------------
-- PENYESUAIAN GAJI per periode (bonus, kasbon, dll. yang tidak tetap)
-- ---------------------------------------------------------------------
create table public.payroll_adjustments (
  id           uuid primary key default gen_random_uuid(),
  period_id    uuid not null references public.payroll_periods(id) on delete cascade,
  employee_id  uuid not null references public.employees(id) on delete cascade,
  component_id uuid not null references public.salary_components(id),
  amount       numeric(14,2) not null check (amount > 0),
  note         text,
  created_at   timestamptz not null default now()
);
create index on public.payroll_adjustments (period_id);
alter table public.payroll_adjustments enable row level security;
create policy "hr manage adjustments" on public.payroll_adjustments for all to authenticated
  using (public.is_hr(public.employee_branch(employee_id)))
  with check (public.is_hr(public.employee_branch(employee_id)));
grant select, insert, update, delete on public.payroll_adjustments to authenticated;
create trigger audit after insert or update or delete on public.payroll_adjustments
  for each row execute function public.audit_trigger();

-- ---------------------------------------------------------------------
-- PAJAK: helper
-- ---------------------------------------------------------------------
create or replace function public.ter_category(p_ptkp text)
returns char(1) language sql immutable as $$
  select case
    when p_ptkp in ('TK/0','TK/1','K/0') then 'A'
    when p_ptkp in ('TK/2','TK/3','K/1','K/2') then 'B'
    else 'C' end
$$;

create or replace function public.ter_rate(p_category char(1), p_gross numeric)
returns numeric language sql stable as $$
  select coalesce((
    select rate from public.pph21_ter_rates
     where category = p_category and min_income <= ceil(p_gross)   -- "lebih dari X" s.d. "Y"
     order by min_income desc limit 1), 0)
$$;

-- PTKP setahun (PMK 101/2016): 54 jt + 4,5 jt (kawin) + 4,5 jt per tanggungan (maks 3)
create or replace function public.ptkp_amount(p_ptkp text)
returns numeric language sql immutable as $$
  select 54000000
       + case when p_ptkp like 'K/%' then 4500000 else 0 end
       + 4500000 * split_part(p_ptkp, '/', 2)::int
$$;

-- Tarif progresif Pasal 17 ayat (1) huruf a UU HPP
create or replace function public.pph17_annual(p_pkp numeric)
returns numeric language sql immutable as $$
  select round(
      least(greatest(p_pkp, 0), 60000000) * 0.05
    + least(greatest(p_pkp - 60000000, 0), 190000000) * 0.15
    + least(greatest(p_pkp - 250000000, 0), 250000000) * 0.25
    + least(greatest(p_pkp - 500000000, 0), 4500000000) * 0.30
    + greatest(p_pkp - 5000000000, 0) * 0.35)
$$;

create or replace function public.setting(p_key text)
returns numeric language sql stable as $$
  select coalesce((select value from public.payroll_settings where key = p_key), 0)
$$;

-- ---------------------------------------------------------------------
-- PAYROLL: generate slip gaji untuk 1 periode (hanya status draft)
-- ---------------------------------------------------------------------
create or replace function public.generate_payroll(p_period_id uuid)
returns integer
language plpgsql security definer set search_path = public as $$
declare
  v_period   public.payroll_periods;
  v_emp      record;
  v_slip_id  uuid;
  v_count    integer := 0;
  v_start    date;
  v_wdays    integer;
  v_present  integer;
  v_leave    integer;
  v_unpaid   integer;
  v_absent   integer;
  v_late     integer;
  v_ot_hours numeric;
  v_ot_pay   numeric;
  v_base     numeric;
  v_fixed    numeric;   -- tunjangan tetap
  v_wage     numeric;   -- upah = gaji pokok + tunjangan tetap (dasar BPJS & lembur)
  v_earn     numeric;
  v_taxable  numeric;
  v_ded      numeric;
  v_late_ded numeric;
  v_abs_ded  numeric;
  v_kes_e numeric; v_jht_e numeric; v_jp_e numeric;
  v_kes_c numeric; v_jht_c numeric; v_jp_c numeric; v_jkk_c numeric; v_jkm_c numeric;
  v_gross    numeric;
  v_cat      char(1);
  v_pph      numeric;
  v_month    integer;
  v_prev_gross numeric; v_prev_pph numeric; v_prev_pension numeric;
  v_annual_net numeric; v_pkp numeric;
  v_sort     smallint;
  r          record;
begin
  select * into v_period from public.payroll_periods where id = p_period_id for update;
  if not found then raise exception 'Periode tidak ditemukan'; end if;
  if not public.is_hr(v_period.branch_id) then raise exception 'Hanya HR yang dapat memproses payroll'; end if;
  if v_period.status <> 'draft' then raise exception 'Periode sudah difinalisasi'; end if;

  delete from public.payslips where period_id = p_period_id;
  v_month := extract(month from v_period.period_month);

  for v_emp in
    select e.*, p.name as position_name, p.base_salary as position_salary
      from public.employees e
      left join public.positions p on p.id = e.position_id
     where e.status = 'active'
       and e.join_date <= v_period.end_date
       and (v_period.branch_id is null or e.branch_id = v_period.branch_id)
       -- jangan dobel jika karyawan sudah punya slip di periode lain bulan yang sama
       and not exists (select 1 from public.payslips s join public.payroll_periods pp on pp.id = s.period_id
                        where s.employee_id = e.id and pp.period_month = v_period.period_month
                          and pp.id <> p_period_id)
  loop
    v_sort := 0;
    v_start := greatest(v_period.start_date, v_emp.join_date);
    v_base  := coalesce(v_emp.base_salary, v_emp.position_salary, 0);
    v_fixed := coalesce((select sum(esc.amount) from public.employee_salary_components esc
                          join public.salary_components sc on sc.id = esc.component_id
                         where esc.employee_id = v_emp.id and sc.type = 'earning' and sc.is_fixed), 0);
    v_wage := v_base + v_fixed;

    -- Rekap absensi
    v_wdays := (select count(*) from public.working_days(v_start, v_period.end_date, v_emp.branch_id));
    select count(*) filter (where a.status in ('present','late')),
           count(*) filter (where a.status in ('leave','sick')),
           coalesce(sum(a.late_minutes), 0)
      into v_present, v_leave, v_late
      from public.attendances a
     where a.employee_id = v_emp.id and a.work_date between v_start and v_period.end_date
       and a.work_date in (select public.working_days(v_start, v_period.end_date, v_emp.branch_id));

    v_unpaid := (select count(*) from public.leave_requests lr
                   join public.leave_types lt on lt.id = lr.leave_type_id
                   cross join lateral public.working_days(greatest(lr.start_date, v_start),
                                                          least(lr.end_date, v_period.end_date), v_emp.branch_id) d
                  where lr.employee_id = v_emp.id and lr.status = 'approved' and not lt.is_paid
                    and lr.start_date <= v_period.end_date and lr.end_date >= v_start);
    v_absent := greatest(v_wdays - v_present - v_leave, 0);

    -- Lembur disetujui (PP 35/2021): upah/jam = 1/173 upah sebulan
    v_ot_hours := 0; v_ot_pay := 0;
    for r in
      select o.work_date, o.hours,
             (extract(isodow from o.work_date) >= 6
              or exists (select 1 from public.holidays h where h.date = o.work_date
                          and (h.branch_id is null or h.branch_id = v_emp.branch_id))) as off_day
        from public.overtime_requests o
       where o.employee_id = v_emp.id and o.status = 'approved'
         and o.work_date between v_start and v_period.end_date
    loop
      v_ot_hours := v_ot_hours + r.hours;
      if r.off_day then
        -- hari libur (5 hari kerja): 8 jam pertama 2x, jam ke-9 3x, jam ke-10–11 4x
        v_ot_pay := v_ot_pay + (least(r.hours, 8) * 2
                                + least(greatest(r.hours - 8, 0), 1) * 3
                                + greatest(r.hours - 9, 0) * 4) * v_wage / setting('overtime_hourly_divisor');
      else
        -- hari kerja: jam pertama 1,5x, jam berikutnya 2x
        v_ot_pay := v_ot_pay + (least(r.hours, 1) * 1.5 + greatest(r.hours - 1, 0) * 2)
                               * v_wage / setting('overtime_hourly_divisor');
      end if;
    end loop;
    v_ot_pay := round(v_ot_pay);

    -- Potongan kehadiran
    v_late_ded := round(v_late * setting('late_deduction_per_minute'));
    v_abs_ded  := case when setting('absent_deduction_divisor') > 0
                       then round(v_base / setting('absent_deduction_divisor') * (v_absent + v_unpaid)) else 0 end;

    -- BPJS
    v_kes_e := round(least(v_wage, setting('bpjs_kes_wage_cap')) * setting('bpjs_kes_employee_rate'));
    v_kes_c := round(least(v_wage, setting('bpjs_kes_wage_cap')) * setting('bpjs_kes_company_rate'));
    v_jht_e := round(v_wage * setting('bpjs_jht_employee_rate'));
    v_jht_c := round(v_wage * setting('bpjs_jht_company_rate'));
    v_jp_e  := round(least(v_wage, setting('bpjs_jp_wage_cap')) * setting('bpjs_jp_employee_rate'));
    v_jp_c  := round(least(v_wage, setting('bpjs_jp_wage_cap')) * setting('bpjs_jp_company_rate'));
    v_jkk_c := round(v_wage * setting('bpjs_jkk_company_rate'));
    v_jkm_c := round(v_wage * setting('bpjs_jkm_company_rate'));

    insert into public.payslips (period_id, employee_id, branch_id, position_name, ptkp_status, ter_category,
                                 working_days, present_days, absent_days, leave_days, late_minutes, overtime_hours,
                                 base_salary)
    values (p_period_id, v_emp.id, v_emp.branch_id, v_emp.position_name, v_emp.ptkp_status,
            public.ter_category(v_emp.ptkp_status), v_wdays, v_present, v_absent, v_leave, v_late, v_ot_hours,
            v_base)
    returning id into v_slip_id;

    -- Item pendapatan
    insert into public.payslip_items (payslip_id, code, name, type, amount, sort_order)
    values (v_slip_id, 'GAPOK', 'Gaji Pokok', 'earning', v_base, 0);
    v_earn := v_base; v_taxable := v_base;

    for r in
      select sc.code, sc.name, sc.type, sc.is_taxable, esc.amount
        from public.employee_salary_components esc
        join public.salary_components sc on sc.id = esc.component_id
       where esc.employee_id = v_emp.id and sc.is_fixed
      union all
      select sc.code, sc.name || coalesce(' — ' || pa.note, ''), sc.type, sc.is_taxable, pa.amount
        from public.payroll_adjustments pa
        join public.salary_components sc on sc.id = pa.component_id
       where pa.period_id = p_period_id and pa.employee_id = v_emp.id
    loop
      v_sort := v_sort + 1;
      insert into public.payslip_items (payslip_id, code, name, type, amount, sort_order)
      values (v_slip_id, r.code, r.name, r.type, r.amount, v_sort);
      if r.type = 'earning' then
        v_earn := v_earn + r.amount;
        if r.is_taxable then v_taxable := v_taxable + r.amount; end if;
      end if;
    end loop;

    if v_ot_pay > 0 then
      insert into public.payslip_items (payslip_id, code, name, type, amount, sort_order)
      values (v_slip_id, 'LEMBUR', 'Upah Lembur (' || v_ot_hours || ' jam)', 'earning', v_ot_pay, 50);
      v_earn := v_earn + v_ot_pay; v_taxable := v_taxable + v_ot_pay;
    end if;

    -- Item potongan
    if v_late_ded > 0 then
      insert into public.payslip_items (payslip_id, code, name, type, amount, sort_order)
      values (v_slip_id, 'POT_TELAT', 'Potongan Keterlambatan (' || v_late || ' menit)', 'deduction', v_late_ded, 60);
    end if;
    if v_abs_ded > 0 then
      insert into public.payslip_items (payslip_id, code, name, type, amount, sort_order)
      values (v_slip_id, 'POT_ALPA', 'Potongan Tidak Hadir (' || (v_absent + v_unpaid) || ' hari)', 'deduction', v_abs_ded, 61);
    end if;
    insert into public.payslip_items (payslip_id, code, name, type, amount, sort_order, is_company_contribution) values
      (v_slip_id, 'BPJS_KES', 'BPJS Kesehatan (1%)', 'deduction', v_kes_e, 70, false),
      (v_slip_id, 'BPJS_JHT', 'BPJS JHT (2%)',       'deduction', v_jht_e, 71, false),
      (v_slip_id, 'BPJS_JP',  'BPJS JP (1%)',        'deduction', v_jp_e,  72, false),
      (v_slip_id, 'C_KES', 'BPJS Kesehatan — perusahaan', 'earning', v_kes_c, 90, true),
      (v_slip_id, 'C_JHT', 'BPJS JHT — perusahaan',       'earning', v_jht_c, 91, true),
      (v_slip_id, 'C_JP',  'BPJS JP — perusahaan',        'earning', v_jp_c,  92, true),
      (v_slip_id, 'C_JKK', 'BPJS JKK — perusahaan',       'earning', v_jkk_c, 93, true),
      (v_slip_id, 'C_JKM', 'BPJS JKM — perusahaan',       'earning', v_jkm_c, 94, true);

    v_ded := v_late_ded + v_abs_ded
           + coalesce((select sum(amount) from public.payslip_items
                        where payslip_id = v_slip_id and type = 'deduction'
                          and code not in ('POT_TELAT','POT_ALPA','BPJS_KES','BPJS_JHT','BPJS_JP')), 0);

    -- Penghasilan bruto untuk PPh 21: penghasilan kena pajak - potongan kehadiran
    -- + premi yang dibayar perusahaan (BPJS Kesehatan, JKK, JKM)
    v_gross := greatest(v_taxable - v_late_ded - v_abs_ded, 0) + v_kes_c + v_jkk_c + v_jkm_c;
    v_cat   := public.ter_category(v_emp.ptkp_status);

    if v_month < 12 then
      v_pph := round(v_gross * public.ter_rate(v_cat, v_gross) / 100);
    else
      -- Desember: hitung setahun dengan tarif Pasal 17, dikurangi PPh Jan–Nov
      select coalesce(sum(s.gross_taxable), 0), coalesce(sum(s.pph21), 0),
             coalesce(sum(i.amount), 0)
        into v_prev_gross, v_prev_pph, v_prev_pension
        from public.payslips s
        join public.payroll_periods pp on pp.id = s.period_id
        left join lateral (select sum(amount) amount from public.payslip_items
                            where payslip_id = s.id and code in ('BPJS_JHT','BPJS_JP')) i on true
       where s.employee_id = v_emp.id and pp.status in ('finalized','paid')
         and extract(year from pp.period_month) = extract(year from v_period.period_month)
         and pp.period_month < v_period.period_month;

      v_annual_net := (v_prev_gross + v_gross)
                      - least((v_prev_gross + v_gross) * 0.05, 6000000)       -- biaya jabatan
                      - (v_prev_pension + v_jht_e + v_jp_e);                  -- iuran JHT + JP karyawan
      v_pkp := floor(greatest(v_annual_net - public.ptkp_amount(v_emp.ptkp_status), 0) / 1000) * 1000;
      v_pph := public.pph17_annual(v_pkp) - v_prev_pph;   -- negatif = lebih potong, dikembalikan
    end if;

    if v_pph <> 0 then
      insert into public.payslip_items (payslip_id, code, name, type, amount, sort_order)
      values (v_slip_id, 'PPH21',
              case when v_month < 12 then 'PPh 21 (TER ' || v_cat || ' '
                                      || replace(trim(trailing '.' from trim(trailing '0' from public.ter_rate(v_cat, v_gross)::text)), '.', ',')
                                      || '%)'
                   else 'PPh 21 (Pasal 17, penyesuaian Desember)' end,
              'deduction', v_pph, 80);
    end if;

    update public.payslips
       set total_earnings   = v_earn,
           total_deductions = v_ded + v_kes_e + v_jht_e + v_jp_e + v_pph,
           gross_taxable    = v_gross,
           bpjs_employee    = v_kes_e + v_jht_e + v_jp_e,
           bpjs_company     = v_kes_c + v_jht_c + v_jp_c + v_jkk_c + v_jkm_c,
           pph21            = v_pph,
           net_salary       = v_earn - (v_ded + v_kes_e + v_jht_e + v_jp_e + v_pph)
     where id = v_slip_id;

    v_count := v_count + 1;
  end loop;

  return v_count;
end $$;

create or replace function public.set_payroll_status(p_period_id uuid, p_status public.payroll_status)
returns public.payroll_periods
language plpgsql security definer set search_path = public as $$
declare v_period public.payroll_periods;
begin
  select * into v_period from public.payroll_periods where id = p_period_id for update;
  if not found then raise exception 'Periode tidak ditemukan'; end if;
  if not public.is_hr(v_period.branch_id) then raise exception 'Hanya HR yang dapat memproses payroll'; end if;

  if p_status = 'finalized' and v_period.status = 'draft' then
    if not exists (select 1 from public.payslips where period_id = p_period_id) then
      raise exception 'Generate slip gaji terlebih dahulu';
    end if;
    update public.payroll_periods set status = 'finalized', finalized_at = now()
     where id = p_period_id returning * into v_period;
  elsif p_status = 'paid' and v_period.status = 'finalized' then
    update public.payroll_periods set status = 'paid', paid_at = now()
     where id = p_period_id returning * into v_period;
  elsif p_status = 'draft' and v_period.status = 'finalized' then
    update public.payroll_periods set status = 'draft', finalized_at = null
     where id = p_period_id returning * into v_period;
  else
    raise exception 'Perubahan status % → % tidak diizinkan', v_period.status, p_status;
  end if;
  return v_period;
end $$;

-- Slip/periode final tidak boleh diubah langsung
create or replace function public.lock_finalized_payslip()
returns trigger language plpgsql as $$
begin
  if exists (select 1 from public.payroll_periods
              where id = coalesce(old.period_id, new.period_id) and status <> 'draft') then
    raise exception 'Slip gaji pada periode yang sudah final tidak dapat diubah';
  end if;
  return coalesce(new, old);
end $$;
create trigger lock_finalized before update or delete on public.payslips
  for each row execute function public.lock_finalized_payslip();
create trigger lock_finalized before insert or update or delete on public.payroll_adjustments
  for each row execute function public.lock_finalized_payslip();

-- ---------------------------------------------------------------------
-- DASHBOARD (security invoker → mengikuti RLS user yang memanggil)
-- ---------------------------------------------------------------------
create or replace function public.dashboard_summary(p_branch_id uuid default null)
returns jsonb language sql stable security invoker set search_path = public as $$
  with emp as (
    select * from public.employees
     where status = 'active' and (p_branch_id is null or branch_id = p_branch_id)
  ),
  today as (
    select a.* from public.attendances a join emp e on e.id = a.employee_id
     where a.work_date = (now() at time zone 'Asia/Jakarta')::date
  ),
  trend as (
    select d::date as day,
           count(a.id) filter (where a.status in ('present','late')) as present,
           count(a.id) filter (where a.status = 'late') as late,
           count(a.id) filter (where a.status in ('leave','sick')) as leave
      from generate_series((now() at time zone 'Asia/Jakarta')::date - 13,
                           (now() at time zone 'Asia/Jakarta')::date, interval '1 day') d
      left join public.attendances a on a.work_date = d::date
                                    and a.employee_id in (select id from emp)
     group by d order by d
  ),
  last_payroll as (
    select pp.period_month, sum(s.net_salary) net, sum(s.total_earnings) gross, count(*) n
      from public.payroll_periods pp join public.payslips s on s.period_id = pp.id
     where (p_branch_id is null or s.branch_id = p_branch_id)
     group by pp.period_month order by pp.period_month desc limit 6
  )
  select jsonb_build_object(
    'total_employees', (select count(*) from emp),
    'present_today',   (select count(*) from today where status in ('present','late')),
    'late_today',      (select count(*) from today where status = 'late'),
    'leave_today',     (select count(*) from today where status in ('leave','sick')),
    'pending_leave',   (select count(*) from public.leave_requests lr join emp e on e.id = lr.employee_id
                         where lr.status in ('pending','approved_supervisor')),
    'pending_overtime',(select count(*) from public.overtime_requests o join emp e on e.id = o.employee_id
                         where o.status in ('pending','approved_supervisor')),
    'open_jobs',       (select count(*) from public.job_postings where status = 'open'
                         and (p_branch_id is null or branch_id = p_branch_id)),
    'trend', coalesce((select jsonb_agg(jsonb_build_object('day', day, 'present', present, 'late', late, 'leave', leave)) from trend), '[]'),
    'by_department', coalesce((select jsonb_agg(x order by x->>'count' desc) from (
        select jsonb_build_object('name', coalesce(d.name, 'Tanpa departemen'), 'count', count(*)) x
          from emp e left join public.departments d on d.id = e.department_id
         group by d.name) q), '[]'),
    'payroll', coalesce((select jsonb_agg(jsonb_build_object('month', period_month, 'net', net, 'gross', gross, 'count', n)
                                          order by period_month) from last_payroll), '[]')
  )
$$;

-- ---------------------------------------------------------------------
-- LAPORAN: rekap absensi per karyawan
-- ---------------------------------------------------------------------
create or replace function public.attendance_recap(p_start date, p_end date, p_branch_id uuid default null)
returns table (employee_id uuid, employee_no text, full_name text, branch_name text, department_name text,
               working_days bigint, present bigint, late bigint, late_minutes bigint,
               leave bigint, sick bigint, absent bigint, overtime_minutes bigint)
language sql stable security invoker set search_path = public as $$
  select e.id, e.employee_no, e.full_name, b.name, d.name,
         wd.n,
         count(a.id) filter (where a.status in ('present','late')),
         count(a.id) filter (where a.status = 'late'),
         coalesce(sum(a.late_minutes), 0),
         count(a.id) filter (where a.status = 'leave'),
         count(a.id) filter (where a.status = 'sick'),
         greatest(wd.n - count(a.id) filter (where a.status in ('present','late','leave','sick')), 0),
         coalesce(sum(a.overtime_minutes), 0)
    from public.employees e
    join public.branches b on b.id = e.branch_id
    left join public.departments d on d.id = e.department_id
    cross join lateral (select count(*) n from public.working_days(greatest(p_start, e.join_date),
                                                                   least(p_end, (now() at time zone 'Asia/Jakarta')::date),
                                                                   e.branch_id)) wd
    left join public.attendances a on a.employee_id = e.id and a.work_date between p_start and p_end
   where e.status = 'active' and (p_branch_id is null or e.branch_id = p_branch_id)
   group by e.id, b.name, d.name, wd.n
   order by e.full_name
$$;

-- ---------------------------------------------------------------------
-- HAK EKSEKUSI FUNGSI
-- ---------------------------------------------------------------------
do $$
declare f text;
begin
  foreach f in array array[
    'cancel_leave(uuid)', 'decide_overtime(uuid, boolean, text)', 'cancel_overtime(uuid)',
    'generate_payroll(uuid)', 'set_payroll_status(uuid, public.payroll_status)',
    'dashboard_summary(uuid)', 'attendance_recap(date, date, uuid)']
  loop
    execute format('revoke execute on function public.%s from public, anon', f);
    execute format('grant execute on function public.%s to authenticated', f);
  end loop;
end $$;

-- ---------------------------------------------------------------------
-- TARIF TER PPh 21 (Lampiran PP 58/2023) — tarif dalam persen
-- ---------------------------------------------------------------------
insert into public.pph21_ter_rates (category, min_income, max_income, rate)
select 'A', lo, lead(lo) over (order by lo) - 1, rate from (values
  (0,0),(5400001,0.25),(5650001,0.5),(5950001,0.75),(6300001,1),(6750001,1.25),(7500001,1.5),
  (8550001,1.75),(9650001,2),(10050001,2.25),(10350001,2.5),(10700001,3),(11050001,3.5),(11600001,4),
  (12500001,5),(13750001,6),(15100001,7),(16950001,8),(19750001,9),(24150001,10),(26450001,11),
  (28000001,12),(30050001,13),(32400001,14),(35400001,15),(39100001,16),(43850001,17),(47800001,18),
  (51400001,19),(56300001,20),(62200001,21),(68600001,22),(77500001,23),(89000001,24),(103000001,25),
  (125000001,26),(157000001,27),(206000001,28),(337000001,29),(454000001,30),(550000001,31),
  (695000001,32),(910000001,33),(1400000001,34)) t(lo, rate)
union all
select 'B', lo, lead(lo) over (order by lo) - 1, rate from (values
  (0,0),(6200001,0.25),(6500001,0.5),(6850001,0.75),(7300001,1),(9200001,1.5),(10750001,2),
  (11250001,2.5),(11600001,3),(12600001,4),(13600001,5),(14950001,6),(16400001,7),(18450001,8),
  (21850001,9),(26000001,10),(27700001,11),(29350001,12),(31450001,13),(33950001,14),(37100001,15),
  (41100001,16),(45800001,17),(49500001,18),(53800001,19),(58500001,20),(64000001,21),(71000001,22),
  (80000001,23),(93000001,24),(109000001,25),(129000001,26),(163000001,27),(211000001,28),
  (374000001,29),(459000001,30),(555000001,31),(704000001,32),(957000001,33),(1405000001,34)) t(lo, rate)
union all
select 'C', lo, lead(lo) over (order by lo) - 1, rate from (values
  (0,0),(6600001,0.25),(6950001,0.5),(7350001,0.75),(7800001,1),(8850001,1.25),(9800001,1.5),
  (10950001,1.75),(11200001,2),(12050001,3),(12950001,4),(14150001,5),(15550001,6),(17050001,7),
  (19500001,8),(22700001,9),(26600001,10),(28100001,11),(30100001,12),(32600001,13),(35400001,14),
  (38900001,15),(43000001,16),(47400001,17),(51200001,18),(55800001,19),(60400001,20),(66700001,21),
  (74500001,22),(83200001,23),(95600001,24),(110000001,25),(134000001,26),(169000001,27),
  (221000001,28),(390000001,29),(463000001,30),(561000001,31),(709000001,32),(965000001,33),
  (1419000001,34)) t(lo, rate);
