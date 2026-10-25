"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "../../../../lib/auth/AuthContext";
import {
  QueryComparisonType,
  listApartmentsByBuilding,
  type Apartment,
  type Building,
} from "../../../../lib/api/buildings";
import { searchCharges } from "../../../../lib/api/payments";
import { Modal } from "../../../Modal";

// Open charges for the whole building are summed client-side (there is no
// building-level debt report), so they are fetched in one large page.
const CHARGE_FETCH_SIZE = 2000;

/**
 * Outstanding debt per apartment, from the open (Unpaid=0 / PartiallyPaid=1)
 * charges of the given apartments. Paid=2 and Cancelled=3 aren't debt.
 */
export async function fetchDebtByApartment(accessToken: string, apartmentIds: string[]) {
  const debt = new Map<string, number>();
  if (apartmentIds.length === 0) return debt;
  const res = await searchCharges(accessToken, {
    filters: [
      { columnName: "ApartmentId", comparison: QueryComparisonType.In, value: apartmentIds },
      { columnName: "Status", comparison: QueryComparisonType.NotEquals, value: 2 },
      { columnName: "Status", comparison: QueryComparisonType.NotEquals, value: 3 },
    ],
    page: 0,
    pageSize: CHARGE_FETCH_SIZE,
  });
  for (const c of res.charges) {
    if (!c.apartmentId) continue;
    debt.set(c.apartmentId, (debt.get(c.apartmentId) ?? 0) + (c.amount - c.paidAmount));
  }
  return debt;
}

type Mode = "ownership" | "debt" | "rooms";

type Category = {
  key: string;
  label: string;
  /** Window light class — the actual colors live in the .bview-win--* CSS. */
  light: string;
};

const MODES: { key: Mode; label: string }[] = [
  { key: "ownership", label: "Sahiblik" },
  { key: "debt", label: "Borc" },
  { key: "rooms", label: "Otaq sayı" },
];

const OWNED: Category = { key: "owned", label: "Sahibli", light: "warm" };
const VACANT: Category = { key: "vacant", label: "Boş", light: "off" };
const NO_DEBT: Category = { key: "none", label: "Borcsuz", light: "green" };
const ROOM_LIGHTS = ["warm", "blue", "violet", "teal", "rose", "amber"];

const money = new Intl.NumberFormat("az-AZ", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const moneyShort = new Intl.NumberFormat("az-AZ", { maximumFractionDigits: 0 });

const byNumber = (a: Apartment, b: Apartment) =>
  a.apartmentNumber.localeCompare(b.apartmentNumber, undefined, { numeric: true });

/**
 * The building as an evening facade: one window per apartment, floors stacked
 * top to bottom, apartments in number order. In "Sahiblik" owned apartments
 * have their lights on and vacant ones are dark, so occupancy reads at a glance.
 * Opens as a modal; loads its own data unless the caller already has it.
 */
export function BuildingSchemeModal({
  building,
  apartments: preloadedApartments,
  debtByApartment: preloadedDebt,
  onClose,
}: {
  building: Building;
  apartments?: Apartment[];
  debtByApartment?: Map<string, number> | null;
  onClose: () => void;
}) {
  const auth = useAuth();
  const [loadedApartments, setLoadedApartments] = useState<Apartment[] | null>(null);
  const [loadedDebt, setLoadedDebt] = useState<Map<string, number> | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (preloadedApartments || auth.status !== "authenticated") return;
    const accessToken = auth.accessToken;
    listApartmentsByBuilding(accessToken, building.id)
      .then((apartments) => {
        setLoadedApartments(apartments);
        return fetchDebtByApartment(accessToken, apartments.map((a) => a.id))
          .then(setLoadedDebt)
          .catch(() => setLoadedDebt(new Map()));
      })
      .catch(() => setError("Mənzillər yüklənmədi."));
  }, [auth, building.id, preloadedApartments]);

  const apartments = preloadedApartments ?? loadedApartments;
  const debtByApartment = preloadedApartments ? (preloadedDebt ?? null) : loadedDebt;

  return (
    <Modal title={`${building.name} — bina sxemi`} onClose={onClose} wide>
      {error ? (
        <p className="form-error">{error}</p>
      ) : !apartments ? (
        <p className="panel-page-lead">Sxem yüklənir…</p>
      ) : apartments.length === 0 ? (
        <p className="panel-page-lead">Bu binada hələ mənzil yoxdur — sxem mənzil əlavə edildikdən sonra görünəcək.</p>
      ) : (
        <BuildingView apartments={apartments} debtByApartment={debtByApartment} />
      )}
    </Modal>
  );
}

