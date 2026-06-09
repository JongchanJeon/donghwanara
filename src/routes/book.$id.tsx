import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { Loader2, Pause, Play } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Layout } from "@/components/Layout";
import { getStory, type Lang, type Story } from "@/lib/stories";

export const Route = createFileRoute("/book/$id")({
  component: BookPage,
});

const LANGS: { key: Lang; label: string; flag: string; voiceLang: string }[] = [
  { key: "ko", label: "한국어", flag: "KR", voiceLang: "ko-KR" },
  { key: "en", label: "English", flag: "EN", voiceLang: "en-US" },
  { key: "jp", label: "日本語", flag: "JP", voiceLang: "ja-JP" },
];

function estimateDuration(text: string, lang: Lang): number {
  const cps = lang === "en" ? 12 : lang === "jp" ? 7 : 6;
  return Math.max(2, text.length / cps);
}

function formatTime(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = Math.round(sec % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

type PlaybackSource = "mp3" | "tts";
type PlaybackState = "idle" | "loading" | "playing";

function BookPage() {
  const { id } = useParams({ from: "/book/$id" });
  const [story, setStory] = useState<Story | undefined>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [page, setPage] = useState(0);
  const [lang, setLang] = useState<Lang>("ko");
  const [playbackState, setPlaybackState] = useState<PlaybackState>("idle");
  const [playbackSource, setPlaybackSource] = useState<PlaybackSource | null>(null);
  const [playbackMessage, setPlaybackMessage] = useState("");
  const [elapsed, setElapsed] = useState(0);
  const [audioDuration, setAudioDuration] = useState(0);
  const utterRef = useRef<SpeechSynthesisUtterance | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startRef = useRef<number>(0);
  const playbackRunRef = useRef(0);

  useEffect(() => {
    let ignore = false;
    setLoading(true);
    setError("");
    setPage(0);

    getStory(id)
      .then((result) => {
        if (!ignore) setStory(result);
      })
      .catch((err) => {
        console.error(err);
        if (!ignore) {
          setStory(undefined);
          setError("동화책을 불러오지 못했어요. 백엔드가 실행 중인지 확인해 주세요.");
        }
      })
      .finally(() => {
        if (!ignore) setLoading(false);
      });

    return () => {
      ignore = true;
    };
  }, [id]);

  const current = story?.pages[page];
  const total = story?.pages.length ?? 0;

  const voiceLang = useMemo(
    () => LANGS.find((item) => item.key === lang)?.voiceLang ?? "ko-KR",
    [lang],
  );

  const currentAudio = current?.audio[lang];
  const currentSubtitle = current?.subtitle[lang] ?? "";
  const hasAudioFile = Boolean(currentAudio);
  const hasTtsText = currentSubtitle.trim().length > 0;
  const canPlay = hasAudioFile || hasTtsText;

  const duration = useMemo(
    () => (current ? audioDuration || estimateDuration(currentSubtitle, lang) : 0),
    [audioDuration, current, currentSubtitle, lang],
  );

  function clearTimer() {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }

  function stop(resetElapsed = true) {
    playbackRunRef.current += 1;
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.onloadedmetadata = null;
      audioRef.current.ontimeupdate = null;
      audioRef.current.onended = null;
      audioRef.current.onerror = null;
      audioRef.current.src = "";
      audioRef.current = null;
    }
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
    clearTimer();
    utterRef.current = null;
    setPlaybackState("idle");
    setPlaybackSource(null);
    setPlaybackMessage("");
    if (resetElapsed) setElapsed(0);
  }

  function play() {
    if (!current) return;
    stop();
    setPlaybackMessage("");

    if (currentAudio) {
      const runId = playbackRunRef.current;
      const audio = new Audio(currentAudio);
      audioRef.current = audio;
      setPlaybackSource("mp3");
      setPlaybackState("loading");
      setElapsed(0);
      audio.onloadedmetadata = () => {
        if (playbackRunRef.current !== runId) return;
        if (Number.isFinite(audio.duration)) {
          setAudioDuration(audio.duration);
        }
      };
      audio.ontimeupdate = () => {
        if (playbackRunRef.current !== runId) return;
        setElapsed(audio.currentTime);
      };
      audio.onended = () => {
        if (playbackRunRef.current !== runId) return;
        audioRef.current = null;
        setPlaybackState("idle");
        setPlaybackSource(null);
        setElapsed(0);
      };
      audio.onerror = () => {
        if (playbackRunRef.current !== runId) return;
        audioRef.current = null;
        setPlaybackState("idle");
        setPlaybackSource(null);
        setElapsed(0);
        setPlaybackMessage("MP3 파일을 재생할 수 없어요. 파일 경로나 서버 응답을 확인해 주세요.");
      };
      audio
        .play()
        .then(() => {
          if (playbackRunRef.current !== runId) return;
          setPlaybackState("playing");
        })
        .catch(() => {
          if (playbackRunRef.current !== runId) return;
          audioRef.current = null;
          setPlaybackState("idle");
          setPlaybackSource(null);
          setElapsed(0);
          setPlaybackMessage("MP3 파일을 재생할 수 없어요. 브라우저 권한이나 파일 응답을 확인해 주세요.");
        });
      return;
    }

    playSynthesizedVoice();
  }

  function playSynthesizedVoice() {
    if (!current) return;
    if (!hasTtsText) {
      setPlaybackMessage("재생할 음원이나 자막이 없어요.");
      return;
    }
    if (typeof window === "undefined" || !("speechSynthesis" in window)) {
      setPlaybackMessage("이 브라우저는 TTS 재생을 지원하지 않아요.");
      return;
    }
    const runId = playbackRunRef.current;
    const utterance = new SpeechSynthesisUtterance(currentSubtitle);
    utterance.lang = voiceLang;
    utterance.rate = 0.95;
    utterance.pitch = 1.1;
    utterance.onend = () => {
      if (playbackRunRef.current !== runId) return;
      clearTimer();
      utterRef.current = null;
      setPlaybackState("idle");
      setPlaybackSource(null);
      setElapsed(0);
    };
    utterance.onerror = () => {
      if (playbackRunRef.current !== runId) return;
      clearTimer();
      utterRef.current = null;
      setPlaybackState("idle");
      setPlaybackSource(null);
      setElapsed(0);
      setPlaybackMessage("TTS 재생 중 문제가 생겼어요.");
    };
    utterRef.current = utterance;
    setPlaybackSource("tts");
    setPlaybackState("playing");
    setPlaybackMessage("MP3 파일이 없어서 브라우저 TTS로 읽고 있어요.");
    startRef.current = Date.now();
    setElapsed(0);
    timerRef.current = setInterval(() => {
      if (playbackRunRef.current !== runId) return;
      setElapsed((Date.now() - startRef.current) / 1000);
    }, 100);
    window.speechSynthesis.speak(utterance);
  }

  function togglePlayback() {
    if (playbackState !== "idle") {
      stop();
      return;
    }
    play();
  }

  useEffect(() => {
    return () => stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    stop();
    setAudioDuration(0);
    setPlaybackMessage("");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, lang, currentAudio]);

  if (loading) {
    return (
      <Layout>
        <div className="text-center py-20">
          <p className="text-xl">동화책을 펼치고 있어요...</p>
        </div>
      </Layout>
    );
  }

  if (!story || total === 0) {
    return (
      <Layout>
        <div className="text-center py-20">
          <p className="text-xl">{error || "동화책을 찾을 수 없어요."}</p>
          <Link
            to="/"
            className="inline-block mt-4 px-5 py-2 rounded-full bg-primary text-primary-foreground"
          >
            목록으로 돌아가기
          </Link>
        </div>
      </Layout>
    );
  }

  const progress = duration > 0 ? Math.min(100, (elapsed / duration) * 100) : 0;
  const isPlaybackActive = playbackState !== "idle";
  const playbackStatus =
    playbackMessage ||
    (playbackState === "loading"
      ? "MP3 파일을 불러오는 중이에요."
      : playbackSource === "mp3"
        ? "MP3 음원으로 재생 중이에요."
        : playbackSource === "tts"
          ? "브라우저 TTS로 읽고 있어요."
          : hasAudioFile
            ? "MP3 음원을 재생할 수 있어요."
            : hasTtsText
              ? "MP3 파일이 없어서 TTS로 읽을 수 있어요."
              : "재생할 음원이나 자막이 없어요.");

  return (
    <Layout>
      <div className="flex items-center justify-between mb-4 gap-3">
        <Link
          to="/"
          className="px-3 py-2 rounded-full bg-white/70 backdrop-blur text-sm hover:bg-white transition shadow"
        >
          목록
        </Link>
        <h1 className="text-xl sm:text-2xl text-primary text-center line-clamp-1 flex-1">
          {story.title}
        </h1>
        <div className="text-sm text-muted-foreground tabular-nums font-display">
          {page + 1} / {total}
        </div>
      </div>

      <div className="storybook-spread relative mx-auto">
        <div className="grid md:grid-cols-2 relative">
          <div className="storybook-page storybook-page-left relative">
            <div className="aspect-[4/3] md:aspect-auto md:h-full overflow-hidden rounded-xl border-4 border-white shadow-inner">
              <img
                key={current.seq}
                src={current.photo}
                alt={`${page + 1}페이지 그림`}
                className="w-full h-full object-cover animate-pop"
              />
            </div>
            <div className="absolute bottom-3 left-6 text-xs text-muted-foreground/70 font-display">
              {page + 1}쪽
            </div>
          </div>

          <div className="hidden md:block absolute left-1/2 top-0 bottom-0 -translate-x-1/2 w-6 pointer-events-none book-spine" />

          <div className="storybook-page storybook-page-right flex flex-col gap-5">
            <p
              key={`${page}-${lang}`}
              className="text-xl sm:text-2xl leading-loose text-foreground animate-pop flex-1 first-letter:text-5xl first-letter:font-display first-letter:text-primary first-letter:mr-1 first-letter:float-left first-letter:leading-none"
              style={{ fontFamily: "var(--font-body)" }}
            >
              {current.subtitle[lang]}
            </p>

            <div className="bg-white/80 backdrop-blur rounded-2xl p-4 shadow-md border border-border/50 space-y-3">
              <div className="flex gap-1.5 flex-wrap">
                {LANGS.map((item) => (
                  <button
                    key={item.key}
                    onClick={() => setLang(item.key)}
                    className={`px-3 py-1.5 rounded-full text-xs sm:text-sm font-display transition ${
                      lang === item.key
                        ? "bg-primary text-primary-foreground shadow"
                        : "bg-secondary/70 text-secondary-foreground hover:bg-primary/20"
                    }`}
                  >
                    {item.flag} {item.label}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={togglePlayback}
                  disabled={!canPlay}
                  className="shrink-0 w-12 h-12 rounded-full bg-accent text-accent-foreground shadow hover:-translate-y-0.5 transition flex items-center justify-center disabled:opacity-40 disabled:hover:translate-y-0"
                  aria-label={isPlaybackActive ? "재생 중지" : "재생"}
                >
                  {playbackState === "loading" ? (
                    <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
                  ) : isPlaybackActive ? (
                    <Pause className="h-5 w-5" aria-hidden="true" />
                  ) : (
                    <Play className="h-5 w-5 translate-x-0.5" aria-hidden="true" />
                  )}
                </button>
                <div className="flex-1 space-y-1.5 min-w-0">
                  <div className="h-2 rounded-full bg-primary/15 overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-primary to-accent transition-[width] duration-100"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-xs text-muted-foreground tabular-nums font-display">
                    <span>{formatTime(elapsed)}</span>
                    <span>{formatTime(duration)}</span>
                  </div>
                  <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
                    <span className="truncate">{playbackStatus}</span>
                    <span className="shrink-0 rounded-full bg-secondary/70 px-2 py-0.5 font-display text-[11px] text-secondary-foreground">
                      {hasAudioFile ? "MP3" : "TTS"}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between gap-3 pt-2">
              <button
                onClick={() => setPage((value) => Math.max(0, value - 1))}
                disabled={page === 0}
                className="px-5 h-12 rounded-full bg-secondary text-secondary-foreground font-display shadow disabled:opacity-40 hover:-translate-y-0.5 transition"
              >
                이전
              </button>
              <button
                onClick={() => setPage((value) => Math.min(total - 1, value + 1))}
                disabled={page >= total - 1}
                className="px-5 h-12 rounded-full bg-primary text-primary-foreground font-display shadow disabled:opacity-40 hover:-translate-y-0.5 transition"
              >
                다음
              </button>
            </div>
          </div>
        </div>

        <div className="flex justify-center gap-2 py-4">
          {story.pages.map((_, index) => (
            <button
              key={index}
              onClick={() => setPage(index)}
              className={`h-2.5 rounded-full transition-all ${
                index === page ? "bg-primary w-8" : "bg-border w-2.5 hover:bg-primary/50"
              }`}
              aria-label={`${index + 1}페이지로 이동`}
            />
          ))}
        </div>
      </div>

      {page === total - 1 && (
        <div className="mt-6 text-center">
          <Link
            to="/create"
            className="inline-block px-6 py-3 rounded-full bg-primary text-primary-foreground font-display shadow-lg hover:-translate-y-0.5 transition"
          >
            새 동화 만들기
          </Link>
        </div>
      )}
    </Layout>
  );
}
