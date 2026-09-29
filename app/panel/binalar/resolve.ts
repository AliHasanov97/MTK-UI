import { getApartmentById } from "../../lib/api/buildings";
import { getGarageById } from "../../lib/api/garages";
import { getOwnerById } from "../../lib/api/owners";
import type { PropertyTypeKey } from "../../lib/api/payments";

/** Resolves a set of owner ids to display names, one request per unique id. */
export async function resolveOwnerNames(accessToken: string, ownerIds: string[]): Promise<Record<string, string>> {
  const uniqueIds = [...new Set(ownerIds)];
  const entries = await Promise.all(
    uniqueIds.map(async (id) => {
      try {
        const owner = await getOwnerById(accessToken, id);
        return [id, owner.fullName] as const;
      } catch {
        return [id, "Naməlum sahib"] as const;
      }
    }),
  );
  return Object.fromEntries(entries);
}

export type PropertyRef = { propertyType: PropertyTypeKey; propertyId: string };

/** Resolves apartment/garage ids to a short display label, one request per unique property. */
export async function resolvePropertyLabels(
  accessToken: string,
  refs: PropertyRef[],
): Promise<Record<string, string>> {
  const uniqueRefs = [...new Map(refs.map((r) => [`${r.propertyType}:${r.propertyId}`, r])).values()];
  const entries = await Promise.all(
    uniqueRefs.map(async (ref) => {
      try {
        if (ref.propertyType === "Apartment") {
          const apartment = await getApartmentById(accessToken, ref.propertyId);
          return [ref.propertyId, `Mənzil ${apartment.apartmentNumber} — ${apartment.building.name}`] as const;
        }
        const garage = await getGarageById(accessToken, ref.propertyId);
        return [ref.propertyId, `Qaraj ${garage.garageNumber}`] as const;
      } catch {
        return [ref.propertyId, "Naməlum əmlak"] as const;
      }
    }),
  );
  return Object.fromEntries(entries);
}
