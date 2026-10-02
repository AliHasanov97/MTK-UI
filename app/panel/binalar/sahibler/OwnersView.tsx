"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "../../../lib/auth/AuthContext";
import { useCanDoEverything } from "../../../lib/auth/roles";
import { ROLES } from "../../../lib/auth/roleConstants";
import { ApiError } from "../../../lib/api/client";
import { SortDirection } from "../../../lib/api/buildings";
import { createPassiveOwner, searchOwners, type OwnerListItem } from "../../../lib/api/owners";
import { registerUser } from "../../../lib/api/identity";
import { Modal } from "../../Modal";

function errorMessage(err: unknown) {
  if (err instanceof ApiError) {
    if (err.status === 401 || err.status === 403) {
      return "Giriş rədd edildi (401/403).";
    }
    return `Backend xətası (${err.status}): ${err.message}`;
  }
  return "Backend-ə qoşulmaq mümkün olmadı.";
}

// FullName is a computed C# property (FirstName + " " + LastName), not a
// mapped column, so EF can't translate an ORDER BY on it — sorting the
// "Ad Soyad" column below actually sorts by FirstName underneath, which is
// the same trade-off apartments' Bina-name sort makes.
type SortColumn = "firstName" | "email";

type SortState = { column: SortColumn; direction: "asc" | "desc" } | null;

const SORT_COLUMN_MAP: Record<SortColumn, string> = {
  firstName: "FirstName",
  email: "Email",
};

const PAGE_SIZE = 10;

function SortIcon({ active, direction }: { active: boolean; direction: "asc" | "desc" }) {
  if (!active) return <span className="sort-icon">⇅</span>;
  return <span className="sort-icon active">{direction === "asc" ? "▲" : "▼"}</span>;
}

