import {
  VIDEO_DURATION_SECONDS,
  VIDEO_POSTER,
  VIDEO_SRC,
  VIDEO_TITLE,
} from "../video";
import { SiteVideoPlayer } from "./SiteVideoPlayer";

export function VideoExperience() {
  return (
    <div className="c-video-full">
      <div className="c-video-frame c-video-frame-native">
        <SiteVideoPlayer
          src={VIDEO_SRC}
          poster={VIDEO_POSTER}
          title={VIDEO_TITLE}
          duration={VIDEO_DURATION_SECONDS}
        />
      </div>
    </div>
  );
}
