-- Kurzlebige, ausdrücklich unbestätigte Beobachtungen an Wegen.
create table if not exists public.way_reports (
  id uuid primary key default gen_random_uuid(),
  latitude double precision not null check (latitude between 54.68 and 54.95),
  longitude double precision not null check (longitude between 9.27 and 9.87),
  kind text not null check (kind in ('blocked', 'construction', 'surface', 'flooding', 'other')),
  mode text not null check (mode in ('walk', 'stroller', 'bike', 'wheelchair', 'all')),
  description text not null check (length(description) between 8 and 280),
  photo_data text check (
    photo_data is null or
    (length(photo_data) <= 140000 and photo_data ~ '^data:image/jpeg;base64,[A-Za-z0-9+/=]+$')
  ),
  status text not null default 'active' check (status in ('active', 'hidden')),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '48 hours',
  constraint way_report_expiry check (expires_at = created_at + interval '48 hours')
);

create index if not exists way_reports_active_at on public.way_reports (expires_at desc)
  where status = 'active';

alter table public.way_reports enable row level security;
revoke all on public.way_reports from anon, authenticated;
grant select, insert on public.way_reports to anon, authenticated;
create policy "Anyone can read current public observations" on public.way_reports
  for select to anon, authenticated
  using (status = 'active' and expires_at > now());
create policy "Anyone can submit a short local observation" on public.way_reports
  for insert to anon, authenticated
  with check (status = 'active' and created_at between now() - interval '1 minute' and now() + interval '1 minute');

create table if not exists public.way_report_votes (
  id uuid primary key default gen_random_uuid(),
  report_id uuid not null references public.way_reports (id) on delete cascade,
  viewer_id uuid not null,
  verdict text not null check (verdict in ('still', 'clear')),
  created_at timestamptz not null default now(),
  unique (report_id, viewer_id)
);
create index if not exists way_report_votes_report_id on public.way_report_votes (report_id);
alter table public.way_report_votes enable row level security;
revoke all on public.way_report_votes from anon, authenticated;
grant select, insert on public.way_report_votes to anon, authenticated;
create policy "Anyone can read public confirmations" on public.way_report_votes
  for select to anon, authenticated using (
    exists (select 1 from public.way_reports r where r.id = report_id and r.status = 'active' and r.expires_at > now())
  );
create policy "Anyone can confirm a current observation" on public.way_report_votes
  for insert to anon, authenticated with check (
    created_at between now() - interval '1 minute' and now() + interval '1 minute'
    and exists (select 1 from public.way_reports r where r.id = report_id and r.status = 'active' and r.expires_at > now())
  );

-- Fotos und Meldungen nach dem sichtbaren Zeitfenster endgültig entfernen.
select cron.schedule('foerde_wege_cleanup', '17 * * * *',
  $$delete from public.way_reports where expires_at < now()$$);
