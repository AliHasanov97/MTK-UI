import Link from "next/link";
import {
  AnalyticsIcon,
  ArrowRightIcon,
  CalendarIcon,
  ClockIcon,
  ListIcon,
  LoginIcon,
  MailIcon,
  PhoneIcon,
  PinIcon,
  ReceiptIcon,
  ShieldIcon,
  SupportIcon,
  UserIcon,
} from "./icons";
import { LoginButton } from "./LoginButton";
import { SectionHead } from "./SectionHead";
import { formatArticleDate, getLatestArticles } from "../lib/api/articles";
import { about, compare, faqs, residentFeatures, security } from "../landingContent";
import { getCompanyContactInfo } from "../lib/api/company";

function residentIcon(title: string) {
  if (title.includes("Borc")) return <ReceiptIcon size={17} />;
  if (title.includes("Hesabat")) return <AnalyticsIcon size={17} />;
  if (title.includes("Müraciət")) return <SupportIcon size={17} />;
  return <UserIcon size={17} />;
}

function securityIcon(title: string) {
  if (title.includes("Rol")) return <ShieldIcon size={19} />;
  if (title.includes("autentifikasiya")) return <LoginIcon size={19} />;
  if (title.includes("Audit")) return <ListIcon size={19} />;
  return <ReceiptIcon size={19} />;
}

/* ---------- Əvvəl / indi ---------- */

