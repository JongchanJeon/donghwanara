import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { Layout } from "@/components/Layout";
import { getStory, type Lang, type Story } from "@/lib/stories";

export const Route = createFileRoute("/book/$id")({
  component: BookPage,
});

const LANGS: { key: Lang; label: string; flag: string; voiceLang: string }[] = [
  { key: "ko", label: "한국어", flag: "🇰🇷", voiceLang: "ko-KR" },
  { key: "en", label: "English", flag: "🇺🇸", voiceLang: "en-US" },
  { key: "jp", label: "日本語", flag: "🇯🇵", voiceLang: "ja-JP" },
];

function BookPage() {
  const { id } = useParams({ from: "/book/$id" });
  const [story, setStory] = useState<Story | undefined>();
  const [page, setPage] = useState(0);
  const [lang, setLang] = useState<Lang>("ko");
  const [playing, setPlaying] = useState(false);
  const utterRef = useRef<SpeechSynthesisUtterance | null>(null);

  useEffect(() => {
    setStory(getStory(id));
  }, [id]);

  const current = story?.pages[page];
  const total = story?.pages.length ?? 0;

  const voiceLang = useMemo(
    () => LANGS.find((l) => l.key === lang)?.voiceLang ?? "ko-KR",
    [lang]
  );

  function stop() {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
    setPlaying(false);
  }

  function play() {
    if (!current) return;
    if (typeof window === "undefined" || !("speechSynthesis" in window)) {
      alert("이 브라우저는 음성 재생을 지원하지 않아요 😢");
      return;
    }
    stop();
    const u = new SpeechSynthesisUtterance(current.subtitle[lang]);
    u.lang = voiceLang;
    u.rate = 0.95;
    u.pitch = 1.1;
    u.onend = () => setPlaying(false);
    u.onerror = () => setPlaying(false);
    utterRef.current = u;
    window.speechSynthesis.speak(u);
    setPlaying(true);
  }

  useEffect(() => {
    return () => stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, lang]);

  if (!story) {
    return (
      <Layout>
        <div className="text-center py-20">
          <p className="text-xl">동화책을 찾을 수 없어요 😢</p>
          <Link
            to="/"
            className="inline-block mt-4 px-5 py-2 rounded-full bg-primary text-primary-foreground"
          >
            돌아가기
          </Link>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="flex items-center justify-between mb-4 gap-3">
        <Link
          to="/"
          className="px-3 py-2 rounded-full bg-white/70 backdrop-blur text-sm hover:bg-white transition shadow"
        >
          ← 동화책 목록
        </Link>
        <h1 className="text-xl sm:text-2xl text-primary text-center line-clamp-1 flex-1">
          📖 {story.title}
        </h1>
        <div className="text-sm text-muted-foreground tabular-nums">
          {page + 1} / {total}
        </div>
      </div>

      <div className="bg-card rounded-3xl shadow-xl border-2 border-white overflow-hidden">
        <div className="grid md:grid-cols-2">
          <div className="aspect-[4/3] md:aspect-auto md:min-h-[400px] bg-muted overflow-hidden">
            <img
              key={current?.seq}
              src={current?.photo}
              alt={`${page + 1}페이지`}
              className="w-full h-full object-cover animate-pop"
            />
          </div>
          <div className="p-5 sm:p-8 flex flex-col gap-4">
            <div className="flex gap-2 flex-wrap">
              {LANGS.map((l) => (
                <button
                  key={l.key}
                  onClick={() => setLang(l.key)}
                  className={`px-3 py-1.5 rounded-full text-sm font-display transition ${
                    lang === l.key
                      ? "bg-primary text-primary-foreground shadow"
                      : "bg-secondary text-secondary-foreground hover:bg-primary/20"
                  }`}
                >
                  {l.flag} {l.label}
                </button>
              ))}
            </div>

            <p
              key={`${page}-${lang}`}
              className="text-lg sm:text-xl leading-relaxed text-foreground animate-pop flex-1"
              style={{ fontFamily: "var(--font-body)" }}
            >
              {current?.subtitle[lang]}
            </p>

            <div className="flex items-center justify-between gap-3 pt-2 border-t border-border">
              <button
                onClick={playing ? stop : play}
                className="flex items-center gap-2 px-5 py-3 rounded-full bg-accent text-accent-foreground font-display text-base shadow hover:-translate-y-0.5 transition"
              >
                {playing ? "⏸ 멈춤" : "▶ 들어보기"}
              </button>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
                  disabled={page === 0}
                  className="w-12 h-12 rounded-full bg-secondary text-secondary-foreground text-2xl shadow disabled:opacity-40 hover:-translate-y-0.5 transition"
                  aria-label="이전"
                >
                  ←
                </button>
                <button
                  onClick={() => setPage((p) => Math.min(total - 1, p + 1))}
                  disabled={page >= total - 1}
                  className="w-12 h-12 rounded-full bg-primary text-primary-foreground text-2xl shadow disabled:opacity-40 hover:-translate-y-0.5 transition"
                  aria-label="다음"
                >
                  →
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-center gap-2 py-4 bg-muted/50">
          {story.pages.map((_, i) => (
            <button
              key={i}
              onClick={() => setPage(i)}
              className={`h-2.5 rounded-full transition-all ${
                i === page ? "bg-primary w-8" : "bg-border w-2.5 hover:bg-primary/50"
              }`}
              aria-label={`${i + 1}페이지로 이동`}
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
            ✨ 새로운 동화 만들기
          </Link>
        </div>
      )}
    </Layout>
  );
}
