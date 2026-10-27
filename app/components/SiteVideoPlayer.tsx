"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { CSSProperties, ChangeEvent, KeyboardEvent } from "react";
import { formatVideoTime } from "../video";

type SiteVideoPlayerProps = {
  youtubeId: string;
  poster: string;
  title: string;
  duration?: number;
  start?: number;
  eyebrow?: string;
  /** Pleyer hazır olan kimi videonu başladır (istifadəçi klikindən sonra). */
  autoPlay?: boolean;
};

type YouTubePlayer = {
  playVideo: () => void;
  pauseVideo: () => void;
  seekTo: (seconds: number, allowSeekAhead: boolean) => void;
  mute: () => void;
  unMute: () => void;
  isMuted: () => boolean;
  getCurrentTime: () => number;
  getDuration: () => number;
  getPlayerState: () => number;
  destroy: () => void;
};

type YouTubePlayerEvent = {
  target: YouTubePlayer;
  data?: number;
};

type YouTubeNamespace = {
  Player: new (
    element: HTMLElement,
    options: {
      videoId: string;
      playerVars?: Record<string, string | number | undefined>;
      events?: {
        onReady?: (event: YouTubePlayerEvent) => void;
        onStateChange?: (event: YouTubePlayerEvent) => void;
        onError?: () => void;
      };
    },
  ) => YouTubePlayer;
};

declare global {
  interface Window {
    YT?: YouTubeNamespace;
    onYouTubeIframeAPIReady?: () => void;
  }
}

const YT_STATE = {
  ENDED: 0,
  PLAYING: 1,
  PAUSED: 2,
  BUFFERING: 3,
} as const;

type LockableScreenOrientation = ScreenOrientation & {
  lock?: (orientation: "landscape" | "portrait") => Promise<void>;
  unlock?: () => void;
};

function lockLandscapeOrientation() {
  if (typeof window === "undefined") return;

  const orientation = window.screen?.orientation as
    | LockableScreenOrientation
    | undefined;

  if (!orientation?.lock) return;

  void orientation.lock("landscape").catch(() => {
    // Bəzi brauzerlər (məsələn, iOS Safari) orientasiya kilidini dəstəkləmir.
  });
}

function unlockOrientation() {
  if (typeof window === "undefined") return;

  const orientation = window.screen?.orientation as
    | LockableScreenOrientation
    | undefined;

  try {
    orientation?.unlock?.();
  } catch {
    // Orientasiya kilidi artıq açıqdırsa, əlavə heç nə etmək lazım deyil.
  }
}

let youtubeApiPromise: Promise<YouTubeNamespace> | null = null;

