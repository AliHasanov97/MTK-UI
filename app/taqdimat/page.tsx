import type { Metadata } from "next";
import Link from "next/link";
import { SiteShell } from "../components/SiteShell";
import { PageHero } from "../components/PageHero";
import { LoginButton } from "../components/LoginButton";
import { VideoExperience } from "../components/VideoExperience";
import { getGuide } from "../guides";
import {
  VIDEO_DESCRIPTION,
  VIDEO_EMBED_URL,
  VIDEO_POSTER,
  VIDEO_TITLE,
  VIDEO_UPLOAD_DATE,
  VIDEO_YOUTUBE_URL,
} from "../video";

export const metadata: Metadata = {
  title: "Video təqdimat — MTK idarəetmə sistemi",
  description:
    "MTK idarəetmə sisteminin 24 dəqiqəlik tam təqdimatı: binalar, maliyyə, inventar, HR, müraciətlər, rollar və audit.",
  openGraph: {
    title: "MTK idarəetmə sistemi — 24 dəqiqəlik video təqdimat",
    description:
      "Binalar, maliyyə, inventar, HR və sakin müraciətləri — bütün modullar bir videoda.",
    type: "video.other",
    images: [
      {
        url: VIDEO_POSTER,
        width: 1280,
        height: 720,
        alt: "MTK idarəetmə sistemi təqdimatı",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "MTK idarəetmə sistemi — 24 dəqiqəlik video təqdimat",
    description:
      "Binalar, maliyyə, inventar, HR və sakin müraciətləri — bütün modullar bir videoda.",
    images: [VIDEO_POSTER],
  },
};

const relatedSlugs = ["binalar", "maliyye", "hr", "istifadeciler"];
const related = relatedSlugs
  .map((slug) => getGuide(slug))
  .filter((guide) => guide !== undefined);

const videoSchema = {
  "@context": "https://schema.org",
  "@type": "VideoObject",
  name: VIDEO_TITLE,
  description: VIDEO_DESCRIPTION,
  thumbnailUrl: [VIDEO_POSTER],
  uploadDate: VIDEO_UPLOAD_DATE,
  duration: "PT24M",
  contentUrl: VIDEO_YOUTUBE_URL,
  embedUrl: VIDEO_EMBED_URL,
  inLanguage: "az",
  isFamilyFriendly: true,
  publisher: {
    "@type": "Organization",
    name: "MTK",
  },
};

export default function VideoPage() {
  return (
    <SiteShell>
      <PageHero
        eyebrow="VİDEO TƏQDİMAT"
        title={
          <>
            Sistemi <span>24 dəqiqədə</span> kəşf edin.
          </>
        }
        lead="Binalar, maliyyə, inventar, HR və sakin müraciətləri — MTK-nın bütün imkanları bir təqdimatda. Hər modulun ayrıca videosu uyğun yazılı təlimatın içindədir."
        crumbs={[
          { href: "/sistem", label: "Sistem" },
          { label: "Video təqdimat" },
        ]}
      />

      <section className="c-section">
        <div className="c-wrap">
          <VideoExperience />

          <div className="c-video-summary">
            <div>
              <span className="c-badge c-badge-terracotta">
                24 dəqiqəlik tur
              </span>
              <h2>Bir videoda bütün MTK</h2>
              <p>
                Video sistemin ümumi mənzərəsini göstərir: binalar və
                mənzillər, inventar, maliyyə əməliyyatları, əmək haqqı və HR,
                tranzaksiyalar, hesabatlar, sakin müraciətləri, rollar və audit.
              </p>
              <p className="c-video-note">
                Video 26.10.2026 tarixində yayımlanıb. İnterfeys yeniləndikcə
                yazılı təlimatlar daha aktual mənbə olaraq qalır.
              </p>
            </div>
            <div className="c-video-summary-points" aria-label="Video mövzuları">
              <span>Binalar və mənzillər</span>
              <span>İnventar və anbar</span>
              <span>Maliyyə və müqavilələr</span>
              <span>HR və əmək haqqı</span>
              <span>Müraciətlər</span>
              <span>Rollar və audit</span>
            </div>
          </div>
        </div>
      </section>

      <section className="c-section c-section-tight">
        <div className="c-wrap">
          <div className="c-sec-head">
            <div>
              <h2>Yazılı təlimatlar</h2>
              <p>Hər modulun videosu həmin təlimatın səhifəsindədir.</p>
            </div>
            <Link className="c-pill-link" href="/telimat">
              Bütün təlimatlar →
            </Link>
          </div>

          <div className="c-guide-grid">
            {related.map((guide) => (
              <Link
                key={guide.slug}
                href={`/telimat/${guide.slug}`}
                className="c-guide-card"
              >
                <span
                  className="c-module-icon is-terracotta"
                  aria-hidden="true"
                  style={{ fontSize: 18 }}
                >
                  {guide.icon}
                </span>
                <h3>{guide.title}</h3>
                <p>{guide.summary}</p>
                <span className="c-video-guide-link">Təlimata bax →</span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="c-section c-section-tight">
        <div className="c-wrap">
          <div className="c-video-cta">
            <div>
              <h2>Sistemi yaxından görmək istəyirsiniz?</h2>
              <p>Panelə daxil olun və ya yazılı təlimatlarla başlayın.</p>
            </div>
            <div className="c-video-cta-actions">
              <LoginButton className="c-btn c-btn-orange">
                Panelə daxil ol
              </LoginButton>
              <Link className="c-btn c-btn-ghost" href="/telimat">
                Yazılı təlimatlar
              </Link>
            </div>
          </div>
        </div>
      </section>

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(videoSchema).replace(/</g, "\\u003c"),
        }}
      />
    </SiteShell>
  );
}
