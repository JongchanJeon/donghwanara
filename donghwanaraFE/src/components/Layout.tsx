import { Link, useNavigate } from "@tanstack/react-router";
import { signOut, useAuth } from "@/lib/auth";
import mascot from "@/assets/mascot.png";

export function Layout({ children }: { children: React.ReactNode }) {
  const user = useAuth();
  const navigate = useNavigate();

  function handleSignOut() {
    signOut();
    navigate({ to: "/" });
  }

  return (
    <div className="min-h-screen flex flex-col">
      <header className="sticky top-0 z-30 backdrop-blur-md bg-white/60 border-b-2 border-white/80 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
          <Link to="/" className="flex items-center gap-2 group">
            <img
              src={mascot}
              alt="동화나라 마스코트"
              width={48}
              height={48}
              className="w-10 h-10 sm:w-12 sm:h-12 group-hover:animate-wiggle"
            />
            <div className="leading-tight">
              <div className="font-display text-xl sm:text-2xl text-primary">반짝반짝 동화나라</div>
              <div className="text-[11px] sm:text-xs text-muted-foreground">
                AI가 만들어 주는 우리 아이 동화책
              </div>
            </div>
          </Link>
          <nav className="flex items-center gap-1.5 sm:gap-2">
            <Link
              to="/library"
              className="px-3 py-2 rounded-full text-sm sm:text-base font-display text-foreground hover:bg-white/80 transition"
              activeProps={{ className: "bg-white shadow" }}
            >
              동화책
            </Link>
            {user && (
              <Link
                to="/mypage"
                className="px-3 py-2 rounded-full text-sm sm:text-base font-display text-foreground hover:bg-white/80 transition"
                activeProps={{ className: "bg-white shadow" }}
              >
                마이페이지
              </Link>
            )}
            <Link
              to="/create"
              className="px-3 py-2 sm:px-4 rounded-full text-sm sm:text-base font-display bg-primary text-primary-foreground shadow-md hover:shadow-lg hover:-translate-y-0.5 transition"
            >
              만들기
            </Link>
            {user ? (
              <button
                onClick={handleSignOut}
                className="px-3 py-2 rounded-full text-sm sm:text-base font-display text-foreground hover:bg-white/80 transition"
              >
                로그아웃
              </button>
            ) : (
              <Link
                to="/auth"
                className="px-3 py-2 rounded-full text-sm sm:text-base font-display text-foreground hover:bg-white/80 transition"
                activeProps={{ className: "bg-white shadow" }}
              >
                로그인
              </Link>
            )}
          </nav>
        </div>
      </header>

      <main className="flex-1 max-w-6xl w-full mx-auto px-4 py-6 sm:py-10">{children}</main>

      <footer className="mt-10 py-6 text-center text-xs text-muted-foreground">
        <div className="flex items-center justify-center gap-2">
          <img src={mascot} alt="" width={24} height={24} className="w-6 h-6" />
          <span>반짝반짝 동화나라 · AI로 만드는 마법 같은 이야기</span>
        </div>
      </footer>
    </div>
  );
}
