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

export type CompanyContactInfo = {
  email: string;
  phone: string | null;
  address: string;
  workHours: string | null;
};

const DEFAULT_COMPANY_CONTACT: CompanyContactInfo = {
  email: 'info@mtk.az',
  phone: null,
  address: 'Əlavə olunacaq',
  workHours: null,
};

/** Public company contact fields used by the landing and contact pages. */
export const getCompanyContactInfo = cache(async (): Promise<CompanyContactInfo> => {
  try {
    const res = await fetch(new URL('api/payments/companies/public', apiConfig.baseUrl), {
      cache: 'no-store',
      signal: AbortSignal.timeout(3000),
    });
    if (!res.ok) return DEFAULT_COMPANY_CONTACT;
    const body = (await res.json()) as { data?: Partial<CompanyContactInfo> };
    return {
      email: body.data?.email?.trim() || DEFAULT_COMPANY_CONTACT.email,
      phone: body.data?.phone?.trim() || null,
      address: body.data?.address?.trim() || DEFAULT_COMPANY_CONTACT.address,
      workHours: body.data?.workHours?.trim() || null,
    };
  } catch {
    return DEFAULT_COMPANY_CONTACT;
  }
});