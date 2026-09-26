-- Append-only ledgers (FR-DAT-006, FR-DAT-008). UPDATE and DELETE are refused row by row, TRUNCATE per statement.
--
-- Escapes (all transaction-local, set with set_config(..., true) = SET LOCAL):
--   dardachat.erasure   = 'on'  → UPDATE allowed (personal-data erasure rewrites a row in place). DELETE is still
--                                  refused. Use `withErasure(db, fn)` from src/db/guards.ts, never set it by hand.
--   dardachat.test_reset = 'on' → TRUNCATE allowed. Only `truncateAll()` in src/db/test-utils.ts sets it.
--   (db:reset drops the whole schema, which triggers do not see.)
--
-- Trigger arguments = columns that MAY change outside erasure: invoices/credit_notes keep their e-invoice fields
-- (submission_reference, clearance_status) updatable (FR-ORD-018..020); every other column must stay identical.
--
-- A refusal raises SQLSTATE 'DCA01' with constraint name '<table>_append_only' (so callers can match on
-- error.cause.constraint_name, like any other constraint).

create or replace function dardachat_append_only() returns trigger
language plpgsql as $$
declare
  mutable_cols text[] := coalesce(tg_argv, array[]::text[]);
begin
  if tg_op = 'TRUNCATE' then
    if coalesce(current_setting('dardachat.test_reset', true), '') = 'on' then
      return null;
    end if;
    raise exception 'append-only table %: TRUNCATE refused', tg_table_name
      using errcode = 'DCA01', constraint = tg_table_name || '_append_only';
  end if;

  if tg_op = 'DELETE' then
    raise exception 'append-only table %: DELETE refused', tg_table_name
      using errcode = 'DCA01', constraint = tg_table_name || '_append_only';
  end if;

  -- UPDATE
  if coalesce(current_setting('dardachat.erasure', true), '') = 'on' then
    return new;
  end if;
  if array_length(mutable_cols, 1) is not null
     and (to_jsonb(old) - mutable_cols) = (to_jsonb(new) - mutable_cols) then
    return new;
  end if;
  raise exception 'append-only table %: UPDATE refused', tg_table_name
    using errcode = 'DCA01', constraint = tg_table_name || '_append_only',
          hint = case when array_length(mutable_cols, 1) is not null
                      then 'only these columns may change: ' || array_to_string(mutable_cols, ', ')
                      else 'append a new row instead' end;
end
$$;

do $$
declare
  t record;
begin
  for t in
    select * from (values
      ('order_events', array[]::text[]),
      ('payments', array[]::text[]),
      ('stock_movements', array[]::text[]),
      ('audit_entries', array[]::text[]),
      ('invoices', array['submission_reference', 'clearance_status']),
      ('credit_notes', array['submission_reference', 'clearance_status']),
      ('cash_remittances', array[]::text[]),
      ('remittance_allocations', array[]::text[])
    ) as v(tbl, cols)
  loop
    execute format('drop trigger if exists %I on %I', t.tbl || '_append_only', t.tbl);
    execute format('drop trigger if exists %I on %I', t.tbl || '_append_only_truncate', t.tbl);
    execute format(
      'create trigger %I before update or delete on %I for each row execute function dardachat_append_only(%s)',
      t.tbl || '_append_only', t.tbl,
      coalesce((select string_agg(quote_literal(c), ', ') from unnest(t.cols) c), ''));
    execute format(
      'create trigger %I before truncate on %I for each statement execute function dardachat_append_only()',
      t.tbl || '_append_only_truncate', t.tbl);
  end loop;
end
$$;
