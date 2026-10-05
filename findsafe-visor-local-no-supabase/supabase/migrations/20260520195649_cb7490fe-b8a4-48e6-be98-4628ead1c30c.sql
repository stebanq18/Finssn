
create table public.scans (
  id uuid primary key default gen_random_uuid(),
  source_key text not null unique,
  uploaded_at timestamptz not null default now(),
  total_matches integer not null default 0,
  risk_level text not null check (risk_level in ('bajo','medio','alto','critico')),
  html_filename text not null,
  txt_filename text not null
);

create table public.scan_files (
  id uuid primary key default gen_random_uuid(),
  scan_id uuid not null references public.scans(id) on delete cascade,
  file_path text not null,
  file_extension text,
  match_count integer not null default 0,
  risk_level text not null check (risk_level in ('bajo','medio','alto','critico'))
);

create table public.scan_evidences (
  id uuid primary key default gen_random_uuid(),
  scan_file_id uuid not null references public.scan_files(id) on delete cascade,
  masked_value text not null,
  data_type text not null check (data_type in ('card','ssn','otro'))
);

create index scan_files_scan_id_idx on public.scan_files(scan_id);
create index scan_files_match_count_idx on public.scan_files(match_count desc);
create index scan_evidences_scan_file_id_idx on public.scan_evidences(scan_file_id);

alter table public.scans enable row level security;
alter table public.scan_files enable row level security;
alter table public.scan_evidences enable row level security;

-- Portal interno sin auth: acceso público a las 3 tablas
create policy "public read scans" on public.scans for select using (true);
create policy "public insert scans" on public.scans for insert with check (true);
create policy "public delete scans" on public.scans for delete using (true);

create policy "public read scan_files" on public.scan_files for select using (true);
create policy "public insert scan_files" on public.scan_files for insert with check (true);
create policy "public delete scan_files" on public.scan_files for delete using (true);

create policy "public read scan_evidences" on public.scan_evidences for select using (true);
create policy "public insert scan_evidences" on public.scan_evidences for insert with check (true);
create policy "public delete scan_evidences" on public.scan_evidences for delete using (true);