function BuildingView({
  apartments,
  debtByApartment,
}: {
  apartments: Apartment[];
  debtByApartment: Map<string, number> | null;
}) {
  const [mode, setMode] = useState<Mode>("ownership");
  const [focus, setFocus] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const debtOf = (a: Apartment) => debtByApartment?.get(a.id) ?? 0;

  // "Çox borc" is the top third of the apartments that owe anything, so the
  // split adapts to the building instead of relying on a fixed amount.
  const positiveDebts = apartments
    .map(debtOf)
    .filter((d) => d > 0.005)
    .sort((a, b) => a - b);
  const highThreshold = positiveDebts.length > 0 ? positiveDebts[Math.floor((positiveDebts.length * 2) / 3)] : 0;
  const lowDebt: Category = {
    key: "low",
    label: positiveDebts.length > 0 ? `Borc < ${moneyShort.format(highThreshold)} ₼` : "Az borc",
    light: "amber",
  };
  const highDebt: Category = {
    key: "high",
    label: positiveDebts.length > 0 ? `Borc ≥ ${moneyShort.format(highThreshold)} ₼` : "Çox borc",
    light: "red",
  };

  const roomCounts = [...new Set(apartments.map((a) => a.roomCount))].sort((a, b) => a - b);
  const roomCategories = roomCounts.map(
    (count, index): Category => ({
      key: `rooms-${count}`,
      label: `${count} otaqlı`,
      light: ROOM_LIGHTS[index % ROOM_LIGHTS.length],
    }),
  );

  function categoryOf(a: Apartment): Category {
    if (mode === "ownership") return a.currentOwner ? OWNED : VACANT;
    if (mode === "debt") {
      const debt = debtOf(a);
      if (debt <= 0.005) return NO_DEBT;
      return debt >= highThreshold ? highDebt : lowDebt;
    }
    return roomCategories[roomCounts.indexOf(a.roomCount)];
  }

  const categories =
    mode === "ownership" ? [OWNED, VACANT] : mode === "debt" ? [NO_DEBT, lowDebt, highDebt] : roomCategories;
  const counts = new Map<string, number>();
  for (const a of apartments) {
    const key = categoryOf(a).key;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  const floors = [...new Set(apartments.map((a) => a.floor))].sort((a, b) => b - a);
  const unitsByFloor = new Map(
    floors.map((floor) => [floor, apartments.filter((a) => a.floor === floor).sort(byNumber)]),
  );
  // Every floor gets the same number of window slots so the facade stays a
  // clean rectangle; floors with fewer apartments show plain wall in the rest.
  const columns = Math.max(...[...unitsByFloor.values()].map((units) => units.length));

  const ownedCount = apartments.filter((a) => a.currentOwner).length;
  const occupancy = Math.round((ownedCount / apartments.length) * 100);
  const totalDebt = apartments.reduce((sum, a) => sum + debtOf(a), 0);
  const selected = apartments.find((a) => a.id === selectedId) ?? null;

  return (
    <div className="bview">
      <div className="bview-scene">
        <div className="bview-building" style={{ ["--bview-cols" as string]: columns }}>
          <div className="bview-roof" aria-hidden="true">
            <span className="bview-roof-cap" />
          </div>
          {floors.map((floor) => {
            const units = unitsByFloor.get(floor) ?? [];
            return (
              <div key={floor} className="bview-floor">
                <span className="bview-floor-label">{floor}</span>
                <div className="bview-windows">
                  {units.map((a) => {
                    const category = categoryOf(a);
                    const dimmed = focus !== null && focus !== category.key;
                    const debt = debtOf(a);
                    return (
                      <button
                        key={a.id}
                        type="button"
                        className={`bview-win bview-win--${category.light}${selectedId === a.id ? " selected" : ""}${
                          dimmed ? " dimmed" : ""
                        }`}
                        title={`Mənzil ${a.apartmentNumber} · ${a.roomCount} otaq · ${a.areaSquareMeters} m²${
                          a.currentOwner ? ` · ${a.currentOwner.name}` : " · boş"
                        }${debt > 0.005 ? ` · borc ${money.format(debt)} ₼` : ""}`}
                        aria-label={`Mənzil ${a.apartmentNumber}`}
                        aria-pressed={selectedId === a.id}
                        onClick={() => setSelectedId((current) => (current === a.id ? null : a.id))}
                      >
                        <span className="bview-win-number">{a.apartmentNumber}</span>
                      </button>
                    );
                  })}
                  {Array.from({ length: columns - units.length }).map((_, index) => (
                    <span key={`wall-${index}`} className="bview-wall" aria-hidden="true" />
                  ))}
                </div>
              </div>
            );
          })}
          <div className="bview-ground-floor" aria-hidden="true">
            <span className="bview-floor-label" />
            <div className="bview-entrance">
              <span className="bview-canopy" />
              <span className="bview-door" />
            </div>
          </div>
        </div>
        <div className="bview-street" aria-hidden="true">
          <span className="bview-tree" />
          <span className="bview-tree bview-tree--small" />
          <span className="bview-tree bview-tree--right" />
        </div>
      </div>

      <aside className="bview-aside">
        <div className="ledger-segmented bview-modes" role="group" aria-label="Sxem rejimi">
          {MODES.map((m) => (
            <button
              key={m.key}
              type="button"
              aria-pressed={mode === m.key}
              className={mode === m.key ? "active" : ""}
              disabled={m.key === "debt" && debtByApartment === null}
              onClick={() => {
                setMode(m.key);
                setFocus(null);
              }}
            >
              {m.label}
            </button>
          ))}
        </div>

        <div className="bview-legend">
          {categories.map((c) => (
            <button
              key={c.key}
              type="button"
              className={`bview-legend-item${focus === c.key ? " active" : ""}`}
              aria-pressed={focus === c.key}
              title="Yalnız bu qrupu vurğula"
              onClick={() => setFocus((current) => (current === c.key ? null : c.key))}
            >
              <span className={`bview-swatch bview-win--${c.light}`} />
              <span className="bview-legend-label">{c.label}</span>
              <strong>{counts.get(c.key) ?? 0}</strong>
            </button>
          ))}
        </div>

        <div className="bview-stat">
          <div className="bview-stat-head">
            <span>Doluluq</span>
            <strong>{occupancy}%</strong>
          </div>
          <div className="bview-meter" role="img" aria-label={`${ownedCount} / ${apartments.length} mənzil sahiblidir`}>
            <span style={{ width: `${occupancy}%` }} />
          </div>
          <small>
            {ownedCount} sahibli · {apartments.length - ownedCount} boş · {floors.length} mərtəbə
          </small>
        </div>

        {debtByApartment && (
          <div className="bview-stat">
            <div className="bview-stat-head">
              <span>Açıq borc</span>
              <strong className={totalDebt > 0.005 ? "vendor-value-danger" : "vendor-value-ok"}>
                {money.format(totalDebt)} ₼
              </strong>
            </div>
            <small>{positiveDebts.length} mənzilin borcu var</small>
          </div>
        )}

        {selected ? (
          <div className="bview-detail">
            <div className="bview-detail-head">
              <strong>Mənzil {selected.apartmentNumber}</strong>
              <span className="panel-role-tag">{selected.status}</span>
            </div>
            <dl>
              <div>
                <dt>Mərtəbə</dt>
                <dd>{selected.floor}</dd>
              </div>
              <div>
                <dt>Otaq / sahə</dt>
                <dd>
                  {selected.roomCount} · {selected.areaSquareMeters} m²
                </dd>
              </div>
              <div>
                <dt>Sahib</dt>
                <dd>
                  {selected.currentOwner ? (
                    <Link className="owner-link" href={`/panel/binalar/sahibler/${selected.currentOwner.id}`}>
                      {selected.currentOwner.name}
                    </Link>
                  ) : (
                    "—"
                  )}
                </dd>
              </div>
              {debtByApartment && (
                <div>
                  <dt>Borc</dt>
                  <dd className={debtOf(selected) > 0.005 ? "vendor-value-danger" : "vendor-value-ok"}>
                    {debtOf(selected) > 0.005 ? `${money.format(debtOf(selected))} ₼` : "Yoxdur"}
                  </dd>
                </div>
              )}
            </dl>
            <Link className="panel-btn panel-btn-sm panel-btn-primary" href={`/panel/binalar/menzil/${selected.id}`}>
              Mənzilə keç →
            </Link>
          </div>
        ) : (
          <p className="bview-hint">Təfərrüat üçün pəncərəyə (mənzilə) klikləyin.</p>
        )}
      </aside>
    </div>
  );
}
