"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type {
  CSSProperties,
  ChangeEvent,
  KeyboardEvent,
  SyntheticEvent,
} from "react";
import { formatVideoTime } from "../video";

type SiteVideoPlayerProps = {
  src: string;
  poster: string;
  title: string;
  duration?: number;
  eyebrow?: string;
};

function PlayIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d="M8 5.2v13.6L19 12 8 5.2Z" fill="currentColor" />
    </svg>
  );
}

function PauseIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d="M7 5h3.4v14H7V5Zm6.6 0H17v14h-3.4V5Z" fill="currentColor" />
    </svg>
  );
}

function ReplayIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path
        d="M4.4 12a7.6 7.6 0 1 0 2.23-5.37"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="2"
      />
      <path
        d="M4 4.5v5h5"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
      />
    </svg>
  );
}

function VolumeIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d="M4 9.5v5h3.6L12 18V6L7.6 9.5H4Z" fill="currentColor" />
      <path
        d="M15.3 8.7a4.8 4.8 0 0 1 0 6.6M18 6.2a8.4 8.4 0 0 1 0 11.6"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="1.8"
      />
    </svg>
  );
}

function MutedIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d="M4 9.5v5h3.6L12 18V6L7.6 9.5H4Z" fill="currentColor" />
      <path
        d="m15.6 9.2 5 5.6m0-5.6-5 5.6"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="1.8"
      />
    </svg>
  );
}

function FullscreenIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path
        d="M8.5 4H4v4.5M15.5 4H20v4.5M20 15.5V20h-4.5M4 15.5V20h4.5"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
      />
    </svg>
  );
}

function ExitFullscreenIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path
        d="M9 4v5H4M15 4v5h5M20 15h-5v5M4 15h5v5"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
      />
    </svg>
  );
}

