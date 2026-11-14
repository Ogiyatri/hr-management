-- Supabase versi baru tidak lagi otomatis memberi hak tabel ke service_role.
-- service_role (SECRET key) dipakai server untuk: undang karyawan, lamaran
-- publik, dan signed URL lampiran. Key ini TIDAK PERNAH dikirim ke browser.
grant usage on schema public to service_role;
grant all on all tables in schema public to service_role;
grant all on all sequences in schema public to service_role;
grant execute on all functions in schema public to service_role;

alter default privileges in schema public grant all on tables to service_role;
alter default privileges in schema public grant all on sequences to service_role;
alter default privileges in schema public grant execute on functions to service_role;
