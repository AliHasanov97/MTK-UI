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
          <span className="c-footer-made">
            Azərbaycanda hazırlanıb
            <i aria-hidden="true" />
          </span>
        </div>
      </div>
    </footer>
  );
}
