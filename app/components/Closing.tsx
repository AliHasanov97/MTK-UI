import { Arrow } from "./Arrow";

export function Closing() {
  return (
    <section className="closing section-wrap">
      <div className="closing-mark">M</div>
      <div>
        <div className="eyebrow">MTK İDARƏETMƏ SİSTEMİ</div>
        <h2>
          İdarəetmədə aydınlıq
          <br />
          elə buradan başlayır.
        </h2>
      </div>
      <a className="button button-dark" href="mailto:info@mtk.az">
        Bizimlə əlaqə saxla <Arrow />
      </a>
    </section>
  );
}