function loadYouTubeApi(): Promise<YouTubeNamespace> {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("YouTube API yalnız brauzerdə yüklənir."));
  }

  if (window.YT?.Player) {
    return Promise.resolve(window.YT);
  }

  if (youtubeApiPromise) {
    return youtubeApiPromise;
  }

  youtubeApiPromise = new Promise<YouTubeNamespace>((resolve, reject) => {
    const previous = window.onYouTubeIframeAPIReady;
    const timer = window.setTimeout(() => {
      reject(new Error("YouTube API yüklənmədi."));
    }, 15000);

    window.onYouTubeIframeAPIReady = () => {
      previous?.();
      window.clearTimeout(timer);

      if (window.YT?.Player) {
        resolve(window.YT);
      } else {
        reject(new Error("YouTube API hazır deyil."));
      }
    };

    if (
      !document.querySelector('script[src="https://www.youtube.com/iframe_api"]')
    ) {
      const script = document.createElement("script");
      script.src = "https://www.youtube.com/iframe_api";
      script.async = true;
      script.onerror = () => {
        window.clearTimeout(timer);
        reject(new Error("YouTube API yüklənmədi."));
      };
      document.head.appendChild(script);
    }
  }).catch((error: unknown) => {
    youtubeApiPromise = null;
    throw error;
  });

  return youtubeApiPromise;
}

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
  youtubeId,
  poster,
  title,
  duration: initialDuration,
  start = 0,
  eyebrow,
  autoPlay = false,
}: SiteVideoPlayerProps) {
  const playerRef = useRef<YouTubePlayer | null>(null);
  const playerHostRef = useRef<HTMLDivElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const segmentStart = Math.max(0, start);
  const segmentDurationRef = useRef(initialDuration ?? 0);
  const endedRef = useRef(false);

  const [isReady, setIsReady] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);
  const [isEnded, setIsEnded] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isBuffering, setIsBuffering] = useState(false);
  const [isError, setIsError] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(initialDuration ?? 0);
  const [showControls, setShowControls] = useState(true);
  const hideControlsTimer = useRef<number | undefined>(undefined);

  useEffect(() => {
    const handleFullscreenChange = () => {
      const isPlayerFullscreen =
        document.fullscreenElement === wrapperRef.current;
      setIsFullscreen(isPlayerFullscreen);

      if (isPlayerFullscreen) {
        lockLandscapeOrientation();
      } else {
        unlockOrientation();
      }
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
      unlockOrientation();
    };
  }, []);

  const clearHideControlsTimer = useCallback(() => {
    if (hideControlsTimer.current !== undefined) {
      window.clearTimeout(hideControlsTimer.current);
      hideControlsTimer.current = undefined;
    }
  }, []);

  const scheduleHideControls = useCallback(() => {
    clearHideControlsTimer();
    if (!isPlaying || isEnded || isError) return;

    hideControlsTimer.current = window.setTimeout(() => {
      setShowControls(false);
    }, 2600);
  }, [clearHideControlsTimer, isEnded, isError, isPlaying]);

  const revealControls = useCallback(() => {
    setShowControls(true);
    scheduleHideControls();
  }, [scheduleHideControls]);

  useEffect(() => {
    if (!isPlaying || isEnded || isError) {
      clearHideControlsTimer();
      setShowControls(true);
      return;
    }

    scheduleHideControls();
    return clearHideControlsTimer;
  }, [
    clearHideControlsTimer,
    isEnded,
    isError,
    isPlaying,
    scheduleHideControls,
  ]);

  useEffect(() => {
    const host = playerHostRef.current;
    if (!host) return;

    let cancelled = false;
    let player: YouTubePlayer | null = null;
    let interval: number | undefined;

    segmentDurationRef.current = initialDuration ?? 0;
    endedRef.current = false;
    setIsReady(false);
    setIsPlaying(false);
    setHasStarted(false);
    setIsEnded(false);
    setIsBuffering(false);
    setIsError(false);
    setCurrentTime(0);
    setDuration(initialDuration ?? 0);

    const syncProgress = () => {
      if (!player || cancelled) return;

      const raw = player.getCurrentTime();
      if (!Number.isFinite(raw)) return;

      const max = segmentDurationRef.current;
      const local = Math.max(0, Math.min(max || 0, raw - segmentStart));
      setCurrentTime(local);

      if (!segmentStart) {
        const actual = player.getDuration();
        if (Number.isFinite(actual) && actual > 0 && actual !== max) {
          segmentDurationRef.current = actual;
          setDuration(actual);
        }
      }

      if (
        segmentStart > 0 &&
        max > 0 &&
        raw >= segmentStart + max - 0.25 &&
        !endedRef.current
      ) {
        endedRef.current = true;
        player.pauseVideo();
        setIsPlaying(false);
        setIsBuffering(false);
        setIsEnded(true);
        setCurrentTime(max);
      }
    };

    const mount = document.createElement("div");
    mount.className = "c-player-youtube";
    host.replaceChildren(mount);

    loadYouTubeApi()
      .then((YT) => {
        if (cancelled || !host.isConnected) return;

        player = new YT.Player(mount, {
          videoId: youtubeId,
          playerVars: {
            autohide: 1,
            autoplay: 0,
            controls: 0,
            disablekb: 1,
            fs: 0,
            iv_load_policy: 3,
            modestbranding: 1,
            playsinline: 1,
            rel: 0,
            showinfo: 0,
            start: segmentStart || undefined,
            origin: window.location.origin,
          },
          events: {
            onReady: (event) => {
              if (cancelled) return;

              playerRef.current = event.target;
              const actual = event.target.getDuration();

              if (segmentStart > 0) {
                segmentDurationRef.current = initialDuration ?? 0;
                setDuration(initialDuration ?? 0);
                event.target.seekTo(segmentStart, true);
                event.target.pauseVideo();
                setCurrentTime(0);
              } else if (Number.isFinite(actual) && actual > 0) {
                segmentDurationRef.current = actual;
                setDuration(actual);
              }

              setIsMuted(event.target.isMuted());
              setIsReady(true);
              if (autoPlay) {
                event.target.playVideo();
              }
              interval = window.setInterval(syncProgress, 250);
            },
            onStateChange: (event) => {
              if (cancelled) return;

              if (event.data === YT_STATE.PLAYING) {
                endedRef.current = false;
                setHasStarted(true);
                setIsPlaying(true);
                setIsEnded(false);
                setIsBuffering(false);
              } else if (event.data === YT_STATE.PAUSED) {
                setIsPlaying(false);
                setIsBuffering(false);
              } else if (event.data === YT_STATE.BUFFERING) {
                setIsBuffering(true);
              } else if (event.data === YT_STATE.ENDED) {
                setIsPlaying(false);
                setIsBuffering(false);
                setIsEnded(true);
                setCurrentTime(segmentDurationRef.current);
                // YouTube-un son ekranındakı tövsiyələri göstərmək əvəzinə
                // videonu başlanğıc kadra qaytarırıq; replay düyməsi görünür.
                event.target.seekTo(segmentStart, true);
                event.target.pauseVideo();
              }
            },
            onError: () => {
              if (cancelled) return;

              setIsError(true);
              setIsPlaying(false);
              setIsBuffering(false);
            },
          },
        });
      })
      .catch(() => {
        if (!cancelled) {
          setIsError(true);
          setIsBuffering(false);
        }
      });

    return () => {
      cancelled = true;
      if (interval !== undefined) {
        window.clearInterval(interval);
      }
      playerRef.current = null;
      try {
        player?.destroy();
      } catch {
        // Pleyer artıq dağıdılıbsa, əlavə heç nə etmək lazım deyil.
      }
      host.replaceChildren();
    };
  }, [youtubeId, segmentStart, initialDuration, autoPlay]);

  const togglePlay = useCallback(() => {
    const player = playerRef.current;
    if (!player || !isReady || isError) return;

    if (endedRef.current || isEnded) {
      endedRef.current = false;
      player.seekTo(segmentStart, true);
      setCurrentTime(0);
      setIsEnded(false);
    }

    const state = player.getPlayerState();
    if (state === YT_STATE.PLAYING || state === YT_STATE.BUFFERING) {
      player.pauseVideo();
    } else {
      player.playVideo();
    }
  }, [isEnded, isError, isReady, segmentStart]);

  const seekBy = useCallback(
    (seconds: number) => {
      const player = playerRef.current;
      if (!player || !isReady || isError) return;

      const max = duration || 0;
      const next = Math.max(0, Math.min(max, currentTime + seconds));
      player.seekTo(segmentStart + next, true);
      setCurrentTime(next);
      setIsEnded(false);
      endedRef.current = false;
    },
    [currentTime, duration, isError, isReady, segmentStart],
  );

  const toggleMute = useCallback(() => {
    const player = playerRef.current;
    if (!player || !isReady || isError) return;

    const muted = player.isMuted();
    if (muted) {
      player.unMute();
    } else {
      player.mute();
    }
    setIsMuted(!muted);
  }, [isError, isReady]);

  const toggleFullscreen = useCallback(async () => {
    const player = wrapperRef.current;
    if (!player) return;

    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
        unlockOrientation();
        return;
      }

      if (player.requestFullscreen) {
        await player.requestFullscreen();
        lockLandscapeOrientation();
      }
    } catch {
      // Brauzer tam ekranı bloklayıbsa, pleyer normal rejimdə qalır.
    }
  }, []);

  const handleSeek = (event: ChangeEvent<HTMLInputElement>) => {
    const player = playerRef.current;
    if (!player || !isReady || isError) return;

    const next = Number(event.target.value);
    player.seekTo(segmentStart + next, true);
    setCurrentTime(next);
    setIsEnded(false);
    endedRef.current = false;
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
      ref={wrapperRef}
      className="c-player"
      role="group"
      aria-label={title}
      tabIndex={0}
      onKeyDown={handleKeyDown}
      onMouseEnter={revealControls}
      onMouseMove={revealControls}
      onMouseLeave={scheduleHideControls}
      onFocusCapture={revealControls}
      onBlurCapture={scheduleHideControls}
    >
      <div className="c-player-embed" aria-hidden="true">
        <div ref={playerHostRef} />
      </div>

      <div
        className={`c-player-poster${hasStarted ? " is-hidden" : ""}`}
        style={{ backgroundImage: `url("${poster}")` }}
        aria-hidden="true"
      />

      <button
        type="button"
        className="c-player-hitarea"
        onClick={togglePlay}
        onDoubleClick={() => void toggleFullscreen()}
        disabled={!isReady || isError}
        tabIndex={-1}
        aria-label={isPlaying ? "Fasilə ver" : "Oynat"}
      />

      {isError ? (
        <div className="c-player-error" role="alert">
          Video yüklənmədi. YouTube bağlantısını və embed icazəsini yoxlayın.
        </div>
      ) : (
        <div
          className={`c-player-overlay${isPlaying ? " is-hidden" : ""}${
            hasStarted ? " is-started" : ""
          }`}
        >
          {eyebrow ? <span className="c-player-eyebrow">{eyebrow}</span> : null}
          <button
            type="button"
            className="c-player-center"
            onClick={togglePlay}
            disabled={!isReady}
            aria-label={isEnded ? "Videonu yenidən oynat" : "Videonu oynat"}
          >
            {isEnded ? <ReplayIcon /> : <PlayIcon />}
          </button>
        </div>
      )}

      {isBuffering && isReady && !isError && (
        <span className="c-player-spinner" aria-hidden="true" />
      )}

      <div
        className={`c-player-controls${showControls ? "" : " is-hidden"}`}
      >
        <input
          type="range"
          className="c-player-range"
          min={0}
          max={safeDuration}
          step="0.1"
          value={Math.min(currentTime, safeDuration)}
          onChange={handleSeek}
          disabled={!isReady || !safeDuration || isError}
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
            disabled={!isReady || isError}
            aria-label={isPlaying ? "Fasilə ver" : "Oynat"}
            title={isPlaying ? "Fasilə ver" : "Oynat"}
          >
            {isPlaying ? <PauseIcon /> : <PlayIcon />}
          </button>

          <button
            type="button"
            className="c-player-btn"
            onClick={toggleMute}
            disabled={!isReady || isError}
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
