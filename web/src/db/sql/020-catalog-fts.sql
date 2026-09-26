-- Catalogue full-text search (FR-SRC-001): literal matching in Arabic and English, no external service.
-- `simple` config (no stemming, no stop words) over an Arabic-normalised text:
--   * tashkeel U+064B..U+065F, superscript alef U+0670 and tatweel U+0640 removed (via chr() to keep the file ASCII-safe)
--   * alef forms (أ إ آ ٱ) → ا, ى → ي, ة → ه, ؤ → و, ئ → ي
-- Query side MUST use the same normaliser:
--   where p.search @@ plainto_tsquery('simple', catalog_search_normalize($1))
-- The GIN index `products_search_gin` is declared in the Drizzle schema.

-- Keep the two translate() strings aligned character by character:
--   أ→ا إ→ا آ→ا ٱ→ا ى→ي ة→ه ؤ→و ئ→ي
create or replace function catalog_search_normalize(input text) returns text
language sql immutable parallel safe as $$
  select lower(
    translate(
      regexp_replace(coalesce(input, ''), '[' || chr(1611) || '-' || chr(1631) || chr(1648) || chr(1600) || ']', '', 'g'),
      'أإآٱىةؤئ',
      'اااايهوي'
    )
  )
$$;

create or replace function catalog_products_search_update() returns trigger
language plpgsql as $$
begin
  new.search :=
    setweight(to_tsvector('simple', catalog_search_normalize(coalesce(new.name_ar, '') || ' ' || coalesce(new.name_en, ''))), 'A')
    || setweight(to_tsvector('simple', catalog_search_normalize(array_to_string(coalesce(new.tags, '{}'::text[]), ' '))), 'B')
    || setweight(to_tsvector('simple', catalog_search_normalize(coalesce(new.description_ar, '') || ' ' || coalesce(new.description_en, ''))), 'C');
  return new;
end
$$;

drop trigger if exists products_search_tg on products;
create trigger products_search_tg
  before insert or update of name_ar, name_en, description_ar, description_en, tags on products
  for each row execute function catalog_products_search_update();

-- Backfill rows written before the trigger existed (no-op on an empty table).
update products set name_ar = name_ar where search is null;
