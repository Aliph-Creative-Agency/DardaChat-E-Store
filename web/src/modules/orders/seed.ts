import { and, eq, isNull } from "drizzle-orm";
import type { SeedContext } from "../../db/seed-types";
import { locations } from "../inventory/schema";
import { deliveryZones } from "./schema";

interface ZoneSeed {
  governorate: string; // English key (addresses.governorate matches it)
  nameAr: string;
  nameEn: string;
  flatRate: number; // agorot
  codEligible: boolean;
  estMinDays: number;
  estMaxDays: number;
  isActive: boolean;
}

const westBank = (governorate: string, nameAr: string, flatRate = 2000): ZoneSeed => ({
  governorate,
  nameAr,
  nameEn: governorate,
  flatRate,
  codEligible: true,
  estMinDays: 1,
  estMaxDays: 3,
  isActive: true,
});
const gaza = (governorate: string, nameAr: string): ZoneSeed => ({
  governorate,
  nameAr,
  nameEn: governorate,
  flatRate: 3500,
  codEligible: false,
  estMinDays: 5,
  estMaxDays: 10,
  // Deliverability to Gaza is a client decision (BACKLOG); zones exist so the Owner can switch them on.
  isActive: false,
});

/**
 * The 16 Palestinian governorates (11 West Bank + 5 Gaza), one governorate-wide zone each (FR-ADR-006..008).
 * Rates, COD flags and windows are PLACEHOLDERS the Owner edits in the back office.
 */
export const SEED_ZONES: readonly ZoneSeed[] = [
  westBank("Jenin", "جنين"),
  westBank("Tubas", "طوباس"),
  westBank("Tulkarm", "طولكرم"),
  westBank("Nablus", "نابلس"),
  westBank("Qalqilya", "قلقيلية"),
  westBank("Salfit", "سلفيت"),
  westBank("Ramallah and Al-Bireh", "رام الله والبيرة"),
  westBank("Jericho and Al-Aghwar", "أريحا والأغوار"),
  { ...westBank("Jerusalem", "القدس", 3000), estMinDays: 2, estMaxDays: 4 },
  westBank("Bethlehem", "بيت لحم"),
  westBank("Hebron", "الخليل"),
  gaza("North Gaza", "شمال غزة"),
  gaza("Gaza", "غزة"),
  gaza("Deir al-Balah", "دير البلح"),
  gaza("Khan Yunis", "خان يونس"),
  gaza("Rafah", "رفح"),
];

export async function seed({ db }: SeedContext): Promise<void> {
  const [origin] = await db.select({ id: locations.id }).from(locations).where(eq(locations.code, "STORE"));
  for (const [position, zone] of SEED_ZONES.entries()) {
    const [existing] = await db
      .select({ id: deliveryZones.id })
      .from(deliveryZones)
      .where(and(eq(deliveryZones.governorate, zone.governorate), isNull(deliveryZones.locality)));
    if (existing) continue;
    await db.insert(deliveryZones).values({ ...zone, position, defaultOriginId: origin?.id ?? null });
  }
}
