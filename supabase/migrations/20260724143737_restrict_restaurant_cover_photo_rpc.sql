-- Restrict cover-photo selection to signed-in editors at the API boundary.
-- The function also performs its own approved-editor and same-restaurant checks.
revoke execute on function public.set_restaurant_cover_photo(uuid, uuid)
from anon;

grant execute on function public.set_restaurant_cover_photo(uuid, uuid)
to authenticated;
