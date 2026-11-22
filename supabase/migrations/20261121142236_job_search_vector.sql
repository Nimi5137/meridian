alter table public.jobs add column title_company_location tsvector generated always as (to_tsvector('simple', title || ' ' || company || ' ' || location)) stored;
create index jobs_search_vector_idx on public.jobs using gin(title_company_location);
