import type { GuideVideo } from "../video";
import { SiteVideoPlayer } from "./SiteVideoPlayer";

export function GuideVideoPlayer({
  video,
  title,
}: {
  video: GuideVideo;
  title?: string;
}) {
  return (
    <div className="c-video-frame c-video-frame-native">
      <SiteVideoPlayer
        youtubeId={video.youtubeId}
        start={video.start}
        poster={video.poster}
        title={title ?? video.title}
        duration={video.duration}
      />
    </div>
  );
}