export function OwnersView() {
  const auth = useAuth();
  const canManage = useCanDoEverything();
  const [owners, setOwners] = useState<OwnerListItem[] | null>(null);
  const [totalCount, setTotalCount] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [searchInput, setSearchInput] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [sort, setSort] = useState<SortState>(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [showCreate, setShowCreate] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    const timer = setTimeout(() => setSearchTerm(searchInput.trim()), 350);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const filterSignature = JSON.stringify([searchTerm, sort]);
  const [prevFilterSignature, setPrevFilterSignature] = useState(filterSignature);
  if (filterSignature !== prevFilterSignature) {
    setPrevFilterSignature(filterSignature);
    setPageNumber(1);
  }

  useEffect(() => {
    if (auth.status !== "authenticated") return;

    const sortCriteria = sort
      ? {
          columnName: SORT_COLUMN_MAP[sort.column],
          direction: sort.direction === "asc" ? SortDirection.Ascending : SortDirection.Descending,
        }
      : null;

    searchOwners(auth.accessToken, {
      sortCriteria,
      searchTerm: searchTerm || undefined,
      page: pageNumber - 1,
      pageSize: PAGE_SIZE,
    })
      .then((res) => {
        setOwners(res.items);
        setTotalCount(res.totalCount);
        setError(null);
      })
      .catch((err) => setError(errorMessage(err)));
  }, [auth, searchTerm, sort, pageNumber, reloadKey]);

  if (auth.status !== "authenticated") return null;

  if (error) {
    return (
      <div className="panel-denied">
        <h2>Məlumat alınmadı</h2>
        <p>{error}</p>
      </div>
    );
  }

  if (!owners) {
    return <p className="panel-page-lead">Yüklənir…</p>;
  }

  function handleSort(column: SortColumn) {
    setSort((prev) =>
      prev?.column === column
        ? { column, direction: prev.direction === "asc" ? "desc" : "asc" }
        : { column, direction: "asc" },
    );
  }

  const pageCount = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  return (
    <div>
      <div className="panel-toolbar">
        <input
          className="panel-search"
          placeholder="Axtar (ad, e-poçt, telefon…)"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
        />
        {canManage && (
          <button type="button" className="panel-btn panel-btn-primary" onClick={() => setShowCreate(true)}>
            + Yeni sahib
          </button>
        )}
      </div>

      <div className="data-table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th>
                <span className="th-label" onClick={() => handleSort("firstName")}>
                  Ad Soyad <SortIcon active={sort?.column === "firstName"} direction={sort?.direction ?? "asc"} />
                </span>
              </th>
              <th>
                <span className="th-label" onClick={() => handleSort("email")}>
                  E-poçt <SortIcon active={sort?.column === "email"} direction={sort?.direction ?? "asc"} />
                </span>
              </th>
              <th>Telefon</th>
              <th>Hesab növü</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {owners.length === 0 && (
              <tr>
                <td colSpan={5}>Nəticə tapılmadı.</td>
              </tr>
            )}
            {owners.map((o) => (
              <tr key={o.id}>
                <td>
                  <Link className="owner-link" href={`/panel/binalar/sahibler/${o.id}`}>
                    {o.fullName}
                  </Link>
                </td>
                <td>{o.email}</td>
                <td>{o.phoneNumber}</td>
                <td>{o.userId ? "Qeydiyyatlı istifadəçi" : "Passiv sahib"}</td>
                <td>
                  <span className={`panel-role-tag${o.isActive ? "" : " panel-role-tag-inactive"}`}>
                    {o.isActive ? "Aktiv" : "Deaktiv"}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="panel-pagination">
          <span>
            Cəmi {totalCount} sahib — səhifə {pageNumber}/{pageCount}
          </span>
          <div style={{ display: "flex", gap: 8 }}>
            <button
              type="button"
              className="panel-btn panel-btn-sm"
              disabled={pageNumber <= 1}
              onClick={() => setPageNumber((p) => Math.max(1, p - 1))}
            >
              Əvvəlki
            </button>
            <button
              type="button"
              className="panel-btn panel-btn-sm"
              disabled={pageNumber >= pageCount}
              onClick={() => setPageNumber((p) => p + 1)}
            >
              Növbəti
            </button>
          </div>
        </div>
      </div>

      {showCreate && (
        <CreateOwnerModal
          onClose={() => setShowCreate(false)}
          onSaved={() => {
            setShowCreate(false);
            setReloadKey((k) => k + 1);
          }}
        />
      )}
    </div>
  );
}

type CreateOwnerMode = "passive" | "user";

function CreateOwnerModal({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const auth = useAuth();
  const [mode, setMode] = useState<CreateOwnerMode>("passive");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [email, setEmail] = useState("");
  const [notes, setNotes] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [userCreatedNotice, setUserCreatedNotice] = useState(false);

  if (auth.status !== "authenticated") return null;
  const accessToken = auth.accessToken;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      if (mode === "passive") {
        await createPassiveOwner(accessToken, {
          firstName,
          lastName,
          phoneNumber,
          email,
          notes: notes || null,
        });
        onSaved();
      } else {
        await registerUser(accessToken, {
          email,
          firstName,
          lastName,
          password,
          phoneNumber: phoneNumber || null,
          roleNames: [ROLES.OWNER],
        });
        // The Owner record for this user is created asynchronously (Identity
        // publishes an event, Buildings' outbox/inbox picks it up), so it
        // may not show up in the list the instant this call returns.
        setUserCreatedNotice(true);
      }
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  if (userCreatedNotice) {
    return (
      <Modal title="Hesablı sahib yaradıldı" onClose={onSaved}>
        <p className="panel-page-lead">
          İstifadəçi hesabı uğurla yaradıldı. Sahib qeydi arxa planda avtomatik yaranır — siyahıda bir
          neçə saniyə ərzində görünəcək (görünmürsə, səhifəni yeniləyin).
        </p>
        <div className="form-actions">
          <button type="button" className="panel-btn panel-btn-primary" onClick={onSaved}>
            Bağla
          </button>
        </div>
      </Modal>
    );
  }

  return (
    <Modal title="Yeni sahib" onClose={onClose}>
      <div className="form-field">
        <div style={{ display: "flex", gap: 8 }}>
          <button
            type="button"
            className={mode === "passive" ? "panel-btn panel-btn-primary" : "panel-btn"}
            onClick={() => setMode("passive")}
          >
            Passiv sahib
          </button>
          <button
            type="button"
            className={mode === "user" ? "panel-btn panel-btn-primary" : "panel-btn"}
            onClick={() => setMode("user")}
          >
            Hesablı sahib
          </button>
        </div>
      </div>
      <p className="panel-page-lead">
        {mode === "passive"
          ? "Hesabı olmayan sahib — yalnız məlumat saxlamaq (hesab/borc izləmə) üçündür, sistemə daxil ola bilməz."
          : "Sistemə daxil ola bilən tam istifadəçi hesabı yaradılır və avtomatik olaraq sahib kimi qeydə alınır."}
      </p>
      <form onSubmit={handleSubmit}>
        {error && <p className="form-error">{error}</p>}
        <div className="form-row">
          <div className="form-field">
            <label htmlFor="owner-firstname">Ad</label>
            <input id="owner-firstname" required value={firstName} onChange={(e) => setFirstName(e.target.value)} />
          </div>
          <div className="form-field">
            <label htmlFor="owner-lastname">Soyad</label>
            <input id="owner-lastname" required value={lastName} onChange={(e) => setLastName(e.target.value)} />
          </div>
        </div>
        <div className="form-row">
          <div className="form-field">
            <label htmlFor="owner-phone">Telefon</label>
            <input
              id="owner-phone"
              required={mode === "passive"}
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
            />
          </div>
          <div className="form-field">
            <label htmlFor="owner-email">E-poçt</label>
            <input
              id="owner-email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
        </div>
        {mode === "passive" ? (
          <div className="form-field">
            <label htmlFor="owner-notes">Qeyd</label>
            <input id="owner-notes" value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>
        ) : (
          <div className="form-field">
            <label htmlFor="owner-password">Şifrə</label>
            <input
              id="owner-password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
        )}
        <div className="form-actions">
          <button type="button" className="panel-btn" onClick={onClose}>
            Ləğv et
          </button>
          <button type="submit" className="panel-btn panel-btn-primary" disabled={saving}>
            {saving ? "Saxlanılır…" : "Yarat"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
