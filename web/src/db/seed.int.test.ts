import { verify } from "@node-rs/argon2";
import { sql } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { runSeed } from "./seed";
import { staffUsers } from "./schema";
import { createTestDb, testDatabaseUrl, truncateAll } from "./test-utils";

const { db, close } = createTestDb();
const staff = {
  owner: { email: "Owner@Seed.test", password: "owner-test-password" },
  staff: { email: "staff@seed.test", password: "staff-test-password" },
};

async function counts() {
  const [row] = await db.execute<Record<string, number>>(sql`
    select
      (select count(*)::int from staff_users) as users,
      (select count(*)::int from roles) as roles,
      (select count(*)::int from user_roles) as user_roles,
      (select count(*)::int from locations where is_origin) as origins,
      (select count(*)::int from delivery_zones) as zones,
      (select count(*)::int from delivery_zones where is_active) as active_zones,
      (select count(*)::int from vat_rates) as vat_rates,
      (select count(*)::int from number_series) as series,
      (select count(*)::int from retention_settings) as retention,
      (select count(*)::int from settings) as settings,
      (select count(*)::int from products) as products,
      (select count(*)::int from stock_movements) as movements,
      (select count(*)::int from faq_entries) as faq,
      (select count(*)::int from collection_products) as collection_members`);
  return row!;
}

beforeAll(() => truncateAll(db));
afterAll(() => close());

describe("seed runner (PLA-17)", () => {
  it("seeds reference data and is idempotent", async () => {
    await runSeed(testDatabaseUrl(), { staff });
    const first = await counts();
    expect(first).toMatchObject({
      users: 2,
      roles: 2,
      user_roles: 2,
      origins: 2,
      zones: 16,
      active_zones: 11,
      vat_rates: 1,
      series: 2,
    });
    expect(first.retention).toBeGreaterThanOrEqual(2);
    expect(first.settings).toBeGreaterThanOrEqual(3);

    await runSeed(testDatabaseUrl(), { staff });
    expect(await counts()).toEqual(first);
  });

  it("stores argon2id hashes (never plaintext) and lower-cased emails", async () => {
    const users = await db.select().from(staffUsers);
    const owner = users.find((u) => u.email === "owner@seed.test");
    expect(owner).toBeDefined();
    expect(owner!.passwordHash.startsWith("$argon2id$")).toBe(true);
    expect(await verify(owner!.passwordHash, staff.owner.password)).toBe(true);
    expect(JSON.stringify(users)).not.toContain(staff.staff.password);
  });

  it("seeds the placeholder catalogue, stock ledger and content (PLA-18)", async () => {
    const [row] = await db.execute<Record<string, number>>(sql`
      select
        (select count(*)::int from products where status = 'published' and published_at is not null) as published,
        (select count(distinct product_id)::int from seasonal_windows) as seasonal,
        (select count(*)::int from variants) as variants,
        (select count(*)::int from stock_levels) as stock_rows,
        (select count(*)::int from media_assets where alt_ar is not null and alt_en is not null) as media,
        (select count(*)::int from product_components) >= 5 as has_components,
        (select count(*)::int from collection_products) as collection_members,
        (select count(*)::int from suppliers) as suppliers,
        (select count(*)::int from policies where version = 'v1') as policies,
        (select count(*)::int from faq_entries) as faq,
        (select count(*)::int from static_pages where slug = 'about' and status = 'published') as about`);
    expect(row).toMatchObject({
      published: 5,
      seasonal: 2,
      variants: 5,
      stock_rows: 10,
      media: 5,
      has_components: true,
      collection_members: 3,
      suppliers: 1,
      policies: 4,
      about: 1,
    });
    expect(row!.faq).toBeGreaterThanOrEqual(6);

    // ledger invariant: Σ movements = on_hand for every variant × location
    const mismatches = await db.execute(sql`
      select l.variant_id, l.location_id
        from stock_levels l
        left join (select variant_id, location_id, sum(delta)::int as total
                     from stock_movements group by variant_id, location_id) m
          on m.variant_id = l.variant_id and m.location_id = l.location_id
       where coalesce(m.total, 0) <> l.on_hand`);
    expect(mismatches).toHaveLength(0);

    // the Arabic FTS finds a seeded title
    const hits = await db.execute(
      sql`select slug from products where search @@ plainto_tsquery('simple', catalog_search_normalize('رمضان'))`,
    );
    expect(hits.length).toBeGreaterThanOrEqual(1);
  });

  it("wires the Journey, VAT and series reference values", async () => {
    const [row] = await db.execute<{ rate: number; months: number; days: number; inv: string }>(sql`
      select (select rate_bp from vat_rates) as rate,
             (select months from retention_settings where category = 'journey_results') as months,
             (select days from retention_settings where category = 'journey_anonymous') as days,
             format_series_number('invoice', 1) as inv`);
    expect(row).toEqual({ rate: 1600, months: 60, days: 90, inv: "INV-000001" });
  });
});
