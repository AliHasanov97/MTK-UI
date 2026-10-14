"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "../../../lib/auth/AuthContext";
import { ApiError } from "../../../lib/api/client";
import {
  QueryComparisonType,
  listApartmentTypes,
  searchApartments,
  type Apartment,
  type ApartmentType,
  type Building,
} from "../../../lib/api/buildings";
import { Modal } from "../../Modal";

function errorMessage(err: unknown) {
  if (err instanceof ApiError) {
    if (err.status === 401 || err.status === 403) {
      return "Bu məlumat üçün icazəniz yoxdur (401/403).";
    }
    return `Backend xətası (${err.status}): ${err.message}`;
  }
  return "Backend-ə qoşulmaq mümkün olmadı.";
}

// Fasad bir binanın bütün mənzillərini bir sorğuda çəkir (səhifələmə olmadan) —
// 1000 mənzildən böyük bina praktikada yoxdur, amma cavab kəsilirsə istifadəçiyə
// bunu açıq yazırıq.
const SCHEME_PAGE_SIZE = 1000;

const NO_STATUS = "Status təyin edilməyib";

// Status mətni backend-dən sərbəst sətir kimi gəlir (sabit enum deyil), ona görə
// rəng əvvəlcədən "Boş = boz" kimi sabitlənmir: binadakı statuslar əlifba sırası
// ilə düzülür və palitradan növbə ilə rəng alır. Legenda rəngin hansı statusa aid
// olduğunu göstərir.
const STATUS_PALETTE = [
  { bg: "#eef6e6", border: "#cfe3bd", ink: "#4c7a38" },
  { bg: "#e8f0fa", border: "#c6dbf2", ink: "#3f6a9c" },
  { bg: "#fbf0d9", border: "#efdcae", ink: "#8a6d1f" },
  { bg: "#f1ecfa", border: "#ddd2f2", ink: "#6a4a9c" },
  { bg: "#e6f4f3", border: "#c2e3e0", ink: "#35706b" },
  { bg: "#fbf2f2", border: "#f0d9d9", ink: "#a24a4a" },
] as const;

const NEUTRAL_COLOR = { bg: "#f2f4ee", border: "#e0e5dc", ink: "#6d7973" } as const;

/** Boş/mətn olmayan statusları da fasadda göstərmək üçün vahid açara çevirir. */
function statusKey(apartment: Apartment) {
  const value = apartment.status?.trim();
  return value ? value : NO_STATUS;
}

// Natamam sahə (0/mənfi) pəncərəni görünməz etməsin deyə minimum 1 m² götürülür.
const MIN_UNIT_AREA = 1;

/**
 * Mənzili binanın təsdiqlənmiş tipinə bağlayır: əvvəlcə eyni otaq sayı olan tiplər
 * arasından sahəsi ən yaxın olanı seçilir (mənzilin öz sahəsi tipin sahəsindən bir az
 * fərqlənə bilər), tip tapılmasa mənzilin öz otaq sayı/sahəsi tip sayılır.
 */
type UnitTypeInfo = {
  key: string;
  roomCount: number;
  areaSquareMeters: number;
};

function resolveUnitType(apartment: Apartment, types: ApartmentType[]): UnitTypeInfo {
  const sameRoomCount = types.filter((type) => type.roomCount === apartment.roomCount);
  if (sameRoomCount.length === 0) {
    return {
      key: `${apartment.roomCount} otaq / ${apartment.areaSquareMeters} m²`,
      roomCount: apartment.roomCount,
      areaSquareMeters: apartment.areaSquareMeters,
    };
  }

  let closest = sameRoomCount[0];
  for (const type of sameRoomCount) {
    if (
      Math.abs(type.areaSquareMeters - apartment.areaSquareMeters) <
      Math.abs(closest.areaSquareMeters - apartment.areaSquareMeters)
    ) {
      closest = type;
    }
  }
  return { key: closest.id, roomCount: closest.roomCount, areaSquareMeters: closest.areaSquareMeters };
}

