"use client";

import { useEffect, useState } from "react";
import { useAuth } from "./AuthContext";
import { getCurrentUser } from "../api/identity";
import { getOwnerByUserId } from "../api/owners";
import { ROLES, hasAnyRole } from "./roleConstants";

export { ROLES, ROLE_LABELS, hasAnyRole, type Role } from "./roleConstants";

/** admin, building-manager — HR/Binalar/Anbar/Müqavilə/Tarif/Xərc/Əlavə-gəlir
 *  yaratma-redaktə-silmə, haqq yaratma/ləğvi. Mühasibin bu hüququ yoxdur. */
export function useCanDoEverything() {
  const auth = useAuth();
  return auth.status === "authenticated" && hasAnyRole(auth.user.roles, [ROLES.ADMIN, ROLES.BUILDING_MANAGER]);
}

/** admin, building-manager, accountant — yalnız sakin/tədarükçü ödənişi yaratmaq. */
export function useCanPay() {
  const auth = useAuth();
  return (
    auth.status === "authenticated" &&
    hasAnyRole(auth.user.roles, [ROLES.ADMIN, ROLES.BUILDING_MANAGER, ROLES.ACCOUNTANT])
  );
}

/**
 * Cari istifadəçinin öz Owner.Id-si — mənzil/qaraj detal səhifələrində "bu,
 * həqiqətən mənimdir?" yoxlaması üçün (sakin yalnız öz əmlakını görə bilsin,
 * başqasının id-sini URL-ə yazıb girə bilməsin). `skip=true` olanda (adətən
 * `!useCanDoEverything()`-in əksi — admin/komandant üçün yoxlamaya ehtiyac
 * yoxdur) heç bir sorğu getmir.
 */
export function useMyOwnerId(skip: boolean): { ownerId: string | null; loading: boolean } {
  const auth = useAuth();
  const [state, setState] = useState<{ ownerId: string | null; loading: boolean }>({
    ownerId: null,
    loading: !skip,
  });

  useEffect(() => {
    if (skip || auth.status !== "authenticated") return;
    let cancelled = false;
    getCurrentUser(auth.accessToken)
      .then((user) => getOwnerByUserId(auth.accessToken, user.id))
      .then((owner) => {
        if (!cancelled) setState({ ownerId: owner.id, loading: false });
      })
      .catch(() => {
        if (!cancelled) setState({ ownerId: null, loading: false });
      });
    return () => {
      cancelled = true;
    };
  }, [auth, skip]);

  return state;
}
