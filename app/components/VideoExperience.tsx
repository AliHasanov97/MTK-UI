import {
  VIDEO_DURATION_SECONDS,
  VIDEO_POSTER,
  VIDEO_TITLE,
  VIDEO_YOUTUBE_ID,
} from "../video";
import { SiteVideoPlayer } from "./SiteVideoPlayer";

export function VideoExperience() {
  return (
    <div className="c-video-full">
      <div className="c-video-frame c-video-frame-native">
        <SiteVideoPlayer
          youtubeId={VIDEO_YOUTUBE_ID}
          poster={VIDEO_POSTER}
          title={VIDEO_TITLE}
          duration={VIDEO_DURATION_SECONDS}
        />
      </div>
    </div>
  );
}
