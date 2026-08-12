import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Layout } from "@/components/Layout";
import { signIn, signUp, useAuth } from "@/lib/auth";
import mascot from "@/assets/mascot.png";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "로그인 / 회원가입 - 반짝반짝 동화나라" },
      { name: "description", content: "로그인하고 나만의 동화책을 저장해 보세요." },
    ],
  }),
  component: AuthPage,
});

function authErrorMessage(error: unknown, mode: "login" | "signup"): string {
  const message = error instanceof Error ? error.message : "";
  const normalized = message.toLowerCase();

  if (normalized.includes("failed to fetch") || normalized.includes("networkerror")) {
    return "서버에 연결할 수 없어요. 백엔드가 실행 중인지 확인해 주세요.";
  }

  if (normalized.includes("email already exists") || normalized.includes("409")) {
    return "이미 가입된 이메일이에요. 로그인으로 이용해 주세요.";
  }

  if (
    normalized.includes("invalid email or password") ||
    normalized.includes("unauthorized") ||
    normalized.includes("401")
  ) {
    return "이메일 또는 비밀번호가 올바르지 않아요.";
  }

  if (normalized.includes("400") || normalized.includes("bad request") || normalized.includes("validation")) {
    return mode === "signup"
      ? "입력한 정보를 다시 확인해 주세요. 비밀번호는 4자 이상이어야 해요."
      : "이메일과 비밀번호를 입력해 주세요.";
  }

  return mode === "signup"
    ? "회원가입을 완료하지 못했어요. 잠시 후 다시 시도해 주세요."
    : "로그인하지 못했어요. 잠시 후 다시 시도해 주세요.";
}

function AuthPage() {
  const navigate = useNavigate();
  const user = useAuth();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  if (user) {
    return (
      <Layout>
        <div className="max-w-md mx-auto text-center py-16">
          <img src={mascot} alt="" width={96} height={96} className="w-24 h-24 mx-auto animate-float" />
          <h1 className="text-2xl text-primary mt-3">{user.name}님, 환영해요!</h1>
          <p className="text-muted-foreground mt-1">이미 로그인되어 있어요.</p>
          <div className="flex justify-center gap-3 mt-5">
            <Link
              to="/mypage"
              className="px-5 py-2.5 rounded-full bg-primary text-primary-foreground font-display shadow hover:-translate-y-0.5 transition"
            >
              마이페이지
            </Link>
            <Link
              to="/create"
              className="px-5 py-2.5 rounded-full bg-white/80 font-display shadow hover:bg-white transition"
            >
              동화 만들기
            </Link>
          </div>
        </div>
      </Layout>
    );
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting) return;
    setError("");
    setSubmitting(true);

    try {
      if (mode === "signup") {
        await signUp(email, password, name);
      } else {
        await signIn(email, password);
      }
      navigate({ to: "/mypage" });
    } catch (err) {
      setError(authErrorMessage(err, mode));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Layout>
      <div className="max-w-md mx-auto">
        <div className="text-center mb-6">
          <img src={mascot} alt="" width={96} height={96} className="w-20 h-20 mx-auto animate-float" />
          <h1 className="text-3xl text-primary mt-2">
            {mode === "login" ? "다시 만나서 반가워요!" : "동화나라에 오신 걸 환영해요!"}
          </h1>
          <p className="text-foreground/70 mt-1">
            {mode === "login" ? "로그인하고 내 동화책을 만나보세요." : "간단하게 가입하고 시작해요."}
          </p>
        </div>

        <div className="flex bg-white/70 rounded-full p-1 mb-5 shadow-inner">
          {(["login", "signup"] as const).map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => {
                setMode(item);
                setError("");
              }}
              disabled={submitting}
              className={`flex-1 py-2.5 rounded-full font-display transition ${
                mode === item ? "bg-primary text-primary-foreground shadow" : "text-foreground/70"
              }`}
            >
              {item === "login" ? "로그인" : "회원가입"}
            </button>
          ))}
        </div>

        <form
          onSubmit={onSubmit}
          className="bg-card rounded-3xl shadow-lg p-6 sm:p-8 border-2 border-white space-y-4"
        >
          {mode === "signup" && (
            <div>
              <label className="block text-base mb-1.5 font-display">이름</label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="예: 토토 엄마"
                maxLength={20}
                disabled={submitting}
                required
                className="w-full rounded-2xl border-2 border-input bg-background px-4 py-3 text-base focus:border-primary focus:outline-none transition"
              />
            </div>
          )}

          <div>
            <label className="block text-base mb-1.5 font-display">이메일</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="hello@example.com"
              disabled={submitting}
              required
              className="w-full rounded-2xl border-2 border-input bg-background px-4 py-3 text-base focus:border-primary focus:outline-none transition"
            />
          </div>

          <div>
            <label className="block text-base mb-1.5 font-display">비밀번호</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="비밀번호를 입력하세요"
              minLength={4}
              disabled={submitting}
              required
              className="w-full rounded-2xl border-2 border-input bg-background px-4 py-3 text-base focus:border-primary focus:outline-none transition"
            />
          </div>

          {error && (
            <div className="rounded-2xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-3.5 rounded-2xl bg-primary text-primary-foreground font-display text-lg shadow-lg hover:-translate-y-0.5 hover:shadow-xl transition disabled:opacity-60"
          >
            {submitting ? "처리 중..." : mode === "login" ? "로그인" : "회원가입"}
          </button>
        </form>

        <p className="text-center text-xs text-muted-foreground mt-4">
          계정 정보는 서버에 저장되고, 로그인 토큰은 이 브라우저에 보관돼요.
        </p>
      </div>
    </Layout>
  );
}
