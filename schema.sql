-- ============================================================
-- Kas Keluarga — skema database
-- Aman dijalankan berulang kali (idempoten), baik di proyek Supabase
-- baru maupun yang sudah punya tabel `transaksi` lama: data lama tidak hilang.
-- Jalankan seluruh isi file ini di Supabase > SQL Editor.
-- ============================================================

-- 1. TABEL TRANSAKSI -----------------------------------------
create table if not exists transaksi (
  id uuid primary key default gen_random_uuid(),
  tanggal date not null default current_date,
  tipe text not null check (tipe in ('masuk','keluar')),
  jumlah bigint not null check (jumlah > 0),
  dari text,
  ke text,
  alasan text not null,
  bukti_path text,
  dibuat_pada timestamptz default now()
);
-- kolom tambahan (untuk database lama)
alter table transaksi add column if not exists kategori text;
alter table transaksi add column if not exists diubah_pada timestamptz;

create index if not exists transaksi_tanggal_idx on transaksi (tanggal desc, dibuat_pada desc);

-- 2. DAFTAR ADMIN --------------------------------------------
-- Hanya akun yang terdaftar di sini yang boleh menambah/ubah/hapus.
-- Jadi walau suatu saat ada akun lain terbuat, ia tetap tidak bisa mengubah data.
create table if not exists admins (
  user_id uuid primary key references auth.users (id) on delete cascade
);
alter table admins enable row level security;
drop policy if exists "admin lihat diri sendiri" on admins;
create policy "admin lihat diri sendiri" on admins
  for select to authenticated using (user_id = auth.uid());

create or replace function is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from admins where user_id = auth.uid());
$$;

-- 2b. ANGGOTA & IURAN ----------------------------------------
-- Daftar anggota yang membayar iuran. `iuran_bulanan` = nominal per bulan
-- (0 = tidak wajib iuran). `mulai_iuran` = bulan pertama ia ditagih, supaya
-- bulan sebelum itu tidak dihitung "belum bayar".
create table if not exists anggota (
  id uuid primary key default gen_random_uuid(),
  nama text not null check (length(trim(nama)) > 0),
  iuran_bulanan bigint not null default 0 check (iuran_bulanan >= 0),
  mulai_iuran date not null default date_trunc('month', now())::date,
  aktif boolean not null default true,
  catatan text,
  dibuat_pada timestamptz default now()
);
create unique index if not exists anggota_nama_unik on anggota (lower(nama));

-- Setiap pembayaran iuran ditandai: siapa (anggota_id) dan untuk bulan apa (periode).
alter table transaksi add column if not exists anggota_id uuid references anggota (id) on delete set null;
alter table transaksi add column if not exists periode date;
do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'transaksi_periode_awal_bulan') then
    alter table transaksi add constraint transaksi_periode_awal_bulan
      check (periode is null or periode = date_trunc('month', periode)::date);
  end if;
end $$;
create index if not exists transaksi_iuran_idx on transaksi (anggota_id, periode);

alter table anggota enable row level security;
drop policy if exists "semua boleh lihat anggota" on anggota;
drop policy if exists "bendahara tambah anggota" on anggota;
drop policy if exists "bendahara ubah anggota" on anggota;
drop policy if exists "bendahara hapus anggota" on anggota;
create policy "semua boleh lihat anggota" on anggota for select to anon, authenticated using (true);
create policy "bendahara tambah anggota" on anggota for insert to authenticated with check (is_admin());
create policy "bendahara ubah anggota" on anggota for update to authenticated using (is_admin()) with check (is_admin());
create policy "bendahara hapus anggota" on anggota for delete to authenticated using (is_admin());

-- 2c. PENGATURAN (info pembayaran untuk keluarga) --------------
-- Hanya satu baris (id = 1). Ditampilkan di halaman Info.
create table if not exists pengaturan (
  id int primary key default 1 check (id = 1),
  nama_kas text not null default 'Kas Keluarga',
  bank text,
  no_rekening text,
  atas_nama text,
  tanggal_jatuh_tempo int check (tanggal_jatuh_tempo between 1 and 28),
  info text,
  pengurus text
);
insert into pengaturan (id) values (1) on conflict do nothing;

alter table pengaturan enable row level security;
drop policy if exists "semua boleh lihat pengaturan" on pengaturan;
drop policy if exists "bendahara tambah pengaturan" on pengaturan;
drop policy if exists "bendahara ubah pengaturan" on pengaturan;
create policy "semua boleh lihat pengaturan" on pengaturan for select to anon, authenticated using (true);
create policy "bendahara tambah pengaturan" on pengaturan for insert to authenticated with check (is_admin());
create policy "bendahara ubah pengaturan" on pengaturan for update to authenticated using (is_admin()) with check (is_admin());

-- 3. KEAMANAN BARIS (RLS) ------------------------------------
alter table transaksi enable row level security;

drop policy if exists "semua boleh lihat" on transaksi;
drop policy if exists "bendahara tambah" on transaksi;
drop policy if exists "bendahara ubah" on transaksi;
drop policy if exists "bendahara hapus" on transaksi;

