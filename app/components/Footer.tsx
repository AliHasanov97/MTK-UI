import Link from "next/link";
import { Logo } from "./Logo";
import { getCompanyContactInfo, getCompanyName } from "../lib/api/company";
import { DownloadIcon, MailIcon, PhoneIcon, PinIcon } from "./icons";

export async function Footer() {
  const [name, contact] = await Promise.all([getCompanyName(), getCompanyContactInfo()]);

  return (
    <footer className="site-footer">
      <div className="c-footer-inner">
        <div className="c-footer-brand">
          <Logo name={name} href="/" variant="footer" />
          <p className="c-footer-note">
            Binalar, mənzillər, hesablar, maliyyə, inventar və işçi heyəti — bir ortaq
            məlumat bazasında.
          </p>

          <Link className="c-footer-app" href="/#android">
            <span className="c-footer-app-icon" aria-hidden="true">
              <DownloadIcon size={15} />
            </span>
            <span>
              <strong>Android tətbiq</strong>
              <small>APK yüklə</small>
            </span>
          </Link>
        </div>

        <nav className="c-footer-col" aria-label="Məhsul">
          <h4>Məhsul</h4>
          <Link href="/sistem">Sistem haqqında</Link>
          <Link href="/taqdimat">Video təqdimat</Link>
          <Link href="/telimat">Təlimat</Link>
          <Link href="/xeberler">Xəbərlər</Link>
          <Link href="/faq">FAQ</Link>
        </nav>

        <nav className="c-footer-col" aria-label="Şirkət">
          <h4>Şirkət</h4>
          <Link href="/haqqimizda">Haqqımızda</Link>
          <Link href="/elaqe">Əlaqə</Link>
          <Link href="/mexfilik">Məxfilik</Link>
        </nav>

        <div className="c-footer-col c-footer-contact">
          <h4>Əlaqə</h4>
          <a href={`mailto:${contact.email}`}>
            <MailIcon size={14} />
            {contact.email}
          </a>
          {contact.phone && (
            <a href={`tel:${contact.phone.replace(/\s+/g, "")}`}>
              <PhoneIcon size={14} />
              {contact.phone}
            </a>
          )}
          <span>
            <PinIcon size={14} />
            {contact.address}
          </span>
        </div>
      </div>

      <div className="c-footer-bottom">
        <span>
          © {new Date().getFullYear()} {name}. Bütün hüquqlar qorunur.
        </span>
        <div className="c-footer-bottom-links">
          <Link href="/mexfilik">Məxfilik</Link>
          <Link href="/faq">FAQ</Link>
          <a
            className="c-footer-made"
            href="https://www.linkedin.com/in/alihasanov97"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Hazırlayan: Əli Həsənov — LinkedIn profili"
          >
            <span className="c-footer-made-label">Hazırlayan</span>
            <strong>Əli Həsənov</strong>
            <svg viewBox="0 0 24 24" width="13" height="13" fill="currentColor" aria-hidden="true">
              <path d="M20.45 20.45h-3.56v-5.57c0-1.33-.02-3.04-1.85-3.04-1.86 0-2.14 1.45-2.14 2.94v5.67H9.34V9h3.42v1.56h.05c.48-.9 1.64-1.85 3.37-1.85 3.6 0 4.27 2.37 4.27 5.46v6.28zM5.34 7.43a2.06 2.06 0 1 1 0-4.13 2.06 2.06 0 0 1 0 4.13zM7.12 20.45H3.56V9h3.56v11.45zM22.22 0H1.77C.79 0 0 .77 0 1.73v20.54C0 23.23.79 24 1.77 24h20.45c.98 0 1.78-.77 1.78-1.73V1.73C24 .77 23.2 0 22.22 0z" />
            </svg>
          </a>
        </div>
      </div>
    </footer>
  );
}
