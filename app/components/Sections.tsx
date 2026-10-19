import Link from "next/link";
import { Arrow } from "./Arrow";
import { LoginButton } from "./LoginButton";
import { formatNewsDate, news } from "../news";
import { about, compare, contact, faqs, residentFeatures, security } from "../landingContent";

function Heading({ eyebrow, children, lead }: { eyebrow: string; children: React.ReactNode; lead?: string }) {
  return (
    <div className="section-heading">
      <div>
        <div className="eyebrow">{eyebrow}</div>
        <h2>{children}</h2>
      </div>
      {lead && <p>{lead}</p>}
    </div>
  );
}

export function Compare() {
  return (
    <section className="lp-compare section-wrap" id="muqayise">
      <Heading eyebrow="DƏYİŞİKLİK" lead="Dağınıq qeydlərdən vahid sistemə keçidin fərqi.">
        Əvvəl və <span>indi.</span>
      </Heading>
      <div className="lp-compare-grid">
        <div className="lp-compare-col lp-before">
          <h3>Əvvəl</h3>
          <ul>{compare.before.map((t) => <li key={t}>{t}</li>)}</ul>
        </div>
        <div className="lp-compare-col lp-after">
          <h3>Sistemlə</h3>
          <ul>{compare.after.map((t) => <li key={t}>{t}</li>)}</ul>
        </div>
      </div>
    </section>
  );
}

export function Residents() {
  return (
    <section className="lp-residents" id="sakinler">
      <div className="section-wrap lp-residents-inner">
        <div className="lp-residents-copy">
          <div className="eyebrow">SAKİNLƏR ÜÇÜN</div>
          <h2>
            Mənzil sahibisinizsə,
            <br />
            <span>hər şey əlinizdədir.</span>
          </h2>
          <p>Şəxsi panelinizə daxil olun, borcunuzu yoxlayın və idarəyə müraciət göndərin.</p>
          <LoginButton className="button button-dark">
            Şəxsi panelə daxil ol <Arrow />
          </LoginButton>
        </div>
        <div className="lp-residents-grid">
          {residentFeatures.map((f) => (
            <article key={f.title}>
              <span className="feature-icon">{f.icon}</span>
              <h3>{f.title}</h3>
              <p>{f.text}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

export function Security() {
  return (
    <section className="lp-security section-wrap" id="tehlukesizlik">
      <Heading eyebrow="TƏHLÜKƏSİZLİK" lead="Maliyyə və şəxsi məlumatlar yalnız səlahiyyəti olanlara açıqdır.">
        Etibarlı və <span>izlənə bilən.</span>
      </Heading>
      <div className="lp-security-grid">
        {security.map((s) => (
          <article key={s.title}>
            <span className="feature-icon">{s.icon}</span>
            <h3>{s.title}</h3>
            <p>{s.text}</p>
          </article>
        ))}
      </div>
    </section>
  );
}

export function About() {
  return (
    <section className="lp-about section-wrap" id="haqqinda">
      <div className="lp-about-card">
        <div>
          <div className="eyebrow">HAQQIMIZDA</div>
          <h2>
            Məhəllə idarəçiliyində
            <br />
            <span>aydınlıq üçün.</span>
          </h2>
        </div>
        <div className="lp-about-text">
          {about.text.map((t) => <p key={t}>{t}</p>)}
          <div className="role-tags">
            {about.values.map((v) => <span key={v}>{v}</span>)}
          </div>
        </div>
      </div>
    </section>
  );
}

/** Ana səhifə üçün: ən son 3 xəbər və hamısına keçid. */
export function LatestNews() {
  return (
    <section className="lp-news lp-news-home section-wrap" id="xeberler">
      <Heading eyebrow="XƏBƏRLƏR" lead="Sistemdəki yeniliklər və kooperativ elanları.">
        Son <span>xəbərlər.</span>
      </Heading>
      <div className="lp-news-grid">
        {news.slice(0, 3).map((n) => (
          <Link key={n.slug} href={`/xeberler/${n.slug}`} className="lp-news-card">
            <div className="lp-news-meta">
              <em>{n.category}</em>
              <time dateTime={n.date}>{formatNewsDate(n.date)}</time>
            </div>
            <h3>{n.title}</h3>
            <p>{n.excerpt}</p>
          </Link>
        ))}
      </div>
      <Link className="text-link lp-more" href="/xeberler">
        Bütün xəbərlər →
      </Link>
    </section>
  );
}

export function Faq() {
  return (
    <section className="lp-faq section-wrap" id="faq">
      <Heading eyebrow="FAQ">
        Tez-tez verilən <span>suallar.</span>
      </Heading>
      <div className="lp-faq-list">
        {faqs.map((f) => (
          <details key={f.q}>
            <summary>{f.q}</summary>
            <p>{f.a}</p>
          </details>
        ))}
      </div>
    </section>
  );
}

export function Contact() {
  return (
    <section className="lp-contact section-wrap" id="elaqe">
      <Heading eyebrow="ƏLAQƏ" lead="Sualınız və ya giriş tələbiniz varsa, bizimlə əlaqə saxlayın.">
        Bizimlə <span>əlaqə.</span>
      </Heading>
      <div className="lp-contact-grid">
        {contact.map((c) => {
          const body = (
            <>
              <span className="feature-icon">{c.icon}</span>
              <small>{c.label}</small>
              <strong>{c.value}</strong>
            </>
          );
          return c.href ? (
            <a key={c.label} href={c.href} className="lp-contact-card">{body}</a>
          ) : (
            <div key={c.label} className="lp-contact-card">{body}</div>
          );
        })}
      </div>
    </section>
  );
}