create policy "semua boleh lihat" on transaksi for select to anon, authenticated using (true);
create policy "bendahara tambah"  on transaksi for insert to authenticated with check (is_admin());
create policy "bendahara ubah"    on transaksi for update to authenticated using (is_admin()) with check (is_admin());
create policy "bendahara hapus"   on transaksi for delete to authenticated using (is_admin());

-- 4. RIWAYAT PERUBAHAN (audit log) ---------------------------
-- Setiap tambah/ubah/hapus tercatat otomatis dan TIDAK bisa diedit lewat API.
-- Keluarga bisa melihatnya di halaman /riwayat, sehingga semuanya transparan.
create table if not exists transaksi_log (
  id bigint generated always as identity primary key,
  waktu timestamptz not null default now(),
  aksi text not null check (aksi in ('tambah','ubah','hapus')),
  transaksi_id uuid not null,
  data_lama jsonb,
  data_baru jsonb
);
alter table transaksi_log enable row level security;
drop policy if exists "semua boleh lihat log" on transaksi_log;
create policy "semua boleh lihat log" on transaksi_log for select to anon, authenticated using (true);

create or replace function transaksi_cap_waktu() returns trigger
language plpgsql as $$
begin
  new.diubah_pada := now();
  return new;
end $$;

create or replace function transaksi_catat_log() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    insert into transaksi_log (aksi, transaksi_id, data_baru) values ('tambah', new.id, to_jsonb(new));
  elsif tg_op = 'UPDATE' then
    if to_jsonb(new) - 'diubah_pada' is distinct from to_jsonb(old) - 'diubah_pada' then
      insert into transaksi_log (aksi, transaksi_id, data_lama, data_baru)
      values ('ubah', new.id, to_jsonb(old), to_jsonb(new));
    end if;
  elsif tg_op = 'DELETE' then
    insert into transaksi_log (aksi, transaksi_id, data_lama) values ('hapus', old.id, to_jsonb(old));
  end if;
  return null;
end $$;

drop trigger if exists transaksi_cap_waktu_trg on transaksi;
create trigger transaksi_cap_waktu_trg before update on transaksi
  for each row execute function transaksi_cap_waktu();

drop trigger if exists transaksi_log_trg on transaksi;
create trigger transaksi_log_trg after insert or update or delete on transaksi
  for each row execute function transaksi_catat_log();

-- 5. RINGKASAN -----------------------------------------------
-- view hanya definisi query (tanpa data), jadi aman dibuang & dibuat ulang;
-- diperlukan karena view lama bertipe numeric dan Postgres tidak mengizinkan
-- "create or replace" mengubah tipe kolom.
drop view if exists ringkasan;
drop view if exists ringkasan_bulanan;

create view ringkasan with (security_invoker = true) as
select
  coalesce(sum(jumlah) filter (where tipe = 'masuk'), 0)::bigint as total_masuk,
  coalesce(sum(jumlah) filter (where tipe = 'keluar'), 0)::bigint as total_keluar,
  coalesce(sum(case when tipe = 'masuk' then jumlah else -jumlah end), 0)::bigint as saldo
from transaksi;

create view ringkasan_bulanan with (security_invoker = true) as
select
  date_trunc('month', tanggal)::date as bulan,
  coalesce(sum(jumlah) filter (where tipe = 'masuk'), 0)::bigint as masuk,
  coalesce(sum(jumlah) filter (where tipe = 'keluar'), 0)::bigint as keluar,
  count(*)::int as jumlah_catatan
from transaksi
group by 1;

-- 6. BUKTI TRANSFER (storage) --------------------------------
-- Bucket publik agar keluarga bisa membuka foto; hanya admin yang bisa
-- mengunggah/mengganti/menghapus. Dibatasi 5 MB dan hanya gambar.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('bukti', 'bukti', true, 5242880, array['image/jpeg','image/png','image/webp','image/heic'])
on conflict (id) do update set
  public = true,
  file_size_limit = 5242880,
  allowed_mime_types = array['image/jpeg','image/png','image/webp','image/heic'];

drop policy if exists "bendahara upload bukti" on storage.objects;
drop policy if exists "bendahara lihat bukti"  on storage.objects;
drop policy if exists "bendahara ubah bukti"   on storage.objects;
drop policy if exists "bendahara hapus bukti"  on storage.objects;

create policy "bendahara upload bukti" on storage.objects for insert to authenticated
  with check (bucket_id = 'bukti' and is_admin());
create policy "bendahara lihat bukti" on storage.objects for select to authenticated
  using (bucket_id = 'bukti' and is_admin());
create policy "bendahara ubah bukti" on storage.objects for update to authenticated
  using (bucket_id = 'bukti' and is_admin()) with check (bucket_id = 'bukti' and is_admin());
create policy "bendahara hapus bukti" on storage.objects for delete to authenticated
  using (bucket_id = 'bukti' and is_admin());

-- 7. DAFTARKAN AKUN BENDAHARA --------------------------------
-- WAJIB: ganti email di bawah dengan email akun bendahara (yang dibuat di
-- Authentication > Users), lalu jalankan. Tanpa langkah ini tidak ada yang
-- bisa menambah/mengubah catatan.
insert into admins (user_id)
select id from auth.users where email = 'GANTI-DENGAN-EMAIL-ANDA@gmail.com'
on conflict do nothing;
