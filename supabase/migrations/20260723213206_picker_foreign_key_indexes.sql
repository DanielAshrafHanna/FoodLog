-- Cover picker foreign keys used by joins and cascading constraint checks.
create index if not exists decision_candidates_restaurant_idx
  on public.decision_candidates (restaurant_id);

create index if not exists decision_sessions_selected_restaurant_idx
  on public.decision_sessions (selected_restaurant_id)
  where selected_restaurant_id is not null;

create index if not exists decision_votes_restaurant_idx
  on public.decision_votes (restaurant_id);