/**
 * Tip sırası — yalnız tipin özündən (sahə, otaq sayı), mənzil nömrəsindən deyil.
 * Böyük tip soldan gəlir; bərabərlikdə otaq sayına, sonra açarın özünə baxılır ki,
 * nəticə həmişə eyni (deterministik) olsun.
 */
function compareTypes(a: UnitTypeInfo, b: UnitTypeInfo): number {
  return (
    b.areaSquareMeters - a.areaSquareMeters ||
    b.roomCount - a.roomCount ||
    a.key.localeCompare(b.key)
  );
}

/**
 * Mərtəbənin TİP TƏRKİBİ (hansı tipdən neçə dənə) — mənzil nömrələrinin sırasından
 * asılı deyil, ona görə əl ilə səhv daxil edilmiş nömrələr planı poza bilmir.
 */
function typeComposition(keys: string[]): string {
  const counts = new Map<string, number>();
  for (const key of keys) counts.set(key, (counts.get(key) ?? 0) + 1);
  return Array.from(counts.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, count]) => `${key}x${count}`)
    .join("|");
}

/**
 * `highest`-dən `lowest`-a qədər BÜTÜN mərtəbələr. Mənzili olmayan mərtəbələr (məs.
 * kommersiya üçün ayrılmış 1-ci mərtəbə) də siyahıda qalır — sxemdə boş sətir kimi
 * göstərilir, ona görə bina mərtəbələri və nömrələri itmir.
 */
function floorRange(highest: number, lowest: number): number[] {
  return Array.from({ length: highest - lowest + 1 }, (_, index) => highest - index);
}

type FloorLayout = {
  /** Soldan-sağa düzülüş: `units` massivindəki indeks, ya da -1 (bu tipdə mənzil yoxdur). */
  slots: number[];
  /** Hər slotun eni — əsas planın tip ölçüləri (+ plana sığmayan əlavə mənzillər). */
  widths: number[];
  /** Mərtəbənin tip tərkibi əsas planla tam üst-üstə düşür. */
  matchesMain: boolean;
};

type FloorScheme = {
  /** Hər mərtəbə üçün mənzillərin düzülüşü və enləri. */
  layoutsByFloor: FloorLayout[];
  /** Əsas planın mənzil sayı (adətən binanın tipik mərtəbəsi). */
  typicalCount: number;
  /** Düzülüşü əsas plandan fərqli olan mərtəbələrin sayı. */
  divergentFloors: number;
  /** Binada istifadə olunan fərqli mənzil tipi sayı. */
  typeCount: number;
};

/**
 * Mənzilləri əsas planın slotlarına TİPƏ görə yerləşdirir — mənzil nömrəsi burada heç
 * bir rol oynamır: slotda hansı tip varsa, həmin tipin mənzili ora düşür. Ona görə
 * nömrələmə səhv daxil edilsə də (əl ilə yazılır), divarların yeri düzgün qalır:
 * 2-ci mərtəbədə solda 3 otaqlı mənzil varsa, 3-cü mərtəbənin həmin slota 3 otaqlı
 * mənzili (hansı nömrə olursa olsun) düşür.
 *
 * Uyğun mənzil olmayan slot -1 ilə boş qalır — beləcə digər mərtəbələrin mövqeləri
 * sürüşmür; əsas plana sığmayan artıq mənzillər `leftover` kimi qaytarılır.
 */
function placeUnitsByType(keys: string[], mainKeys: string[]): { slots: number[]; leftover: number[] } {
  const used = keys.map(() => false);
  const slots: number[] = [];

  for (const slotKey of mainKeys) {
    const position = keys.findIndex((key, index) => !used[index] && key === slotKey);
    if (position >= 0) {
      used[position] = true;
      slots.push(position);
    } else {
      slots.push(-1);
    }
  }

  const leftover: number[] = [];
  keys.forEach((_, index) => {
    if (!used[index]) leftover.push(index);
  });

  return { slots, leftover };
}

