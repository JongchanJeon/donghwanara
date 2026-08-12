import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Layout } from "@/components/Layout";
import { listStories, type Story } from "@/lib/stories";

export const Route = createFileRoute("/library")({
  head: () => ({
    meta: [
      { title: "모두의 동화책 - 반짝반짝 동화나라" },
      { name: "description", content: "AI로 만든 동화책을 한국어·영어·일본어 음성으로 만나보세요." },
    ],
  }),
  component: Library,
});

function Library() {
  const [stories, setStories] = useState<Story[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let ignore = false;

    listStories()
      .then((result) => {
        if (!ignore) setStories(result);
      })
      .finally(() => {
        if (!ignore) setLoading(false);
      });

    return () => {
      ignore = true;
    };
  }, []);

  return (
    <Layout>
      <div className="flex items-end justify-between mb-5 px-1">
        <div>
          <h1 className="text-2xl sm:text-3xl text-foreground">모두의 동화책</h1>
          <p className="text-sm text-muted-foreground mt-1">
            친구들이 만든 동화를 구경해 보세요.
          </p>
        </div>
        <span className="text-sm text-muted-foreground">
          {loading ? "불러오는 중" : `총 ${stories.length}권`}
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {stories.map((story, index) => (
          <Link
            key={story.id}
            to="/book/$id"
            params={{ id: story.id }}
            className="group bg-card rounded-3xl overflow-hidden shadow-md hover:shadow-2xl hover:-translate-y-1 transition-all border-2 border-white animate-pop"
            style={{ animationDelay: `${index * 60}ms` }}
          >
            <div className="aspect-[4/3] overflow-hidden bg-muted">
              <img
                src={story.cover}
                alt={story.title}
                loading="lazy"
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              />
            </div>
            <div className="p-4">
              <h3 className="text-xl text-foreground line-clamp-1">{story.title}</h3>
              <p className="text-sm text-muted-foreground line-clamp-2 mt-1 min-h-[2.5rem]">
                {story.summary}
              </p>
              <div className="mt-3 flex items-center justify-between text-xs">
                <span className="px-2 py-1 rounded-full bg-secondary text-secondary-foreground">
                  한국어 · English · 日本語
                </span>
                <span className="text-muted-foreground">
                  {new Date(story.createdAt).toLocaleDateString("ko-KR")}
                </span>
              </div>
            </div>
          </Link>
        ))}
      </div>

      {!loading && stories.length === 0 && (
        <div className="text-center py-16">
          <p className="text-lg text-muted-foreground">아직 동화책이 없어요.</p>
          <Link
            to="/create"
            className="inline-block mt-4 px-6 py-3 rounded-full bg-primary text-primary-foreground font-display shadow-lg hover:-translate-y-0.5 transition"
          >
            첫 동화 만들기
          </Link>
        </div>
      )}
    </Layout>
  );
}
