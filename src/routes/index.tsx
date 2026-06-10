import { createFileRoute, Link } from "@tanstack/react-router";
import { Layout } from "@/components/Layout";
import { useAuth } from "@/lib/auth";
import mascot from "@/assets/mascot.png";
import coverBunny from "@/assets/cover-bunny.jpg";
import coverDragon from "@/assets/cover-dragon.jpg";
import coverCat from "@/assets/cover-cat.jpg";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "반짝반짝 동화나라 - AI가 만드는 우리 아이 동화책" },
      {
        name: "description",
        content:
          "프롬프트만 적으면 AI가 동화책을 만들고, 한국어·영어·일본어 음성으로 읽어줍니다. 우리 아이만의 동화를 만들어 보세요.",
      },
    ],
  }),
  component: Landing,
});

const FEATURES = [
  {
    emoji: "✍️",
    title: "아이디어만 적으면 끝",
    desc: "원하는 이야기를 한 줄만 적어주세요. AI가 네 장면의 동화로 만들어 줘요.",
  },
  {
    emoji: "🔊",
    title: "3개 국어 음성 동화",
    desc: "한국어·English·日本語 음성으로 동화를 들으며 자연스럽게 언어를 익혀요.",
  },
  {
    emoji: "📚",
    title: "나만의 동화 책장",
    desc: "만든 동화는 마이페이지에 차곡차곡 저장돼요. 언제든 다시 볼 수 있어요.",
  },
];

function Landing() {
  const user = useAuth();

  return (
    <Layout>
      <section className="relative rounded-3xl bg-gradient-to-br from-[#fff3c1] via-[#ffd6ec] to-[#cfe3ff] p-6 sm:p-12 mb-10 overflow-hidden shadow-md">
        <div className="absolute -top-4 -right-4 text-7xl opacity-30 select-none">★</div>
        <div className="absolute bottom-2 left-2 text-5xl opacity-30 select-none">✦</div>
        <div className="flex flex-col items-center text-center gap-5">
          <img
            src={mascot}
            alt="동화나라 마스코트"
            width={180}
            height={180}
            className="w-32 h-32 sm:w-44 sm:h-44 animate-float"
          />
          <h1 className="text-3xl sm:text-5xl text-primary leading-tight">
            우리 아이만의 동화책,
            <br />
            AI로 1분 만에 뚝딱!
          </h1>
          <p className="max-w-xl text-base sm:text-lg text-foreground/80">
            만들고 싶은 이야기를 적기만 하면, AI가 그림책처럼 읽기 좋은 동화를 만들고 한국어·영어·일본어
            음성으로 읽어줍니다.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3 mt-2">
            <Link
              to="/create"
              className="px-7 py-3 rounded-full bg-primary text-primary-foreground font-display text-lg shadow-lg hover:-translate-y-0.5 hover:shadow-xl transition"
            >
              동화 만들기
            </Link>
            <Link
              to="/library"
              className="px-7 py-3 rounded-full bg-white/80 text-foreground font-display text-lg shadow hover:bg-white transition"
            >
              동화 구경하기
            </Link>
          </div>
          {!user && (
            <p className="text-sm text-foreground/70">
              <Link to="/auth" className="underline font-display text-primary">
                회원가입
              </Link>
              하면 만든 동화를 마이페이지에 저장할 수 있어요.
            </p>
          )}
        </div>
      </section>

      <section className="grid grid-cols-1 sm:grid-cols-3 gap-5 mb-12">
        {FEATURES.map((feature, index) => (
          <div
            key={feature.title}
            className="bg-card rounded-3xl p-6 shadow-md border-2 border-white text-center animate-pop"
            style={{ animationDelay: `${index * 80}ms` }}
          >
            <div className="text-5xl mb-3">{feature.emoji}</div>
            <h3 className="text-xl text-foreground mb-1">{feature.title}</h3>
            <p className="text-sm text-muted-foreground">{feature.desc}</p>
          </div>
        ))}
      </section>

      <section className="rounded-3xl bg-white/70 p-6 sm:p-10 shadow-md border-2 border-white">
        <div className="flex items-end justify-between mb-5">
          <h2 className="text-2xl sm:text-3xl text-foreground">살짝 엿보기 👀</h2>
          <Link to="/library" className="text-sm text-primary font-display hover:underline">
            모두 보기 →
          </Link>
        </div>
        <div className="grid grid-cols-3 gap-3 sm:gap-5">
          {[coverBunny, coverDragon, coverCat].map((cover, index) => (
            <div
              key={index}
              className="aspect-[4/3] rounded-2xl overflow-hidden shadow border-2 border-white"
            >
              <img src={cover} alt="동화책 표지" loading="lazy" className="w-full h-full object-cover" />
            </div>
          ))}
        </div>
      </section>
    </Layout>
  );
}
