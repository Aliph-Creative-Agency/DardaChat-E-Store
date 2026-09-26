-- Mutable-row journal (FR-DAT-006): every UPDATE on a journalled table writes ONE audit_entries row
--   action 'row.update', target_type = table name, target_id = row id,
--   before/after = only the columns that changed (old and new values),
--   actor from the transaction-local settings dardachat.actor_type / dardachat.actor_id (set with `withActor` in
--   src/db/guards.ts); no actor set → actor_type 'system', actor_id null.
--
-- Trigger arguments tune a table:
--   'ignore:<col>' — changes to this column alone are not journalled and it is left out of before/after
--                    (updated_at everywhere; bookkeeping such as last_login_at);
--   'redact:<col>' — the change is journalled but values are replaced by '[redacted]' (secrets such as password_hash).
--
-- Erasure (dardachat.erasure = 'on', see 010-append-only.sql): action 'row.erase', before = null and
-- after = {"columns": [...changed column names...]} — the journal must not copy the personal data being erased.
-- Past journal rows that hold that person's data are rewritten by the erasure job itself (allowed under erasure).

create or replace function dardachat_journal() returns trigger
language plpgsql as $$
declare
  ignored text[] := array['updated_at'];
  redacted text[] := array[]::text[];
  arg text;
  old_j jsonb := to_jsonb(old);
  new_j jsonb := to_jsonb(new);
  changed text[];
  before_j jsonb;
  after_j jsonb;
  actor_type_s text := coalesce(nullif(current_setting('dardachat.actor_type', true), ''), 'system');
  actor_id_s text := nullif(current_setting('dardachat.actor_id', true), '');
begin
  if tg_nargs > 0 then
    foreach arg in array tg_argv loop
      if arg like 'ignore:%' then
        ignored := ignored || substr(arg, 8);
      elsif arg like 'redact:%' then
        redacted := redacted || substr(arg, 8);
      end if;
    end loop;
  end if;

  select coalesce(array_agg(k order by k), array[]::text[]) into changed
    from jsonb_object_keys(new_j) as k
   where k <> all(ignored) and (old_j -> k) is distinct from (new_j -> k);

  if array_length(changed, 1) is null then
    return null;
  end if;

  if actor_type_s not in ('staff', 'customer', 'system') then
    actor_type_s := 'system';
  end if;

  if coalesce(current_setting('dardachat.erasure', true), '') = 'on' then
    insert into audit_entries (actor_type, actor_id, action, target_type, target_id, before, after)
    values (actor_type_s::core_actor_type, actor_id_s::uuid, 'row.erase', tg_table_name, new_j ->> 'id', null,
            jsonb_build_object('columns', to_jsonb(changed)));
    return null;
  end if;

  select jsonb_object_agg(k, case when k = any(redacted) then to_jsonb('[redacted]'::text) else old_j -> k end),
         jsonb_object_agg(k, case when k = any(redacted) then to_jsonb('[redacted]'::text) else new_j -> k end)
    into before_j, after_j
    from unnest(changed) as k;

  insert into audit_entries (actor_type, actor_id, action, target_type, target_id, before, after)
  values (actor_type_s::core_actor_type, actor_id_s::uuid, 'row.update', tg_table_name, new_j ->> 'id',
          before_j, after_j);
  return null;
end
$$;

do $$
declare
  t record;
begin
  for t in
    select * from (values
      ('orders', array[]::text[]),
      ('order_lines', array[]::text[]),
      ('customers', array['ignore:last_login_at', 'redact:password_hash']),
      ('addresses', array[]::text[]),
      ('variants', array[]::text[])
    ) as v(tbl, args)
  loop
    execute format('drop trigger if exists %I on %I', t.tbl || '_journal', t.tbl);
    execute format(
      'create trigger %I after update on %I for each row execute function dardachat_journal(%s)',
      t.tbl || '_journal', t.tbl,
      coalesce((select string_agg(quote_literal(a), ', ') from unnest(t.args) a), ''));
  end loop;
end
$$;
