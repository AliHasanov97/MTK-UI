import { cache } from "react";
import { DEFAULT_COMPANY_NAME } from "../companyDefaults";
import { apiConfig } from "./config";

/**
 * Şirkətin (MTK) adı — token tələb etməyən public endpoint-dən. Server
 * komponentlərində çağırılır; eyni sorğu daxilində bir dəfə yüklənir.
 * Backend əlçatmaz olsa və ya profil qurulmayıbsa, ümumi "MTK" qaytarılır.
 */
export const getCompanyName = cache(async (): Promise<string> => {
  try {
    const res = await fetch(new URL("api/payments/companies/public", apiConfig.baseUrl), {
      cache: "no-store",
      signal: AbortSignal.timeout(3000),
    });
    if (!res.ok) return DEFAULT_COMPANY_NAME;
    const body = (await res.json()) as { data?: { name?: string } };
    return body.data?.name?.trim() || DEFAULT_COMPANY_NAME;
  } catch {
    return DEFAULT_COMPANY_NAME;
  }
});
