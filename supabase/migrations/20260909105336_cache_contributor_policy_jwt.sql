-- Cache the complete JWT before extracting email; preserve ownership predicates.

alter policy "Contributors and owner can update restaurants" on public.restaurants
using (
  (select public.is_approved_editor())
  and ((select public.is_foodlog_owner()) or user_id=(select auth.uid()))
  and (deleted_at is null or (select public.is_foodlog_owner())
    or lower(deleted_by)=lower(coalesce((select auth.jwt())->>'email','')))
);

alter policy "Contributors and owner can update dishes" on public.dishes
using (
  (select public.is_approved_editor())
  and ((select public.is_foodlog_owner()) or user_id=(select auth.uid()))
  and (deleted_at is null or (select public.is_foodlog_owner())
    or lower(deleted_by)=lower(coalesce((select auth.jwt())->>'email','')))
);

alter policy "Contributors and owner can update restaurant photos" on public.restaurant_photos
using (
  (select public.is_approved_editor())
  and ((select public.is_foodlog_owner()) or user_id=(select auth.uid()))
  and (deleted_at is null or (select public.is_foodlog_owner())
    or lower(deleted_by)=lower(coalesce((select auth.jwt())->>'email','')))
);
