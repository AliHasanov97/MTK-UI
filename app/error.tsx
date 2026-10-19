"use client";

import Link from "next/link";
import { useEffect } from "react";
import { StatusPage } from "./components/StatusPage";
import { useCompanyName } from "./components/CompanyName";

/** Gözlənilməz icra xətası (500). Next.js bu versiyada bərpa üçün `retry` verir. */
export default function Error({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  const name = useCompanyName();

  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <StatusPage
      code="500"
      brand={name}
      title="Gözlənilməz xəta baş verdi"
      text="Səhifəni yükləyərkən problem yarandı. Bu, müvəqqəti ola bilər, yenidən cəhd edin. Davam edərsə, idarəyə xəbər verin."
      digest={error.digest}
    >
      <button type="button" className="sp-btn sp-btn-primary" onClick={() => retry()}>
        Yenidən cəhd et
      </button>
      <Link href="/" className="sp-btn">
        Ana səhifə
      </Link>
    </StatusPage>
  );
}
