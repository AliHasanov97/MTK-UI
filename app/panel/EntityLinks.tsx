"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getOwnerByUserId } from "../lib/api/owners";

/** Detail-page routes for the entities that have one. */
export const entityHref = {
  building: (id: string) => `/panel/binalar/bina/${id}`,
  apartment: (id: string) => `/panel/binalar/menzil/${id}`,
  garage: (id: string) => `/panel/binalar/qaraj/${id}`,
  owner: (id: string) => `/panel/binalar/sahibler/${id}`,
  vendor: (id: string) => `/panel/tedarukculer/${id}`,
  customer: (id: string) => `/panel/musteriler/${id}`,
  employee: (id: string) => `/panel/hr/isciler/${id}`,
  nomenclature: (id: string) => `/panel/inventar/materiallar/${id}`,
  purchase: (id: string) => `/panel/maliyye-emeliyyatlari/salinmalar/${id}`,
  contract: (id: string) => `/panel/muqavileler/${id}`,
};

/** An apartment or garage — whichever id is set. */
export function propertyHref(p: { apartmentId?: string | null; garageId?: string | null }) {
  if (p.apartmentId) return entityHref.apartment(p.apartmentId);
  if (p.garageId) return entityHref.garage(p.garageId);
  return null;
}

/** The party of a payment/charge/contract — owner, vendor or customer. */
export function partyHref(p: { ownerId?: string | null; vendorId?: string | null; customerId?: string | null }) {
  if (p.ownerId) return entityHref.owner(p.ownerId);
  if (p.vendorId) return entityHref.vendor(p.vendorId);
  if (p.customerId) return entityHref.customer(p.customerId);
  return null;
}

// userId → ownerId (null = that user isn't a resident), kept for the session so
// the same submitter isn't looked up again on every page.
const ownerIdByUserCache = new Map<string, Promise<string | null>>();

function lookupOwnerId(accessToken: string, userId: string) {
  let pending = ownerIdByUserCache.get(userId);
  if (!pending) {
    pending = getOwnerByUserId(accessToken, userId)
      .then((owner) => owner.id)
      .catch(() => null);
    ownerIdByUserCache.set(userId, pending);
  }
  return pending;
}

/**
 * Resolves user ids (e.g. an appeal's submitter) to the resident's owner id, so
 * the name can link to the owner page. Pass `enabled=false` for roles that
 * can't open owner pages anyway.
 */
export function useOwnerIdsByUser(accessToken: string, userIds: (string | null | undefined)[], enabled = true) {
  const [ownerIds, setOwnerIds] = useState<Record<string, string | null>>({});
  const key = [...new Set(userIds.filter((id): id is string => !!id))].sort().join(",");

  useEffect(() => {
    if (!enabled || !accessToken || key === "") return;
    let active = true;
    const ids = key.split(",");
    Promise.all(ids.map((id) => lookupOwnerId(accessToken, id).then((ownerId) => [id, ownerId] as const))).then(
      (entries) => {
        if (active) setOwnerIds((current) => ({ ...current, ...Object.fromEntries(entries) }));
      },
    );
    return () => {
      active = false;
    };
  }, [accessToken, key, enabled]);

  return ownerIds;
}

/**
 * A reference to another record: a link to its page when there is one, plain
 * text otherwise. The click doesn't bubble, so it also works inside rows that
 * open something on click.
 */
export function EntityLink({
  href,
  children,
  fallback = "—",
}: {
  href: string | null | undefined;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}) {
  const empty = children === null || children === undefined || children === "";
  if (empty) return <>{fallback}</>;
  if (!href) return <>{children}</>;
  return (
    <Link className="owner-link" href={href} onClick={(event) => event.stopPropagation()}>
      {children}
    </Link>
  );
}
