import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Layout } from "@/components/Layout";
import { getMyStoryIds, removeMyStoryId, useAuth } from "@/lib/auth";
import { deleteStory, getStory, type Story } from "@/lib/stories";
import mascot from "@/assets/mascot.png";

export const Route = createFileRoute("/mypage")({
  head: () => ({
    meta: [{ title: "마이페이지 - 반짝반짝 동화나라" }],
  }),
  component: MyPage,
});

function MyPage() {
  const navigate = useNavigate();
  const user = useAuth();
  const [stories, setStories] = useState<Story[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);

  useEffect(() => {
    if (user === null) return;
    let ignore = false;
    const ids = getMyStoryIds(user.email);

    Promise.all(
      ids.map((id) =>
        getStory(id).catch(() => {
          // 불러올 수 없는 동화는 목록에서 정리
          removeMyStoryId(user.email, id);
          return undefined;
        }),
      ),
    )
      .then((results) => {
        if (!ignore) {
          setStories(results.filter((s): s is Story => Boolean(s)));
        }
      })
      .finally(() => {
        if (!ignore) setLoading(false);
      });

    return () => {
      ignore = true;
    };
  }, [user]);

  async function onDelete(id: string) {
    if (!user) return;
    if (!window.confirm("이 동화책을 삭제할까요?")) return;
    setDeleting(id);
    try {
      await deleteStory(id);
      removeMyStoryId(user.email, id);
      setStories((prev) => prev.filter((s) => s.id !== id));
    } finally {
      setDeleting(null);
    }
  }

  if (user === null) {
    return (
      <Layout>
        <div className="max-w-md mx-auto text-center py-16">
          <img src={mascot} alt="" width={96} height={96} className="w-24 h-24 mx-auto animate-float" />
          <h1 className="text-2xl text-primary mt-3">로그인이 필요해요</h1>
          <p className="text-muted-foreground mt-1">로그인하면 내가 만든 동화책을 볼 수 있어요.</p>
          <button
            onClick={() => navigate({ to: "/auth" })}
            className="mt-5 px-6 py-3 rounded-full bg-primary text-primary-foreground font-display shadow-lg hover:-translate-y-0.5 transition"
          >
            로그인 / 회원가입
          </button>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="flex items-center gap-3 mb-6">
        <img src={mascot} alt="" width={56} height={56} className="w-14 h-14" />
        <div>
          <h1 className="text-2xl sm:text-3xl text-primary">{user.name}님의 책장</h1>
          <p className="text-sm text-muted-foreground">내가 만든 동화책 {stories.length}권</p>
        </div>
      </div>

      {loading ? (
        <p className="text-center text-muted-foreground py-16">불러오는 중...</p>
      ) : stories.length === 0 ? (
        <div className="text-center py-16 bg-white/60 rounded-3xl border-2 border-white">
          <div className="text-5xl mb-3">📖</div>
          <p className="text-lg text-foreground">아직 만든 동화책이 없어요.</p>
          <Link
            to="/create"
            className="inline-block mt-4 px-6 py-3 rounded-full bg-primary text-primary-foreground font-display shadow-lg hover:-translate-y-0.5 transition"
          >
            첫 동화 만들기
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {stories.map((story, index) => (
            <div
              key={story.id}
              className="bg-card rounded-3xl overflow-hidden shadow-md border-2 border-white animate-pop"
              style={{ animationDelay: `${index * 60}ms` }}
            >
              <Link to="/book/$id" params={{ id: story.id }} className="block group">
                <div className="aspect-[4/3] overflow-hidden bg-muted">
                  <img
                    src={story.cover}
                    alt={story.title}
                    loading="lazy"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                </div>
              </Link>
              <div className="p-4">
                <h3 className="text-xl text-foreground line-clamp-1">{story.title}</h3>
                <p className="text-sm text-muted-foreground line-clamp-2 mt-1 min-h-[2.5rem]">
                  {story.summary}
                </p>
                <div className="mt-3 flex items-center justify-between gap-2">
                  <Link
                    to="/book/$id"
                    params={{ id: story.id }}
                    className="px-4 py-2 rounded-full bg-secondary text-secondary-foreground text-sm font-display hover:bg-primary hover:text-primary-foreground transition"
                  >
                    읽기
                  </Link>
                  <button
                    onClick={() => onDelete(story.id)}
                    disabled={deleting === story.id}
                    className="px-4 py-2 rounded-full bg-destructive/10 text-destructive text-sm font-display hover:bg-destructive hover:text-destructive-foreground transition disabled:opacity-60"
                  >
                    {deleting === story.id ? "삭제 중..." : "삭제"}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </Layout>
  );
}