export function Compare() {
  return (
    <section className="c-section" id="muqayise">
      <div className="c-wrap">
        <SectionHead
          title="Əvvəl və indi"
          subtitle="Dağınıq qeydlərdən vahid sistemə keçidin fərqi"
        />
        <div className="c-compare-grid">
          <div className="c-compare-col is-before">
            <h3>Əvvəl</h3>
            <ul>
              {compare.before.map((t) => (
                <li key={t}>{t}</li>
              ))}
            </ul>
          </div>
          <div className="c-compare-col is-after">
            <h3>Sistemlə</h3>
            <ul>
              {compare.after.map((t) => (
                <li key={t}>{t}</li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ---------- Sakinlər ---------- */

export function Residents() {
  return (
    <section className="c-section" id="sakinler">
      <div className="c-wrap">
        <div className="c-residents">
          <div className="c-residents-inner">
            <div className="c-residents-copy">
              <span className="c-badge c-badge-terracotta">SAKİNLƏR ÜÇÜN</span>
              <h2>
                Mənzil sahibisinizsə,
                <br />
                hər şey əlinizdədir.
              </h2>
              <p className="c-residents-lead">
                Şəxsi panelinizə daxil olun, borcunuzu yoxlayın və idarəyə müraciət göndərin.
              </p>
              <LoginButton className="c-btn c-btn-orange">
                Şəxsi panelə daxil ol
                <span className="c-btn-arrow">
                  <ArrowRightIcon size={16} />
                </span>
              </LoginButton>
            </div>

            <div className="c-residents-grid">
              {residentFeatures.map((f) => (
                <article className="c-feature" key={f.title}>
                  <span className="c-feature-icon" aria-hidden="true">
                    {residentIcon(f.title)}
                  </span>
                  <h3>{f.title}</h3>
                  <p>{f.text}</p>
                </article>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ---------- Təhlükəsizlik ---------- */

export function Security() {
  return (
    <section className="c-section" id="tehlukesizlik">
      <div className="c-wrap">
        <SectionHead
          title="Etibarlı və izlənə bilən"
          subtitle="Maliyyə və şəxsi məlumatlar yalnız səlahiyyəti olanlara açıqdır"
        />
        <div className="c-security-grid">
          {security.map((s) => (
            <article className="c-feature" key={s.title}>
              <span className="c-feature-icon" aria-hidden="true">
                {securityIcon(s.title)}
              </span>
              <h3>{s.title}</h3>
              <p>{s.text}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ---------- Haqqımızda ---------- */

export function About() {
  return (
    <section className="c-section" id="haqqinda">
      <div className="c-wrap">
        <div className="c-about-card">
          <div>
            <span className="c-badge c-badge-terracotta">HAQQIMIZDA</span>
            <h2>
              Məhəllə idarəçiliyində
              <br />
              aydınlıq üçün.
            </h2>
          </div>
          <div className="c-about-text">
            {about.text.map((t) => (
              <p key={t}>{t}</p>
            ))}
            <div className="c-tags">
              {about.values.map((v) => (
                <span key={v}>{v}</span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ---------- Son xəbərlər ---------- */

export async function LatestNews() {
  const articles = await getLatestArticles(3);

  return (
    <section className="c-section" id="xeberler">
      <div className="c-wrap">
        <SectionHead
          title="Son xəbərlər"
          subtitle="Kooperativdən elanlar və yeniliklər"
          action={{ href: "/xeberler", label: "Hamısı" }}
        />

        {articles.length === 0 ? (
          <p className="c-news-empty">Hələ xəbər yayımlanmayıb. Yeni elanlar burada görünəcək.</p>
        ) : (
          <div className="c-news-grid">
            {articles.map((a) => {
              const publishedAt = a.publishedAt ?? a.createdAt;
              return (
                <Link key={a.id} href={`/xeberler/${a.id}`} className="c-news-card">
                  <div className="c-news-top">
                    <span className="c-badge c-badge-terracotta">XƏBƏRLƏR</span>
                    <span className="c-news-date">
                      <CalendarIcon size={12} />
                      {formatArticleDate(publishedAt)}
                    </span>
                  </div>
                  <h3>{a.title}</h3>
                  <p>{a.summary}</p>
                  <div className="c-news-foot">
                    <span className="c-read-pill">
                      Ətraflı oxu
                      <ArrowRightIcon size={13} />
                    </span>
                    <span className="c-read-time">Təxmini oxuma: 2 dəq</span>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}

/* ---------- FAQ ---------- */

export function Faq() {
  return (
    <section className="c-section" id="faq">
      <div className="c-wrap">
        <SectionHead title="Tez-tez verilən suallar" subtitle="Ən çox soruşulanlar" />
        <div className="c-faq">
          {faqs.map((f) => (
            <details key={f.q}>
              <summary>{f.q}</summary>
              <p>{f.a}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ---------- Əlaqə ---------- */

export async function Contact() {
  const company = await getCompanyContactInfo();
  const cards = [
    {
      icon: <MailIcon size={17} />,
      className: "is-mail",
      label: "E-poçt",
      value: company.email,
      hint: "Məktub göndər",
      href: company.email ? `mailto:${company.email}` : undefined,
    },
    {
      icon: <PhoneIcon size={17} />,
      className: "is-phone",
      label: "Telefon",
      value: company.phone ?? "Əlavə olunacaq",
      hint: "Zəng et",
      href: company.phone ? `tel:${company.phone.replace(/[^\d+]/g, "")}` : undefined,
    },
    {
      icon: <PinIcon size={17} />,
      className: "is-pin",
      label: "Ünvan",
      value: company.address,
      href: undefined,
    },
    {
      icon: <ClockIcon size={17} />,
      className: "is-clock",
      label: "İş saatları",
      value: company.workHours ?? "Əlavə olunacaq",
      href: undefined,
    },
  ];

  return (
    <section className="c-section" id="elaqe">
      <div className="c-wrap">
        <SectionHead
          title="Bizimlə əlaqə"
          subtitle="Sualınız və ya giriş tələbiniz varsa, yazın və ya zəng edin"
        />
        <div className="c-contact-grid">
          {cards.map((c) => {
            const body = (
              <>
                <span className="c-feature-icon" aria-hidden="true">
                  {c.icon}
                </span>
                <span className="c-contact-card-body">
                  <small>{c.label}</small>
                  <strong>{c.value}</strong>
                  {c.hint && <span className="c-contact-hint">{c.hint}</span>}
                </span>
              </>
            );
            return c.href ? (
              <a key={c.label} href={c.href} className={`c-contact-card ${c.className}`}>
                {body}
              </a>
            ) : (
              <div key={c.label} className={`c-contact-card ${c.className}`}>
                {body}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
