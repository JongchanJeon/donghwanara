import { createFileRoute, Link, useParams } from "@tanstack/react-router";
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

function BookPage() {
  const { id } = useParams({ from: "/book/$id" });
  const [story, setStory] = useState<Story | undefined>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [page, setPage] = useState(0);
  const [lang, setLang] = useState<Lang>("ko");
  const [playing, setPlaying] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const utterRef = useRef<SpeechSynthesisUtterance | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startRef = useRef<number>(0);

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

  const duration = useMemo(
    () => (current ? estimateDuration(current.subtitle[lang], lang) : 0),
    [current, lang],
  );

  function clearTimer() {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }

  function stop() {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
    clearTimer();
    setPlaying(false);
    setElapsed(0);
  }

  function play() {
    if (!current) return;
    if (typeof window === "undefined" || !("speechSynthesis" in window)) {
      alert("이 브라우저는 음성 재생을 지원하지 않아요.");
      return;
    }
    stop();
    const utterance = new SpeechSynthesisUtterance(current.subtitle[lang]);
    utterance.lang = voiceLang;
    utterance.rate = 0.95;
    utterance.pitch = 1.1;
    utterance.onend = () => {
      clearTimer();
      setPlaying(false);
      setElapsed(0);
    };
    utterance.onerror = () => {
      clearTimer();
      setPlaying(false);
      setElapsed(0);
    };
    utterRef.current = utterance;
    window.speechSynthesis.speak(utterance);
    setPlaying(true);
    startRef.current = Date.now();
    setElapsed(0);
    timerRef.current = setInterval(() => {
      setElapsed((Date.now() - startRef.current) / 1000);
    }, 100);
  }

  useEffect(() => {
    return () => stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, lang]);

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
                  onClick={playing ? stop : play}
                  className="shrink-0 w-12 h-12 rounded-full bg-accent text-accent-foreground text-xl shadow hover:-translate-y-0.5 transition flex items-center justify-center"
                  aria-label={playing ? "멈춤" : "재생"}
                >
                  {playing ? "Ⅱ" : "▶"}
                </button>
                <div className="flex-1 space-y-1">
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
