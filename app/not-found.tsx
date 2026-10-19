import Link from "next/link";
import type { Metadata } from "next";
import { StatusPage } from "./components/StatusPage";
import { BackButton } from "./components/BackButton";
import { getCompanyName } from "./lib/api/company";

export const metadata: Metadata = { title: "Səhifə tapılmadı" };

export default async function NotFound() {
  const name = await getCompanyName();

  return (
    <StatusPage
      code="404"
      brand={name}
      title="Səhifə tapılmadı"
      text="Axtardığınız səhifə mövcud deyil, silinib və ya ünvanı dəyişib. Ünvanı yoxlayın və ya ana səhifəyə qayıdın."
      extra={
        <nav className="sp-links" aria-label="Faydalı keçidlər">
          <small>Faydalı keçidlər</small>
          <div>
            <Link href="/sistem">Sistem</Link>
            <Link href="/telimat">Təlimat</Link>
            <Link href="/xeberler">Xəbərlər</Link>
            <Link href="/faq">FAQ</Link>
            <Link href="/elaqe">Əlaqə</Link>
          </div>
        </nav>
      }
    >
      <Link href="/" className="sp-btn sp-btn-primary">
        Ana səhifəyə qayıt
      </Link>
      <BackButton className="sp-btn" />
    </StatusPage>
  );
}
