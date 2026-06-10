import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Layout } from "@/components/Layout";
import { createStoryFromPrompt } from "@/lib/stories";
import { addMyStoryId, getApiKey, setApiKey, useAuth } from "@/lib/auth";
import mascot from "@/assets/mascot.png";

export const Route = createFileRoute("/create")({
  component: CreatePage,
});

const EXAMPLES = [
  "용감한 강아지가 바다 속 보물을 찾으러 가는 이야기",
  "구름 위에 사는 작은 고양이가 별을 돌보는 이야기",
  "수줍은 공룡이 친구를 처음 사귀는 이야기",
  "마법 빗자루를 타는 쌍둥이 자매의 모험 이야기",
];

const LOADING_STEPS = [
  "아이디어를 읽고 있어요...",
  "주인공에게 마법을 걸고 있어요...",
  "네 장면의 이야기를 쓰고 있어요...",
  "동화책으로 저장하고 있어요...",
];

function CreatePage() {
  const navigate = useNavigate();
  const user = useAuth();
  const [title, setTitle] = useState("");
  const [heroName, setHeroName] = useState("");
  const [prompt, setPrompt] = useState("");
  const [apiKey, setApiKeyState] = useState(() => getApiKey());
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState("");
  const [error, setError] = useState("");

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!prompt.trim() || loading) return;
    if (!apiKey.trim()) {
      setError("동화를 만들려면 API 키를 입력해 주세요.");
      return;
    }

    setApiKey(apiKey);
    setLoading(true);
    setError("");

    const timer = window.setInterval(() => {
      setStep((current) => {
        const currentIndex = LOADING_STEPS.indexOf(current);
        const nextIndex =
          currentIndex < 0 ? 0 : Math.min(currentIndex + 1, LOADING_STEPS.length - 1);
        return LOADING_STEPS[nextIndex];
      });
    }, 1200);

    try {
      setStep(LOADING_STEPS[0]);
      const story = await createStoryFromPrompt({
        title: title.trim() || undefined,
        heroName: heroName.trim() || undefined,
        prompt: prompt.trim(),
        apiKey: apiKey.trim(),
      });
      if (user) addMyStoryId(user.email, story.id);
      navigate({ to: "/book/$id", params: { id: story.id } });
    } catch (err) {
      console.error(err);
      setError(
        "동화 생성에 실패했어요. API 키가 올바른지, 백엔드가 실행 중인지 확인해 주세요.",
      );
    } finally {
      window.clearInterval(timer);
      setLoading(false);
      setStep("");
    }
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
          <h1 className="text-3xl sm:text-4xl text-primary mt-2">AI 동화 만들기</h1>
          <p className="text-foreground/70 mt-1">
            어떤 이야기가 읽고 싶은지 적어 주세요. GPT가 네 장면의 동화로 만들어 줍니다.
          </p>
        </div>

        <form
          onSubmit={onSubmit}
          className="bg-card rounded-3xl shadow-lg p-6 sm:p-8 border-2 border-white space-y-5"
        >
          <div className="rounded-2xl bg-secondary/40 border-2 border-secondary/60 p-4">
            <label className="block text-lg mb-1 font-display">🔑 API 키</label>
            <p className="text-xs text-muted-foreground mb-2">
              동화를 만들려면 API 키가 필요해요. 입력한 키는 이 브라우저에만 저장돼요.
            </p>
            <input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKeyState(e.target.value)}
              placeholder="sk-..."
              disabled={loading}
              className="w-full rounded-2xl border-2 border-input bg-background px-4 py-3 text-base focus:border-primary focus:outline-none transition"
            />
          </div>

          <div>
            <label className="block text-lg mb-2 font-display">동화 제목 선택</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="예: 용감한 강아지의 바다 모험"
              maxLength={50}
              disabled={loading}
              className="w-full rounded-2xl border-2 border-input bg-background px-4 py-3 text-base focus:border-primary focus:outline-none transition"
            />
          </div>

          <div>
            <label className="block text-lg mb-2 font-display">주인공 이름 선택</label>
            <input
              value={heroName}
              onChange={(e) => setHeroName(e.target.value)}
              placeholder="예: 토토, 루루, 민지"
              maxLength={20}
              disabled={loading}
              className="w-full rounded-2xl border-2 border-input bg-background px-4 py-3 text-base focus:border-primary focus:outline-none transition"
            />
          </div>

          <div>
            <label className="block text-lg mb-2 font-display">어떤 이야기를 만들까요?</label>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="예: 별을 좋아하는 작은 토끼가 밤하늘로 모험을 떠나는 이야기"
              maxLength={500}
              rows={4}
              disabled={loading}
              required
              className="w-full rounded-2xl border-2 border-input bg-background px-4 py-3 text-base focus:border-primary focus:outline-none transition resize-none"
            />
            <div className="text-right text-xs text-muted-foreground mt-1">
              {prompt.length} / 500
            </div>
          </div>

          <div>
            <div className="text-sm font-display mb-2">이런 이야기는 어때요?</div>
            <div className="flex flex-wrap gap-2">
              {EXAMPLES.map((example) => (
                <button
                  key={example}
                  type="button"
                  disabled={loading}
                  onClick={() => setPrompt(example)}
                  className="px-3 py-1.5 rounded-full bg-secondary text-secondary-foreground text-sm hover:bg-primary hover:text-primary-foreground transition"
                >
                  {example}
                </button>
              ))}
            </div>
          </div>

          {error && (
            <div className="rounded-2xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading || !prompt.trim()}
            className="w-full py-4 rounded-2xl bg-primary text-primary-foreground font-display text-xl shadow-lg hover:-translate-y-0.5 hover:shadow-xl transition disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {loading ? step || "만드는 중..." : "동화책 만들기"}
          </button>
        </form>
      </div>
    </Layout>
  );
}