/**
 * Fasadın enləri mənzil TİPLƏRİNDƏN gəlir, mərtəbədəki təsadüfi qeyddən deyil.
 *
 * 1. **Tip üzrə en:** mənzilin eni onun tipinin sahəsidir — eyni tipin bütün mənzilləri
 *    hər mərtəbədə eyni eni alır (mənzilin qeydindəki sahə fərqli yazılsa da).
 * 2. **Tipin yeri:** sıra mənzil NÖMRƏSİNƏ görə deyil, TİPƏ görədir. Hər mərtəbə yalnız
 *    öz tip tərkibi ilə (hansı tipdən neçə dənə) müqayisə olunur — nömrələr əl ilə
 *    daxil edildiyi üçün səhv ola bilər, ona görə plan onlara bağlanmır. Mərtəbələrin
 *    çoxunda təkrarlanan tərkib əsas plan sayılır, onun slot sırası isə tipin özündən
 *    (böyük sahə → böyük otaq sayı → açar) gəlir və bütün mərtəbələrdə eynidir — ona görə
 *    üst-üstə düşən mənzillər eyni enə və eyni divar xətlərinə düşür.
 *
 * Tərkibi əsas plandan fərqli olan mərtəbədə uyğun tipdə mənzil olmayan slot boş qalır
 * (mövqelər sürüşmür), plana sığmayan artıq mənzillər sona tip sırası ilə əlavə olunur.
 */
function buildScheme(unitsByFloor: Apartment[][], types: ApartmentType[]): FloorScheme {
  const resolvedByFloor = unitsByFloor.map((units) =>
    units.map((apartment) => resolveUnitType(apartment, types)),
  );
  const keysByFloor = resolvedByFloor.map((units) => units.map((unit) => unit.key));

  // ƏSAS PLAN mərtəbələrin TİP TƏRKİBİNƏ görə seçilir — mənzil nömrələrinə heç bir
  // yerdə güvənilmir (nömrələmə əl ilə daxil edildiyi üçün səhv ola bilər). Ən çox
  // təkrarlanan tərkib (məs. 3 mərtəbədən 2-də 1 otaq+2 otaq+3 otaq) əsas plan sayılır;
  // bərabərlikdə daha çox mənzilli, sonra daha aşağı mərtəbənin tərkibi üstün tutulur.
  const compositions = new Map<string, { keys: string[]; floors: number[] }>();
  keysByFloor.forEach((keys, index) => {
    const signature = typeComposition(keys);
    const group = compositions.get(signature);
    if (group) group.floors.push(index);
    else compositions.set(signature, { keys, floors: [index] });
  });

  let mainComposition: { keys: string[]; floors: number[] } | undefined;
  for (const group of compositions.values()) {
    if (
      !mainComposition ||
      group.floors.length > mainComposition.floors.length ||
      (group.floors.length === mainComposition.floors.length &&
        (group.keys.length > mainComposition.keys.length ||
          (group.keys.length === mainComposition.keys.length &&
            group.floors[0] > mainComposition.floors[0])))
    ) {
      mainComposition = group;
    }
  }

  const typeInfo = new Map<string, UnitTypeInfo>();
  for (const units of resolvedByFloor) {
    for (const unit of units) typeInfo.set(unit.key, unit);
  }
  const infoOf = (key: string): UnitTypeInfo =>
    typeInfo.get(key) ?? { key, roomCount: 0, areaSquareMeters: MIN_UNIT_AREA };

  // Əsas planın slot sırası da yalnız tiplə müəyyən olunur (nömrəyə görə deyil).
  const mainKeys = (mainComposition?.keys ?? [])
    .slice()
    .sort((a, b) => compareTypes(infoOf(a), infoOf(b)));
  const mainWidths = mainKeys.map((key) =>
    Math.max(infoOf(key).areaSquareMeters, MIN_UNIT_AREA),
  );

  const layoutsByFloor = keysByFloor.map((keys, index) => {
    const { slots, leftover } = placeUnitsByType(keys, mainKeys);
    // Plana sığmayan artıq mənzillər də nömrəyə görə deyil, tipə görə sıralanır.
    const extras = leftover
      .slice()
      .sort((a, b) => compareTypes(infoOf(keys[a]), infoOf(keys[b])));
    const positions = [...slots, ...extras];
    const areas = resolvedByFloor[index].map((unit) =>
      Math.max(unit.areaSquareMeters, MIN_UNIT_AREA),
    );
    // Əsas planın slotları planın tip ölçüsünü saxlayır (boş slot da yerini saxlayır),
    // plana sığmayan artıq mənzillər öz tipinin enini alır.
    const widths = positions.map((position, slotIndex) =>
      position >= 0 && slotIndex >= mainWidths.length ? areas[position] : mainWidths[slotIndex],
    );
    return {
      slots: positions,
      widths,
      matchesMain:
        leftover.length === 0 && keys.length === mainKeys.length && slots.every((slot) => slot >= 0),
    };
  });

  return {
    layoutsByFloor,
    typicalCount: mainKeys.length,
    divergentFloors: layoutsByFloor.filter((layout) => !layout.matchesMain).length,
    typeCount: new Set(keysByFloor.flat()).size,
  };
}

