import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Layout } from "@/components/Layout";
import { listStories, type Story } from "@/lib/stories";
import mascot from "@/assets/mascot.png";

export const Route = createFileRoute("/")({
  component: Index,
});

function Index() {
  const [stories, setStories] = useState<Story[]>([]);
  useEffect(() => {
    setStories(listStories());
  }, []);

  return (
    <Layout>
      <section className="relative rounded-3xl bg-gradient-to-br from-[#fff3c1] via-[#ffd6ec] to-[#cfe3ff] p-6 sm:p-10 mb-8 overflow-hidden shadow-md">
        <div className="absolute -top-4 -right-4 text-6xl opacity-30 select-none">⭐</div>
        <div className="absolute bottom-2 left-2 text-4xl opacity-30 select-none">🌈</div>
        <div className="flex flex-col sm:flex-row items-center gap-6">
          <img
            src={mascot}
            alt="부엉이 마법사"
            width={160}
            height={160}
            className="w-28 h-28 sm:w-40 sm:h-40 animate-float"
          />
          <div className="text-center sm:text-left flex-1">
            <h1 className="text-3xl sm:text-5xl text-primary leading-tight">
              안녕! 오늘은 어떤 이야기를 만들어볼까?
            </h1>
            <p className="mt-2 text-base sm:text-lg text-foreground/80">
              한 줄만 적어주면, AI 친구가 그림과 한국어·영어·일본어 목소리로
              <br className="hidden sm:block" />
              너만의 동화책을 만들어줄 거야!
            </p>
            <Link
              to="/create"
              className="inline-block mt-4 px-6 py-3 rounded-full bg-primary text-primary-foreground font-display text-lg shadow-lg hover:-translate-y-0.5 hover:shadow-xl transition"
            >
              ✨ 새 동화 만들기
            </Link>
          </div>
        </div>
      </section>

      <div className="flex items-end justify-between mb-4 px-1">
        <h2 className="text-2xl sm:text-3xl text-foreground">📚 모두의 동화책</h2>
        <span className="text-sm text-muted-foreground">
          총 {stories.length}권
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {stories.map((s, i) => (
          <Link
            key={s.id}
            to="/book/$id"
            params={{ id: s.id }}
            className="group bg-card rounded-3xl overflow-hidden shadow-md hover:shadow-2xl hover:-translate-y-1 transition-all border-2 border-white animate-pop"
            style={{ animationDelay: `${i * 60}ms` }}
          >
            <div className="aspect-[4/3] overflow-hidden bg-muted">
              <img
                src={s.cover}
                alt={s.title}
                loading="lazy"
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              />
            </div>
            <div className="p-4">
              <h3 className="text-xl text-foreground line-clamp-1">{s.title}</h3>
              <p className="text-sm text-muted-foreground line-clamp-2 mt-1 min-h-[2.5rem]">
                {s.summary}
              </p>
              <div className="mt-3 flex items-center justify-between text-xs">
                <span className="px-2 py-1 rounded-full bg-secondary text-secondary-foreground">
                  🇰🇷 🇺🇸 🇯🇵
                </span>
                <span className="text-muted-foreground">
                  {new Date(s.createdAt).toLocaleDateString("ko-KR")}
                </span>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </Layout>
  );
}
