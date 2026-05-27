import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Layout } from "@/components/Layout";
import { createStoryFromPrompt } from "@/lib/stories";
import mascot from "@/assets/mascot.png";

export const Route = createFileRoute("/create")({
  component: CreatePage,
});

const EXAMPLES = [
  "용감한 강아지가 바다 속 보물을 찾으러 가는 이야기",
  "구름 위에 사는 작은 곰이 별을 따러 가는 이야기",
  "수줍은 공룡이 친구를 처음 사귀는 이야기",
  "마법 빵집을 운영하는 다람쥐 자매 이야기",
];

function CreatePage() {
  const navigate = useNavigate();
  const [title, setTitle] = useState("");
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState("");

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!prompt.trim() || loading) return;
    setLoading(true);
    const steps = [
      "🎨 그림을 그리고 있어요...",
      "✍️ 이야기를 쓰고 있어요...",
      "🎤 목소리를 녹음하고 있어요...",
      "📖 동화책을 만들고 있어요...",
    ];
    for (const s of steps) {
      setStep(s);
      await new Promise((r) => setTimeout(r, 700));
    }
    const story = createStoryFromPrompt(prompt, title);
    navigate({ to: "/book/$id", params: { id: story.id } });
  }

  return (
    <Layout>
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-6">
          <img
            src={mascot}
            alt=""
            width={120}
            height={120}
            className="w-24 h-24 mx-auto animate-float"
          />
          <h1 className="text-3xl sm:text-4xl text-primary mt-2">
            ✨ 새 동화 만들기
          </h1>
          <p className="text-foreground/70 mt-1">
            어떤 이야기가 듣고 싶어? 한 줄만 적어줘!
          </p>
        </div>

        <form
          onSubmit={onSubmit}
          className="bg-card rounded-3xl shadow-lg p-6 sm:p-8 border-2 border-white space-y-5"
        >
          <div>
            <label className="block text-lg mb-2 font-display">📕 동화 제목 (선택)</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="예: 용감한 강아지의 모험"
              maxLength={50}
              disabled={loading}
              className="w-full rounded-2xl border-2 border-input bg-background px-4 py-3 text-base focus:border-primary focus:outline-none transition"
            />
          </div>

          <div>
            <label className="block text-lg mb-2 font-display">
              💭 어떤 이야기를 만들까요?
            </label>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="예: 별을 좋아하는 작은 토끼가 밤하늘로 모험을 떠나는 이야기"
              maxLength={256}
              rows={4}
              disabled={loading}
              required
              className="w-full rounded-2xl border-2 border-input bg-background px-4 py-3 text-base focus:border-primary focus:outline-none transition resize-none"
            />
            <div className="text-right text-xs text-muted-foreground mt-1">
              {prompt.length} / 256
            </div>
          </div>

          <div>
            <div className="text-sm font-display mb-2">💡 이런 이야기는 어때요?</div>
            <div className="flex flex-wrap gap-2">
              {EXAMPLES.map((ex) => (
                <button
                  key={ex}
                  type="button"
                  disabled={loading}
                  onClick={() => setPrompt(ex)}
                  className="px-3 py-1.5 rounded-full bg-secondary text-secondary-foreground text-sm hover:bg-primary hover:text-primary-foreground transition"
                >
                  {ex}
                </button>
              ))}
            </div>
          </div>

          <button
            type="submit"
            disabled={loading || !prompt.trim()}
            className="w-full py-4 rounded-2xl bg-primary text-primary-foreground font-display text-xl shadow-lg hover:-translate-y-0.5 hover:shadow-xl transition disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {loading ? step || "만드는 중..." : "🪄 동화책 만들기!"}
          </button>
        </form>
      </div>
    </Layout>
  );
}
