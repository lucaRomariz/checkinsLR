
insert into storage.buckets (id, name, public)
values ('checkin-images', 'checkin-images', true)
on conflict (id) do nothing;

create policy "checkin_images_public_read"
on storage.objects for select
using (bucket_id = 'checkin-images');

create policy "checkin_images_auth_upload"
on storage.objects for insert
to authenticated
with check (bucket_id = 'checkin-images');

create policy "checkin_images_owner_delete"
on storage.objects for delete
to authenticated
using (bucket_id = 'checkin-images' and owner = auth.uid());

