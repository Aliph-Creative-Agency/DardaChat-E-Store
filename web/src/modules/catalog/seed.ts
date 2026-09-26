import { eq } from "drizzle-orm";
import type { SeedContext } from "../../db/seed-types";
import {
  collectionProducts,
  collections,
  faqEntries,
  mediaAssets,
  policies,
  productComponents,
  products,
  seasonalWindows,
  staticPages,
  variants,
} from "./schema";
import { SEED_ABOUT_PAGE, SEED_COLLECTION, SEED_FAQ, SEED_POLICIES, SEED_PRODUCTS } from "./seed-data";

/** Seed media are static files in web/public/seed; a storage_key starting with "/" is served from public/. */
export const seedMediaKey = (slug: string) => `/seed/${slug}.svg`;

export async function seed({ db }: SeedContext): Promise<void> {
  const now = new Date();

  // Products: keyed by slug; a product and its children are created together, so an existing slug is skipped whole.
  for (const p of SEED_PRODUCTS) {
    const [existing] = await db.select({ id: products.id }).from(products).where(eq(products.slug, p.slug));
    if (existing) continue;
    await db.transaction(async (tx) => {
      const { variant, components, seasonal, ...rest } = p;
      const [product] = await tx
        .insert(products)
        .values({
          slug: rest.slug,
          status: "published",
          publishedAt: now,
          nameAr: rest.nameAr,
          nameEn: rest.nameEn,
          descriptionAr: rest.descriptionAr,
          descriptionEn: rest.descriptionEn,
          playInstructionsAr: rest.playInstructionsAr,
          playInstructionsEn: rest.playInstructionsEn,
          seoTitleAr: `${rest.nameAr} | دردشة`,
          seoTitleEn: `${rest.nameEn} | DardaChat`,
          seoDescriptionAr: rest.descriptionAr,
          seoDescriptionEn: rest.descriptionEn,
          group: rest.group,
          occasion: rest.occasion,
          tags: [...rest.tags],
          playerMin: rest.playerMin,
          playerMax: rest.playerMax,
          minAge: rest.minAge,
          durationMin: rest.durationMin,
        })
        .returning({ id: products.id });
      const productId = product!.id;
      await tx.insert(variants).values({ productId, ...variant });
      await tx.insert(productComponents).values(components.map((c, position) => ({ productId, position, ...c })));
      await tx.insert(mediaAssets).values({
        productId,
        kind: "image",
        storageKey: seedMediaKey(p.slug),
        mimeType: "image/svg+xml",
        width: 800,
        height: 800,
        altAr: `صورة علبة لعبة ${p.nameAr}`,
        altEn: `${p.nameEn} game box`,
        position: 0,
      });
      if (seasonal) await tx.insert(seasonalWindows).values({ productId, ...seasonal });
    });
  }

  // Collection (by slug) + members (unique pair).
  const { productSlugs, ...collection } = SEED_COLLECTION;
  await db.insert(collections).values(collection).onConflictDoNothing({ target: collections.slug });
  const [col] = await db.select({ id: collections.id }).from(collections).where(eq(collections.slug, collection.slug));
  for (const [position, slug] of productSlugs.entries()) {
    const [p] = await db.select({ id: products.id }).from(products).where(eq(products.slug, slug));
    if (!p || !col) continue;
    await db
      .insert(collectionProducts)
      .values({ collectionId: col.id, productId: p.id, position })
      .onConflictDoNothing({ target: [collectionProducts.collectionId, collectionProducts.productId] });
  }

  // Policies v1 (unique kind+version).
  await db
    .insert(policies)
    .values(SEED_POLICIES.map((pol) => ({ ...pol, version: "v1", effectiveAt: new Date("2026-01-01T00:00:00Z") })))
    .onConflictDoNothing({ target: [policies.kind, policies.version] });

  // FAQ: no natural key column — the English question identifies a seed entry.
  for (const [position, faq] of SEED_FAQ.entries()) {
    const [existing] = await db
      .select({ id: faqEntries.id })
      .from(faqEntries)
      .where(eq(faqEntries.questionEn, faq.questionEn));
    if (!existing) await db.insert(faqEntries).values({ ...faq, position });
  }

  await db
    .insert(staticPages)
    .values({ ...SEED_ABOUT_PAGE, status: "published", publishedAt: now })
    .onConflictDoNothing({ target: staticPages.slug });
}
