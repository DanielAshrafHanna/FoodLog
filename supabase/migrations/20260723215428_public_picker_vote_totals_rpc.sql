-- Public Picker totals without exposing individual voter identities.
-- The function bypasses row-level access only to return three aggregate fields.
create or replace function public.get_decision_vote_totals()
returns table (
  session_id uuid,
  restaurant_id uuid,
  vote_count integer
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    votes.session_id,
    votes.restaurant_id,
    count(*)::integer as vote_count
  from public.decision_votes as votes
  where votes.deleted_at is null
  group by votes.session_id, votes.restaurant_id;
$$;

revoke all on function public.get_decision_vote_totals() from public;
grant execute on function public.get_decision_vote_totals() to anon, authenticated;