export function SiteVideoPlayer({
  src,
  poster,
  title,
  duration: initialDuration,
  eyebrow,
}: SiteVideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const playerRef = useRef<HTMLDivElement>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);
  const [isEnded, setIsEnded] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isBuffering, setIsBuffering] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(initialDuration ?? 0);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(document.fullscreenElement === playerRef.current);
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () =>
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, []);

  const togglePlay = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;

    if (video.ended) {
      video.currentTime = 0;
      setIsEnded(false);
    }

    if (video.paused) {
      void video.play().catch(() => {});
    } else {
      video.pause();
    }
  }, []);

  const seekBy = useCallback((seconds: number) => {
    const video = videoRef.current;
    if (!video) return;

    const max = Number.isFinite(video.duration) ? video.duration : 0;
    const next = Math.max(0, Math.min(max, video.currentTime + seconds));
    video.currentTime = next;
    setCurrentTime(next);
    setIsEnded(false);
  }, []);

  const toggleMute = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;

    video.muted = !video.muted;
    setIsMuted(video.muted);
  }, []);

  const toggleFullscreen = useCallback(async () => {
    const player = playerRef.current;
    const video = videoRef.current;
    if (!player || !video) return;

    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
        return;
      }

      if (player.requestFullscreen) {
        await player.requestFullscreen();
        return;
      }

      const webkitVideo = video as HTMLVideoElement & {
        webkitEnterFullscreen?: () => void;
      };
      webkitVideo.webkitEnterFullscreen?.();
    } catch {
      // Brauzer tam ekranı bloklayıbsa, pleyer normal rejimdə qalır.
    }
  }, []);

  const handleMetadata = (event: SyntheticEvent<HTMLVideoElement>) => {
    const video = event.currentTarget;
    if (Number.isFinite(video.duration)) {
      setDuration(video.duration);
    }
    setIsMuted(video.muted);
  };

  const handleTimeUpdate = (event: SyntheticEvent<HTMLVideoElement>) => {
    setCurrentTime(event.currentTarget.currentTime);
  };

  const handleSeek = (event: ChangeEvent<HTMLInputElement>) => {
    const video = videoRef.current;
    if (!video) return;

    const next = Number(event.target.value);
    video.currentTime = next;
    setCurrentTime(next);
    setIsEnded(false);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const target = event.target;
    if (target instanceof HTMLElement && target.closest("input, button, a")) {
      return;
    }

    if (event.key === " " || event.key.toLowerCase() === "k") {
      event.preventDefault();
      togglePlay();
      return;
    }

    if (event.key === "ArrowLeft") {
      event.preventDefault();
      seekBy(-5);
      return;
    }

    if (event.key === "ArrowRight") {
      event.preventDefault();
      seekBy(5);
      return;
    }

    if (event.key.toLowerCase() === "m") {
      event.preventDefault();
      toggleMute();
      return;
    }

    if (event.key.toLowerCase() === "f") {
      event.preventDefault();
      void toggleFullscreen();
    }
  };

  const safeDuration = duration || 0;
  const progress = safeDuration
    ? Math.min(100, Math.max(0, (currentTime / safeDuration) * 100))
    : 0;
  const progressStyle = {
    "--c-player-progress": `${progress}%`,
  } as CSSProperties;

  return (
    <div
      ref={playerRef}
      className="c-player"
      role="group"
      aria-label={title}
      tabIndex={0}
      onKeyDown={handleKeyDown}
    >
      <video
        ref={videoRef}
        className="c-player-video"
        poster={poster}
        preload="metadata"
        playsInline
        aria-label={title}
        onClick={togglePlay}
        onDoubleClick={() => void toggleFullscreen()}
        onLoadedMetadata={handleMetadata}
        onDurationChange={handleMetadata}
        onTimeUpdate={handleTimeUpdate}
        onPlay={() => {
          setHasStarted(true);
          setIsPlaying(true);
          setIsEnded(false);
          setIsBuffering(false);
        }}
        onPause={() => {
          setIsPlaying(false);
          setIsBuffering(false);
        }}
        onEnded={() => {
          setIsPlaying(false);
          setIsEnded(true);
          setIsBuffering(false);
        }}
        onWaiting={() => setIsBuffering(true)}
        onCanPlay={() => setIsBuffering(false)}
        onPlaying={() => setIsBuffering(false)}
        onVolumeChange={(event) => setIsMuted(event.currentTarget.muted)}
      >
        <source src={src} type="video/mp4" />
        Brauzeriniz videonu dəstəkləmir.
      </video>

      <div
        className={`c-player-overlay${
          isPlaying ? " is-hidden" : ""
        }${hasStarted ? " is-started" : ""}`}
      >
        {eyebrow ? <span className="c-player-eyebrow">{eyebrow}</span> : null}
        <button
          type="button"
          className="c-player-center"
          onClick={togglePlay}
          aria-label={isEnded ? "Videonu yenidən oynat" : "Videonu oynat"}
        >
          {isEnded ? <ReplayIcon /> : <PlayIcon />}
        </button>
      </div>

      {isBuffering && isPlaying && (
        <span className="c-player-spinner" aria-hidden="true" />
      )}

      <div className="c-player-controls">
        <input
          type="range"
          className="c-player-range"
          min={0}
          max={safeDuration}
          step="0.1"
          value={Math.min(currentTime, safeDuration)}
          onChange={handleSeek}
          disabled={!safeDuration}
          aria-label="Video mövqeyi"
          aria-valuetext={`${formatVideoTime(currentTime)} / ${formatVideoTime(
            safeDuration,
          )}`}
          style={progressStyle}
        />

        <div className="c-player-row">
          <button
            type="button"
            className="c-player-btn"
            onClick={togglePlay}
            aria-label={isPlaying ? "Fasilə ver" : "Oynat"}
            title={isPlaying ? "Fasilə ver" : "Oynat"}
          >
            {isPlaying ? <PauseIcon /> : <PlayIcon />}
          </button>

          <button
            type="button"
            className="c-player-btn"
            onClick={toggleMute}
            aria-label={isMuted ? "Səsi aç" : "Səsi söndür"}
            title={isMuted ? "Səsi aç" : "Səsi söndür"}
          >
            {isMuted ? <MutedIcon /> : <VolumeIcon />}
          </button>

          <span className="c-player-time">
            <strong>{formatVideoTime(currentTime)}</strong>
            <span> / {formatVideoTime(safeDuration)}</span>
          </span>

          <span className="c-player-spacer" />

          <button
            type="button"
            className="c-player-btn"
            onClick={() => void toggleFullscreen()}
            aria-label={isFullscreen ? "Tam ekrandan çıx" : "Tam ekran"}
            title={isFullscreen ? "Tam ekrandan çıx" : "Tam ekran"}
          >
            {isFullscreen ? <ExitFullscreenIcon /> : <FullscreenIcon />}
          </button>
        </div>
      </div>
    </div>
  );
}