export function BinaSxemiModal({ building, onClose }: { building: Building; onClose: () => void }) {
  const auth = useAuth();
  const [apartments, setApartments] = useState<Apartment[] | null>(null);
  const [types, setTypes] = useState<ApartmentType[]>([]);
  const [typesMissing, setTypesMissing] = useState(false);
  const [totalCount, setTotalCount] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [hovered, setHovered] = useState<Apartment | null>(null);

  const accessToken = auth.status === "authenticated" ? auth.accessToken : "";

  useEffect(() => {
    if (!accessToken) return;
    let cancelled = false;

    // Mənzil tipləri sxemin əsasını təşkil edir (enlər tipin sahəsindən gəlir), amma
    // onlar yüklənməsə sxem yenə işləyir — o halda hər mənzilin öz sahəsi götürülür.
    listApartmentTypes(accessToken, building.id)
      .then((res) => {
        if (cancelled) return;
        setTypes(res);
        setTypesMissing(false);
      })
      .catch(() => {
        if (cancelled) return;
        setTypes([]);
        setTypesMissing(true);
      });

    searchApartments(accessToken, {
      filters: [
        { columnName: "BuildingId", comparison: QueryComparisonType.In, value: [building.id] },
      ],
      page: 0,
      pageSize: SCHEME_PAGE_SIZE,
    })
      .then((res) => {
        if (cancelled) return;
        setApartments(res.items);
        setTotalCount(res.totalCount);
        setError(null);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(errorMessage(err));
      });

    return () => {
      cancelled = true;
    };
  }, [accessToken, building.id]);

  const list = apartments ?? [];

  const byFloor = new Map<number, Apartment[]>();
  for (const apartment of list) {
    const units = byFloor.get(apartment.floor);
    if (units) units.push(apartment);
    else byFloor.set(apartment.floor, [apartment]);
  }

  // Yalnız mənzili olan mərtəbələr (sxem hesabatı üçün)
  const floorsWithUnits = Array.from(byFloor.keys()).sort((a, b) => b - a);

  // Mənzil nömrəsi yalnız eyni tipdə olan xanaların ETİKET sırasına təsir edir;
  // divarların yeri və sıra tipə görədir (aşağıdakı `buildScheme`).
  for (const units of byFloor.values()) {
    units.sort((a, b) =>
      a.apartmentNumber.localeCompare(b.apartmentNumber, undefined, { numeric: true }),
    );
  }

  // ========== ƏSAS DÜZƏLİŞ ==========
  // Ən yuxarı mərtəbədən 1-ci mərtəbəyə qədər BÜTÜN mərtəbələri göstəririk.
  // Beləliklə arada boş qalan mərtəbələr (məs. 3 və 5 varsa 4-cü) həmişə boş sətir kimi görünür.
  // Bina 5 mərtəbədirsə və yalnız 4-cü mərtəbədə mənzil varsa belə, 1–5 hamısı görünəcək.
  const highestFloor = floorsWithUnits[0] ?? 0;
  const allFloors =
    highestFloor >= 1 ? floorRange(highestFloor, 1) : floorsWithUnits.length > 0
      ? floorRange(floorsWithUnits[0], floorsWithUnits[floorsWithUnits.length - 1])
      : [];

  const emptyFloors = allFloors.filter((floor) => !byFloor.has(floor));

  const scheme = buildScheme(
    floorsWithUnits.map((floor) => byFloor.get(floor)!),
    types,
  );

  // Boş mərtəbələr `allFloors`-da ayrıca sətir tutduğu üçün düzüm mərtəbə nömrəsi ilə
  // əlaqələndirilir (indekslər üst-üstə düşmür).
  const layoutByFloor = new Map(
    floorsWithUnits.map((floor, index) => [floor, scheme.layoutsByFloor[index]]),
  );

  const statuses = Array.from(new Set(list.map(statusKey))).sort((a, b) =>
    a.localeCompare(b, undefined, { numeric: true }),
  );
  const colorOf = (status: string) => {
    if (status === NO_STATUS) return NEUTRAL_COLOR;
    const index = statuses.indexOf(status);
    return index < 0 ? NEUTRAL_COLOR : STATUS_PALETTE[index % STATUS_PALETTE.length];
  };
  const countOf = (status: string) => list.filter((a) => statusKey(a) === status).length;

  function renderWindow(apartment: Apartment) {
    const status = statusKey(apartment);
    const color = colorOf(status);
    const label = `Mənzil ${apartment.apartmentNumber} — ${apartment.floor}-cü mərtəbə — ${apartment.roomCount} otaq — ${apartment.areaSquareMeters} m² — ${status}`;
    const clearHover = () => setHovered((prev) => (prev?.id === apartment.id ? null : prev));

    return (
      <Link
        key={apartment.id}
        className="b3d-window"
        href={`/panel/binalar/menzil/${apartment.id}`}
        title={label}
        aria-label={label}
        style={
          {
            "--win-bg": color.bg,
            "--win-border": color.border,
            "--win-ink": color.ink,
          } as React.CSSProperties
        }
        onMouseEnter={() => setHovered(apartment)}
        onMouseLeave={clearHover}
        onFocus={() => setHovered(apartment)}
        onBlur={clearHover}
      >
        <span className="b3d-glass">
          <b>{apartment.apartmentNumber}</b>
          <small>{apartment.roomCount} otaq</small>
        </span>
      </Link>
    );
  }

  return (
    <Modal wide title={`${building.name} — bina sxemi`} onClose={onClose}>
      {error && <p className="form-error">{error}</p>}

      {!error && !apartments && <p className="panel-page-lead">Yüklənir…</p>}

      {!error && apartments && list.length === 0 && (
        <p className="panel-page-lead">Bu binada hələ heç bir mənzil qeydə alınmayıb.</p>
      )}

      {!error && list.length > 0 && (
        <div className="bsxem">
          <div className="bsxem-summary">
            <span>
              <strong>{list.length}</strong> mənzil
            </span>
            <span>
              <strong>{allFloors.length}</strong> mərtəbə
            </span>
            <span>
              <strong>{scheme.typeCount}</strong> mənzil tipi
            </span>
            <span className="bsxem-summary-note">
              Sıra və en mənzil TİPİNƏ görədir (böyük tip soldan), nömrəyə görə deyil ·
              sahib məlumatı göstərilmir
            </span>
          </div>

          <div className="bsxem-legend">
            {statuses.map((status) => {
              const color = colorOf(status);
              return (
                <span className="bsxem-legend-item" key={status}>
                  <i style={{ background: color.bg, borderColor: color.border }} />
                  <span style={{ color: color.ink }}>{status}</span>
                  <em>{countOf(status)}</em>
                </span>
              );
            })}
          </div>

          <div className="b3d-stage">
            <div className="b3d-canvas">
              <div className="b3d">
                <div className="b3d-gutter" aria-hidden="true">
                  {allFloors.map((floor) => (
                    <i key={floor}>{floor}</i>
                  ))}
                  <i className="b3d-gutter-ground">Giriş</i>
                </div>

                <div className="b3d-body">
                  <div className="b3d-front">
                    {allFloors.map((floor) => {
                      const units = byFloor.get(floor) ?? [];
                      if (units.length === 0) {
                        return (
                          <div className="b3d-row b3d-row-empty" key={floor}>
                            <span className="b3d-empty-label">Mənzil qeydiyyatı yoxdur</span>
                          </div>
                        );
                      }
                      const layout = layoutByFloor.get(floor);
                      if (!layout) return null;
                      return (
                        <div
                          className="b3d-row"
                          key={floor}
                          style={
                            {
                              "--b3d-cols": layout.widths.map((width) => `${width}fr`).join(" "),
                            } as React.CSSProperties
                          }
                        >
                          {/* Düzülüş mənzil nömrəsinə görə deyil, TİPƏ görədir: hər slotda
                              əsas planın tipi durur, ora həmin tipin mənzili düşür. */}
                          {layout.slots.map((position, slotIndex) =>
                            position >= 0 ? (
                              renderWindow(units[position])
                            ) : (
                              <span
                                className="b3d-hole"
                                key={`bos-${floor}-${slotIndex}`}
                                title="Bu mərtəbədə bu tipdə mənzil yoxdur"
                                aria-hidden="true"
                              />
                            ),
                          )}
                        </div>
                      );
                    })}
                    <div className="b3d-plinth">
                      <span className="b3d-door" aria-hidden="true" />
                    </div>
                  </div>

                  {/* İzometrik dərinlik: sağ yan divar + dam müstəvisi */}
                  <div className="b3d-side" aria-hidden="true" />
                  <div className="b3d-top" aria-hidden="true" />
                </div>
              </div>
            </div>
          </div>

          {typesMissing && (
            <p className="bsxem-note">
              Mənzil tipləri yüklənmədi — enlər mənzillərin öz sahəsinə görə götürüldü.
            </p>
          )}

          {emptyFloors.length > 0 && (
            <p className="bsxem-note">
              {emptyFloors.length} mərtəbədə mənzil qeydiyyatı yoxdur ({emptyFloors.join(", ")}) —
              sxemdə boş sətir kimi saxlanılıb, mərtəbə nömrələri itmir.
            </p>
          )}

          {scheme.divergentFloors > 0 && (
            <p className="bsxem-note">
              {scheme.divergentFloors} mərtəbənin tip tərkibi əsas plandan fərqlidir (adətən{" "}
              {scheme.typicalCount} mənzil: {scheme.typeCount} tip) — həmin mərtəbələrdə uyğun tipdə
              mənzil olmayan yer boş göstərilir. Düzülüş mənzil nömrəsinə görə deyil, tipə görə
              olduğu üçün nömrələmə səhv daxil edilsə də sxem pozulmur.
            </p>
          )}

          <div className="bsxem-inspector">
            {hovered ? (
              <>
                <span className="bsxem-inspector-no">Mənzil {hovered.apartmentNumber}</span>
                <span>{hovered.floor}-cü mərtəbə</span>
                <span>{hovered.roomCount} otaq</span>
                <span>{hovered.areaSquareMeters} m²</span>
                <span
                  className="bsxem-inspector-status"
                  style={{
                    background: colorOf(statusKey(hovered)).bg,
                    color: colorOf(statusKey(hovered)).ink,
                  }}
                >
                  {statusKey(hovered)}
                </span>
                <Link className="panel-btn panel-btn-sm" href={`/panel/binalar/menzil/${hovered.id}`}>
                  Mənzilə keç →
                </Link>
              </>
            ) : (
              <span className="bsxem-inspector-hint">
                Məlumat üçün pəncərənin üzərinə gəlin — kliklə mənzil səhifəsi açılır.
              </span>
            )}
          </div>

          {totalCount > list.length && (
            <p className="bsxem-note">
              Cəmi {totalCount} mənzildən ilk {list.length}-i göstərilir.
            </p>
          )}
        </div>
      )}
    </Modal>
  );
}