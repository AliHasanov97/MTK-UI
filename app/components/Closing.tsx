import { Arrow } from "./Arrow";
import { LoginButton } from "./LoginButton";
import { getCompanyName } from "../lib/api/company";

export async function Closing() {
  const name = await getCompanyName();
  return (
    <section className="lp-closing section-wrap">
      <div>
        <div className="eyebrow">{name.toLocaleUpperCase("az")} · İDARƏETMƏ SİSTEMİ</div>
        <h2>
          İdarəetmədə aydınlıq
          <br />
          elə buradan başlayır.
        </h2>
      </div>
      <div className="lp-closing-actions">
        <LoginButton className="button button-dark">
          Daxil ol <Arrow />
        </LoginButton>
        <a className="text-link" href="mailto:info@mtk.az">
          Bizimlə əlaqə saxla
        </a>
      </div>
    </section>
  );
}
