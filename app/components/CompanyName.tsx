"use client";

import { createContext, useContext, type ReactNode } from "react";

import { DEFAULT_COMPANY_NAME } from "../lib/companyDefaults";

const CompanyNameContext = createContext(DEFAULT_COMPANY_NAME);

/** Root layout-da server tərəfdə yüklənmiş şirkət adını client komponentlərə ötürür. */
export function CompanyNameProvider({ name, children }: { name: string; children: ReactNode }) {
  return <CompanyNameContext.Provider value={name}>{children}</CompanyNameContext.Provider>;
}

export function useCompanyName() {
  return useContext(CompanyNameContext);
}
