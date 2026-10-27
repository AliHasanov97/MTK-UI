import Image from "next/image";
import Link from "next/link";
import { VIDEO_DURATION, VIDEO_POSTER } from "../video";

export function VideoFeature() {
  return (
    <Link className="c-video-feature" href="/taqdimat">
      <div className="c-video-feature-copy">
        <span className="c-video-feature-eyebrow">
          Video təqdimat · {VIDEO_DURATION}
        </span>
        <h2>Sistemi 24 dəqiqədə görün.</h2>
        <p>
          Binalar, maliyyə, inventar, HR və sakin müraciətləri — bütün modullar
          bir təqdimatda. Hər modulun videosu uyğun yazılı təlimatın içindədir.
        </p>
        <span className="c-video-feature-cta">
          Videoya bax
          <span aria-hidden="true">→</span>
        </span>
      </div>

      <div className="c-video-feature-media" aria-hidden="true">
        <Image
          src={VIDEO_POSTER}
          alt=""
          fill
          sizes="(max-width: 820px) 100vw, 420px"
        />
        <span className="c-video-feature-play">▶</span>
        <span className="c-video-feature-time">{VIDEO_DURATION}</span>
      </div>
    </Link>
  );
}
