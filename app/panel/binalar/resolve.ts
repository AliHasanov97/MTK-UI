import { getVendor } from "../../lib/api/vendors";

/** Resolves a set of vendor ids to display names, one request per unique id. */
export async function resolveVendorNames(accessToken: string, vendorIds: string[]): Promise<Record<string, string>> {
  const uniqueIds = [...new Set(vendorIds)];
  const entries = await Promise.all(
    uniqueIds.map(async (id) => {
      try {
        const vendor = await getVendor(accessToken, id);
        return [id, vendor.name] as const;
      } catch {
        return [id, "Naməlum tədarükçü"] as const;
      }
    }),
  );
  return Object.fromEntries(entries);
}
