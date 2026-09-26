-- Gapless document numbering (FR-ORD-024). The UPDATE takes a row lock on the series row, so concurrent callers
-- queue behind each other; if the calling transaction rolls back, the increment rolls back too and the number is
-- reused — no gaps, no duplicates. Call it in the SAME transaction that inserts the invoice / credit note.
--   select next_series_number('invoice')           -> 1, 2, 3 …
--   select format_series_number('invoice', 1)     -> 'INV-000001'

create or replace function next_series_number(series_key text) returns integer
language plpgsql as $$
declare
  allocated integer;
begin
  update number_series
     set next_value = next_value + 1, updated_at = now()
   where key = series_key
  returning next_value - 1 into allocated;
  if allocated is null then
    raise exception 'unknown number series: %', series_key using errcode = 'no_data_found';
  end if;
  return allocated;
end
$$;

create or replace function format_series_number(series_key text, value integer) returns text
language sql stable as $$
  select s.prefix || lpad(value::text, s.pad_to, '0') from number_series s where s.key = series_key
$$;
