create table public.images (
  id uuid default gen_random_uuid() primary key,
  url text not null,
  caption text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Set up Storage bucket
insert into storage.buckets (id, name, public) values ('poland-photos', 'poland-photos', true);

-- Set up Storage policy to allow public access to files
create policy "Public Access"
  on storage.objects for select
  using ( bucket_id = 'poland-photos' );

-- Set up Storage policy to allow authenticated uploads
create policy "Authenticated uploads"
  on storage.objects for insert
  with check ( bucket_id = 'poland-photos' ); 