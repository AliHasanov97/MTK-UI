"use client";

import Image from "next/image";
import { useState } from "react";
import { SiteVideoPlayer } from "./SiteVideoPlayer";
import {
  PROMO_VIDEO_DURATION,
  PROMO_VIDEO_DURATION_SECONDS,
  PROMO_VIDEO_POSTER,
  PROMO_VIDEO_TITLE,
  PROMO_VIDEO_YOUTUBE_ID,
} from "../video";

const promoFacts = ["8 modul", "5 rol", "1 baza"];

export function PromoVideo() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <section className="c-section">
      <div className="c-wrap">
        {isOpen ? (
          <div className="c-promo-open">
            <div className="c-video-frame c-video-frame-native">
              <SiteVideoPlayer
                youtubeId={PROMO_VIDEO_YOUTUBE_ID}
                poster={PROMO_VIDEO_POSTER}
                title={PROMO_VIDEO_TITLE}
                duration={PROMO_VIDEO_DURATION_SECONDS}
                autoPlay
              />
            </div>
          </div>
        ) : (
          <div className="c-video-feature c-promo-card">
            <div className="c-video-feature-copy">
              <span className="c-video-feature-eyebrow">
                Qısa təqdimat · {PROMO_VIDEO_DURATION}
              </span>
              <h2>Sistemi 2 dəqiqədə kəşf edin.</h2>
              <p>
                Binalar, maliyyə, inventar, HR və sakin müraciətləri bir
                videoda.
              </p>
              <ul className="c-promo-facts">
                {promoFacts.map((fact) => (
                  <li key={fact}>{fact}</li>
                ))}
              </ul>
              <span className="c-video-feature-cta">
                Videoya bax
                <span aria-hidden="true">→</span>
              </span>
            </div>

            <div className="c-video-feature-media" aria-hidden="true">
              <Image
                src={PROMO_VIDEO_POSTER}
                alt=""
                fill
                sizes="(max-width: 820px) 100vw, 420px"
              />
              <span className="c-video-feature-play c-promo-play">▶</span>
              <span className="c-video-feature-time">
                {PROMO_VIDEO_DURATION}
              </span>
            </div>

            <button
              type="button"
              className="c-video-feature-trigger"
              onClick={() => setIsOpen(true)}
              aria-label="Qısa təqdimat videosuna bax"
            />
          </div>
        )}
      </div>
    </section>
  );
}
