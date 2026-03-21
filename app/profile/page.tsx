"use client";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase-browser";
import WeeklyLeaderboard from "@/components/profile/WeeklyLeaderboard";
import ProfileHero from "@/components/profile/ProfileHero";

// ---------- Types ----------
interface UserData {
  id: string;
  firstname: string;
  lastname: string;
  username: string;
  role: string;
  avatar_icon?: string;
  created_at: string;
}

interface StreakData {
  current_streak: number;
  longest_streak: number;
  last_passed_at: string | null;
}

interface Achievement {
  type: string;
  earned_at: string;
}

const ACHIEVEMENT_META: Record<
  string,
  {
    icon: string;
    label: string;
    desc: string;
    color: string;
    bg: string;
    border: string;
  }
> = {
  passed_5: {
    icon: "⭐",
    label: "Besh marta o'tdi",
    desc: "5 ta testdan o'tdi",
    color: "#ca8a04",
    bg: "#fefce8",
    border: "#fde68a",
  },
  perfect_score: {
    icon: "💯",
    label: "Mukammal natija",
    desc: "100% natija oldi",
    color: "#16a34a",
    bg: "#f0fdf4",
    border: "#bbf7d0",
  },
  streak_3: {
    icon: "🔥",
    label: "3 kunlik streak",
    desc: "3 kun ketma-ket o'tdi",
    color: "#ea580c",
    bg: "#fff7ed",
    border: "#fed7aa",
  },
  streak_7: {
    icon: "🚀",
    label: "Haftalik streak",
    desc: "7 kun ketma-ket o'tdi",
    color: "#7c3aed",
    bg: "#f5f3ff",
    border: "#ddd6fe",
  },
  streak_30: {
    icon: "👑",
    label: "Oylik streak",
    desc: "30 kun ketma-ket o'tdi",
    color: "#b45309",
    bg: "#fffbeb",
    border: "#fcd34d",
  },
  leaderboard_1st: {
    icon: "🥇",
    label: "Birinchi o'rin",
    desc: "Haftalik 1-o'rinda",
    color: "#b45309",
    bg: "#fffbeb",
    border: "#fcd34d",
  },
  leaderboard_top3: {
    icon: "🏆",
    label: "Top 3",
    desc: "Haftalik top 3 da",
    color: "#4f46e5",
    bg: "#eef2ff",
    border: "#c7d2fe",
  },
};

const PRO_ACHIEVEMENTS = Object.keys(ACHIEVEMENT_META);
interface TestResult {
  id: number;
  total: number;
  correct: number;
  wrong: number;
  score_percent: number;
  passed: boolean;
  duration_sec: number | null;
  taken_at: string;
}

interface Stats {
  total_tests: number;
  total_correct: number;
  total_wrong: number;
  avg_score: number;
  passed_tests: number;
  xp: number;
  rank: string;
}

// ---------- Rank config ----------
const RANKS = [
  {
    name: "Yangi",
    icon: "🌱",
    color: "text-slate-600",
    bg: "bg-slate-100",
    border: "border-slate-200",
    minXP: 0,
  },
  {
    name: "Boshliq",
    icon: "🚗",
    color: "text-blue-600",
    bg: "bg-blue-50",
    border: "border-blue-200",
    minXP: 150,
  },
  {
    name: "O'rtacha",
    icon: "⭐",
    color: "text-yellow-600",
    bg: "bg-yellow-50",
    border: "border-yellow-200",
    minXP: 300,
  },
  {
    name: "Tajribali",
    icon: "🔥",
    color: "text-orange-600",
    bg: "bg-orange-50",
    border: "border-orange-200",
    minXP: 550,
  },
  {
    name: "Expert",
    icon: "👑",
    color: "text-purple-600",
    bg: "bg-purple-50",
    border: "border-purple-200",
    minXP: 1000,
  },
];

function getRank(xp: number) {
  for (let i = RANKS.length - 1; i >= 0; i--) {
    if (xp >= RANKS[i].minXP) return RANKS[i];
  }
  return RANKS[0];
}

function getNextRank(xp: number) {
  for (let i = 0; i < RANKS.length; i++) {
    if (xp < RANKS[i].minXP) return RANKS[i];
  }
  return null;
}

function calcStats(results: TestResult[]): Stats {
  const total_tests = results.length;
  const total_correct = results.reduce((s, r) => s + r.correct, 0);
  const total_wrong = results.reduce((s, r) => s + r.wrong, 0);
  const passed_tests = results.filter((r) => r.passed).length;
  const avg_score =
    total_tests > 0
      ? Math.round(
          results.reduce((s, r) => s + r.score_percent, 0) / total_tests,
        )
      : 0;
  const xp = total_tests * 10 + total_correct * 5;
  const rank = getRank(xp).name;

  return {
    total_tests,
    total_correct,
    total_wrong,
    avg_score,
    passed_tests,
    xp,
    rank,
  };
}

// ---------- Helpers ----------
function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("uz-UZ", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function fmtJoined(iso: string) {
  return new Date(iso).toLocaleDateString("uz-UZ", {
    month: "long",
    year: "numeric",
  });
}

// ---------- Sub components ----------
function CircleProgress({
  percent,
  size = 88,
  stroke = 7,
}: {
  percent: number;
  size?: number;
  stroke?: number;
}) {
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const dash = (percent / 100) * circ;
  const color =
    percent >= 80
      ? "#22c55e"
      : percent >= 60
        ? "#3b82f6"
        : percent >= 40
          ? "#f59e0b"
          : "#ef4444";
  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      className="-rotate-90"
    >
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke="#e2e8f0"
        strokeWidth={stroke}
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke={color}
        strokeWidth={stroke}
        strokeDasharray={`${dash} ${circ}`}
        strokeLinecap="round"
        style={{
          transition: "stroke-dasharray 0.8s cubic-bezier(0.34,1.56,0.64,1)",
        }}
      />
    </svg>
  );
}

function StatCard({
  label,
  value,
  sub,
  icon,
}: {
  label: string;
  value: string | number;
  sub?: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="bg-white rounded-2xl border border-slate-100 p-4 shadow-sm">
      <div className="w-9 h-9 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center mb-3">
        {icon}
      </div>
      <p className="text-2xl font-bold text-slate-800 leading-none mb-1">
        {value}
      </p>
      <p className="text-xs font-medium text-slate-500">{label}</p>
      {sub && <p className="text-xs text-slate-400 mt-0.5">{sub}</p>}
    </div>
  );
}

function EmptyStats() {
  return (
    <div className="bg-white rounded-2xl border border-dashed border-slate-200 p-10 text-center">
      <div className="w-14 h-14 bg-slate-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
        <svg
          width="24"
          height="24"
          fill="none"
          stroke="#94a3b8"
          strokeWidth="1.5"
          viewBox="0 0 24 24"
        >
          <path d="M9 11l3 3L22 4" />
          <path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11" />
        </svg>
      </div>
      <p className="text-sm font-semibold text-slate-600 mb-1">
        Hali statistika mavjud emas
      </p>
      <p className="text-xs text-slate-400 mb-4">
        Birinchi testni topshiring va natijalar shu yerda ko'rinadi
      </p>
      <a
        href="/"
        className="inline-flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold px-4 py-2 rounded-xl transition-colors shadow-sm shadow-blue-200"
      >
        <svg
          width="13"
          height="13"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          viewBox="0 0 24 24"
        >
          <polygon points="5 3 19 12 5 21 5 3" />
        </svg>
        Testni boshlash
      </a>
    </div>
  );
}

// ---------- Main ----------
export default function ProfilePage() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [user, setUser] = useState<UserData | null>(null);
  const [results, setResults] = useState<TestResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [loggingOut, setLoggingOut] = useState(false);
  const [streak, setStreak] = useState<StreakData | null>(null);
  const [achievements, setAchievements] = useState<Achievement[]>([]);

  const [modal, setModal] = useState<{
    result: TestResult;
    wrongs: WrongAnswer[];
  } | null>(null);
  const [modalLoading, setModalLoading] = useState(false);

  interface WrongAnswer {
    id: number;
    question_id: number;
    selected: number;
    correct: number;
    questions: {
      question: string;
      image: string | null;
      options: string[];
      explanation: string | null;
    };
  }

  function imgUrl(img: string | null) {
    if (!img) return null;
    if (img.startsWith("http")) return img;
    return supabase.storage.from("questions-images").getPublicUrl(img).data
      .publicUrl;
  }

  function fmtTime(sec: number | null) {
    if (!sec) return "—";
    const m = Math.floor(sec / 60),
      s = sec % 60;
    return m > 0 ? `${m}m ${s}s` : `${s}s`;
  }

  async function openModal(result: TestResult) {
    setModalLoading(true);
    setModal({ result, wrongs: [] });

    const { data } = await supabase
      .from("wrong_answers")
      .select(
        `
      id, question_id, selected, correct,
      questions ( question, image, options, explanation )
    `,
      )
      .eq("test_result_id", result.id);

    const normalized: WrongAnswer[] = (data ?? []).map((w: any) => ({
      ...w,
      questions: Array.isArray(w.questions) ? w.questions[0] : w.questions,
    }));
    setModal({ result, wrongs: normalized });
    setModalLoading(false);
  }
  useEffect(() => {
    async function load() {
      // 1. Auth user
      const {
        data: { user: authUser },
      } = await supabase.auth.getUser();
      if (!authUser) {
        router.push("/auth");
        return;
      }

      // 2. users table dan profil
      const { data: userData, error: userErr } = await supabase
        .from("users")
        .select("id, firstname, lastname, username, role, created_at")
        .eq("id", authUser.id)
        .single();

      if (userErr || !userData) {
        // users table da yo'q — auth bor lekin profil yo'q
        // auth user ma'lumotidan minimal profil yasaymiz
        setUser({
          id: authUser.id,
          firstname: authUser.user_metadata?.firstname ?? "",
          lastname: authUser.user_metadata?.lastname ?? "",
          username:
            authUser.user_metadata?.username ??
            authUser.email?.split("@")[0] ??
            "user",
          role: "user",
          created_at: authUser.created_at,
        });
      } else {
        setUser(userData);
      }

      // 3. test_results — bo'sh bo'lsa ham xato bermasin
      const { data: resultsData } = await supabase
        .from("test_results")
        .select(
          "id, total, correct, wrong, score_percent, passed, duration_sec, taken_at",
        )
        .eq("user_id", authUser.id)
        .order("taken_at", { ascending: false })
        .limit(10);

      setResults(resultsData ?? []);

      const { data: streakData } = await supabase
        .from("streaks")
        .select("current_streak, longest_streak, last_passed_at")
        .eq("user_id", authUser.id)
        .single();
      setStreak(streakData ?? null);

      const { data: achData } = await supabase
        .from("achievements")
        .select("type, earned_at")
        .eq("user_id", authUser.id);
      setAchievements(achData ?? []);
      setLoading(false);
    }
    load();
  }, [supabase, router]);

  async function handleLogout() {
    setLoggingOut(true);
    await supabase.auth.signOut();
    router.push("/auth");
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <svg
            className="animate-spin w-7 h-7 text-blue-500"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8v8H4z"
            />
          </svg>
          <p className="text-sm text-slate-400">Yuklanmoqda...</p>
        </div>
      </div>
    );
  }

  if (!user) return null;

  const stats = calcStats(results);
  const rankObj = getRank(stats.xp);
  const nextRank = getNextRank(stats.xp);
  const hasStats = results.length > 0;

  const accuracy = hasStats
    ? Math.round(
        (stats.total_correct / (stats.total_correct + stats.total_wrong)) * 100,
      )
    : 0;
  const passRate = hasStats
    ? Math.round((stats.passed_tests / stats.total_tests) * 100)
    : 0;

  const xpProgress = nextRank
    ? Math.min(
        100,
        Math.round(
          ((stats.xp - rankObj.minXP) / (nextRank.minXP - rankObj.minXP)) * 100,
        ),
      )
    : 100;

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-100 sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 h-14 flex items-center justify-between">
          <a href="/" className="flex items-center gap-2">
            <div className="w-7 h-7 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center">
              <svg
                width="14"
                height="14"
                fill="none"
                stroke="white"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
                viewBox="0 0 24 24"
              >
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              </svg>
            </div>
            <span className="font-bold text-slate-800 text-sm">Brotest</span>
          </a>
          <div className="flex items-center gap-2">
            <a
              href="/test"
              className="text-xs text-slate-500 hover:text-blue-600 transition px-3 py-1.5 rounded-lg hover:bg-blue-50"
            >
              Testga o'tish
            </a>
            <button
              onClick={handleLogout}
              disabled={loggingOut}
              className="text-xs text-red-400 hover:text-red-600 border border-red-100 hover:border-red-200 px-3 py-1.5 rounded-lg transition disabled:opacity-50"
            >
              {loggingOut ? "Chiqilmoqda..." : "Chiqish"}
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-8 space-y-5">
        <ProfileHero
          user={user}
          stats={stats}
          rankObj={rankObj}
          nextRank={nextRank}
          xpProgress={xpProgress}
          fmtJoined={fmtJoined}
          onUserUpdate={(updated) =>
            setUser((prev) => (prev ? { ...prev, ...updated } : prev))
          }
        />

        {!hasStats ? (
          <EmptyStats />
        ) : (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <StatCard
                label="Jami testlar"
                value={stats.total_tests}
                icon={
                  <svg
                    width="16"
                    height="16"
                    fill="none"
                    stroke="#3b82f6"
                    strokeWidth="2"
                    viewBox="0 0 24 24"
                  >
                    <path d="M9 11l3 3L22 4" />
                    <path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11" />
                  </svg>
                }
              />
              <StatCard
                label="O'rtacha ball"
                value={`${stats.avg_score}%`}
                sub={`${passRate}% o'tdi`}
                icon={
                  <svg
                    width="16"
                    height="16"
                    fill="none"
                    stroke="#6366f1"
                    strokeWidth="2"
                    viewBox="0 0 24 24"
                  >
                    <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
                  </svg>
                }
              />
              <StatCard
                label="To'g'ri javoblar"
                value={stats.total_correct}
                icon={
                  <svg
                    width="16"
                    height="16"
                    fill="none"
                    stroke="#22c55e"
                    strokeWidth="2"
                    viewBox="0 0 24 24"
                  >
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                }
              />
              <StatCard
                label="Xato javoblar"
                value={stats.total_wrong}
                icon={
                  <svg
                    width="16"
                    height="16"
                    fill="none"
                    stroke="#ef4444"
                    strokeWidth="2"
                    viewBox="0 0 24 24"
                  >
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                }
              />
            </div>
            {/* ── STREAK CARD ── */}
            {(() => {
              const today = new Date().toISOString().split("T")[0];
              const lastPassed = streak?.last_passed_at?.split("T")[0] ?? null;
              const isActiveToday = lastPassed === today;
              const isActiveYesterday =
                lastPassed ===
                new Date(Date.now() - 86400000).toISOString().split("T")[0];
              const isAlive = isActiveToday || isActiveYesterday;

              return (
                <div
                  style={{
                    background: "white",
                    borderRadius: 20,
                    border: "1px solid #e2e8f0",
                    boxShadow: "0 2px 8px rgba(0,0,0,.04)",
                    overflow: "hidden",
                  }}
                >
                  {/* Header */}
                  <div
                    style={{
                      padding: "18px 20px 14px",
                      borderBottom: "1px solid #f1f5f9",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                    }}
                  >
                    <div
                      style={{ display: "flex", alignItems: "center", gap: 10 }}
                    >
                      <div
                        style={{
                          width: 32,
                          height: 32,
                          background: isAlive ? "#fff7ed" : "#f8fafc",
                          borderRadius: 10,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: 16,
                        }}
                      >
                        🔥
                      </div>
                      <div>
                        <h2
                          style={{
                            fontSize: 15,
                            fontWeight: 700,
                            color: "#0f172a",
                            margin: 0,
                          }}
                        >
                          Streak
                        </h2>
                        <p
                          style={{ fontSize: 12, color: "#94a3b8", margin: 0 }}
                        >
                          Har kun 70%+ test topshiring
                        </p>
                      </div>
                    </div>
                    {isActiveToday && (
                      <span
                        style={{
                          fontSize: 11,
                          fontWeight: 700,
                          color: "#ea580c",
                          background: "#fff7ed",
                          border: "1px solid #fed7aa",
                          padding: "3px 10px",
                          borderRadius: 999,
                        }}
                      >
                        Bugun ✓
                      </span>
                    )}
                    {isActiveYesterday && !isActiveToday && (
                      <span
                        style={{
                          fontSize: 11,
                          fontWeight: 700,
                          color: "#dc2626",
                          background: "#fff1f2",
                          border: "1px solid #fecdd3",
                          padding: "3px 10px",
                          borderRadius: 999,
                        }}
                      >
                        Bugun test topshiring!
                      </span>
                    )}
                    {!isAlive && streak && (
                      <span
                        style={{
                          fontSize: 11,
                          fontWeight: 700,
                          color: "#94a3b8",
                          background: "#f8fafc",
                          border: "1px solid #e2e8f0",
                          padding: "3px 10px",
                          borderRadius: 999,
                        }}
                      >
                        Streak uzildi
                      </span>
                    )}
                  </div>

                  {/* Body */}
                  <div
                    style={{
                      padding: "20px",
                      display: "grid",
                      gridTemplateColumns: "1fr 1fr",
                      gap: 12,
                    }}
                  >
                    {/* Current streak */}
                    <div
                      style={{
                        background: isAlive ? "#fff7ed" : "#f8fafc",
                        border: `1px solid ${isAlive ? "#fed7aa" : "#e2e8f0"}`,
                        borderRadius: 16,
                        padding: "18px",
                        textAlign: "center",
                      }}
                    >
                      <p
                        style={{
                          fontSize: 48,
                          fontWeight: 800,
                          color: isAlive ? "#ea580c" : "#cbd5e1",
                          margin: 0,
                          lineHeight: 1,
                          fontFamily: "'Syne', sans-serif",
                        }}
                      >
                        {streak?.current_streak ?? 0}
                      </p>
                      <p
                        style={{
                          fontSize: 12,
                          fontWeight: 600,
                          color: isAlive ? "#ea580c" : "#94a3b8",
                          marginTop: 6,
                        }}
                      >
                        Joriy streak 🔥
                      </p>
                      <p
                        style={{ fontSize: 11, color: "#94a3b8", marginTop: 2 }}
                      >
                        kun ketma-ket
                      </p>
                    </div>

                    {/* Longest streak */}
                    <div
                      style={{
                        background: "#f8fafc",
                        border: "1px solid #e2e8f0",
                        borderRadius: 16,
                        padding: "18px",
                        textAlign: "center",
                      }}
                    >
                      <p
                        style={{
                          fontSize: 48,
                          fontWeight: 800,
                          color: "#4f46e5",
                          margin: 0,
                          lineHeight: 1,
                          fontFamily: "'Syne', sans-serif",
                        }}
                      >
                        {streak?.longest_streak ?? 0}
                      </p>
                      <p
                        style={{
                          fontSize: 12,
                          fontWeight: 600,
                          color: "#4f46e5",
                          marginTop: 6,
                        }}
                      >
                        Rekord 🏅
                      </p>
                      <p
                        style={{ fontSize: 11, color: "#94a3b8", marginTop: 2 }}
                      >
                        eng uzun streak
                      </p>
                    </div>
                  </div>

                  {/* Weekly progress dots */}
                  <div
                    style={{
                      padding: "0 20px 20px",
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                    }}
                  >
                    {Array.from({ length: 7 }).map((_, i) => {
                      const dayDate = new Date(Date.now() - (6 - i) * 86400000)
                        .toISOString()
                        .split("T")[0];
                      const isToday = i === 6;
                      const isPast = lastPassed && dayDate <= lastPassed;
                      const isActive =
                        streak &&
                        streak.current_streak > 0 &&
                        isPast &&
                        streak.current_streak >= 7 - i;

                      const days = ["Du", "Se", "Ch", "Pa", "Ju", "Sh", "Ya"];
                      const dayOfWeek = new Date(dayDate).getDay();
                      const dayLabel =
                        days[dayOfWeek === 0 ? 6 : dayOfWeek - 1];

                      return (
                        <div
                          key={i}
                          style={{
                            flex: 1,
                            display: "flex",
                            flexDirection: "column",
                            alignItems: "center",
                            gap: 4,
                          }}
                        >
                          <div
                            style={{
                              width: "100%",
                              height: 8,
                              borderRadius: 999,
                              background: isActive
                                ? "#f97316"
                                : isToday && isActiveToday
                                  ? "#f97316"
                                  : "#e2e8f0",
                              transition: "background .3s",
                            }}
                          />
                          <span
                            style={{
                              fontSize: 10,
                              color: isToday ? "#0f172a" : "#94a3b8",
                              fontWeight: isToday ? 700 : 400,
                            }}
                          >
                            {dayLabel}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })()}

            {/* ── ACHIEVEMENTS CARD ── */}
            {(() => {
              const earned = achievements.map((a) => a.type);
              const isPro = PRO_ACHIEVEMENTS.every((t) => earned.includes(t));

              return (
                <div
                  style={{
                    background: "white",
                    borderRadius: 20,
                    border: isPro ? "2px solid #f59e0b" : "1px solid #e2e8f0",
                    boxShadow: isPro
                      ? "0 4px 24px rgba(245,158,11,.15)"
                      : "0 2px 8px rgba(0,0,0,.04)",
                    overflow: "hidden",
                  }}
                >
                  {/* Header */}
                  <div
                    style={{
                      padding: "18px 20px 14px",
                      borderBottom: "1px solid #f1f5f9",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                    }}
                  >
                    <div
                      style={{ display: "flex", alignItems: "center", gap: 10 }}
                    >
                      <div
                        style={{
                          width: 32,
                          height: 32,
                          background: isPro ? "#fffbeb" : "#f8fafc",
                          borderRadius: 10,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: 16,
                        }}
                      >
                        {isPro ? "✨" : "🎖️"}
                      </div>
                      <div>
                        <h2
                          style={{
                            fontSize: 15,
                            fontWeight: 700,
                            color: "#0f172a",
                            margin: 0,
                          }}
                        >
                          Yutuqlar
                        </h2>
                        <p
                          style={{ fontSize: 12, color: "#94a3b8", margin: 0 }}
                        >
                          {earned.length} / {PRO_ACHIEVEMENTS.length} olindi
                        </p>
                      </div>
                    </div>
                    {isPro && (
                      <span
                        style={{
                          fontSize: 12,
                          fontWeight: 800,
                          color: "#b45309",
                          background: "linear-gradient(135deg,#fef3c7,#fde68a)",
                          border: "1px solid #fcd34d",
                          padding: "4px 12px",
                          borderRadius: 999,
                          letterSpacing: "0.02em",
                        }}
                      >
                        ✨ PRO
                      </span>
                    )}
                  </div>

                  {/* Progress bar */}
                  <div style={{ padding: "14px 20px 0" }}>
                    <div
                      style={{
                        height: 6,
                        background: "#f1f5f9",
                        borderRadius: 999,
                        overflow: "hidden",
                      }}
                    >
                      <div
                        style={{
                          height: "100%",
                          borderRadius: 999,
                          background: isPro
                            ? "linear-gradient(90deg,#f59e0b,#fbbf24)"
                            : "linear-gradient(90deg,#6366f1,#8b5cf6)",
                          width: `${(earned.length / PRO_ACHIEVEMENTS.length) * 100}%`,
                          transition: "width 1s cubic-bezier(.22,1,.36,1)",
                        }}
                      />
                    </div>
                  </div>

                  {/* Badges grid */}
                  <div
                    style={{
                      padding: "16px 20px 20px",
                      display: "grid",
                      gridTemplateColumns:
                        "repeat(auto-fill, minmax(140px, 1fr))",
                      gap: 10,
                    }}
                  >
                    {PRO_ACHIEVEMENTS.map((type) => {
                      const meta = ACHIEVEMENT_META[type];
                      const isEarned = earned.includes(type);
                      const ach = achievements.find((a) => a.type === type);

                      return (
                        <div
                          key={type}
                          style={{
                            background: isEarned ? meta.bg : "#f8fafc",
                            border: `1px solid ${isEarned ? meta.border : "#e2e8f0"}`,
                            borderRadius: 14,
                            padding: "14px 12px",
                            textAlign: "center",
                            opacity: isEarned ? 1 : 0.45,
                            transition: "all .2s",
                            filter: isEarned ? "none" : "grayscale(1)",
                          }}
                        >
                          <span
                            style={{
                              fontSize: 28,
                              display: "block",
                              marginBottom: 6,
                            }}
                          >
                            {meta.icon}
                          </span>
                          <p
                            style={{
                              fontSize: 12,
                              fontWeight: 700,
                              color: isEarned ? meta.color : "#94a3b8",
                              margin: "0 0 2px",
                              lineHeight: 1.3,
                            }}
                          >
                            {meta.label}
                          </p>
                          <p
                            style={{
                              fontSize: 10,
                              color: isEarned ? meta.color : "#cbd5e1",
                              margin: 0,
                              opacity: 0.8,
                            }}
                          >
                            {isEarned && ach
                              ? new Date(ach.earned_at).toLocaleDateString(
                                  "uz-UZ",
                                  {
                                    day: "2-digit",
                                    month: "short",
                                  },
                                )
                              : meta.desc}
                          </p>
                        </div>
                      );
                    })}
                  </div>

                  {/* Pro locked message */}
                  {!isPro && (
                    <div
                      style={{
                        margin: "0 20px 20px",
                        padding: "12px 16px",
                        background: "#fffbeb",
                        border: "1px solid #fde68a",
                        borderRadius: 12,
                        display: "flex",
                        alignItems: "center",
                        gap: 10,
                      }}
                    >
                      <span style={{ fontSize: 18, flexShrink: 0 }}>✨</span>
                      <p
                        style={{
                          fontSize: 12,
                          color: "#92400e",
                          margin: 0,
                          lineHeight: 1.5,
                        }}
                      >
                        Barcha yutuqlarni to'plab <strong>PRO</strong> avatarini
                        oching — profilingiz boshqalardan ajralib turadi!
                      </p>
                    </div>
                  )}
                </div>
              );
            })()}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Aniqlik */}
              <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 flex items-center gap-5">
                <div className="relative shrink-0">
                  <CircleProgress percent={accuracy} />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-lg font-bold text-slate-800">
                      {accuracy}%
                    </span>
                  </div>
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-700">
                    Aniqlik
                  </p>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Barcha javoblar bo'yicha
                  </p>
                  <div className="flex gap-3 mt-2.5">
                    <span className="flex items-center gap-1 text-xs text-slate-500">
                      <span className="w-2 h-2 rounded-full bg-green-400 inline-block" />
                      {stats.total_correct} to'g'ri
                    </span>
                    <span className="flex items-center gap-1 text-xs text-slate-500">
                      <span className="w-2 h-2 rounded-full bg-red-400 inline-block" />
                      {stats.total_wrong} xato
                    </span>
                  </div>
                </div>
              </div>

              {/* O'tish darajasi */}
              <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 flex items-center gap-5">
                <div className="relative shrink-0">
                  <CircleProgress percent={passRate} />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-lg font-bold text-slate-800">
                      {passRate}%
                    </span>
                  </div>
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-700">
                    O'tish darajasi
                  </p>
                  <p className="text-xs text-slate-400 mt-0.5">70%+ = o'tdi</p>
                  <div className="flex gap-3 mt-2.5">
                    <span className="flex items-center gap-1 text-xs text-slate-500">
                      <span className="w-2 h-2 rounded-full bg-blue-400 inline-block" />
                      {stats.passed_tests} o'tdi
                    </span>
                    <span className="flex items-center gap-1 text-xs text-slate-500">
                      <span className="w-2 h-2 rounded-full bg-slate-300 inline-block" />
                      {stats.total_tests - stats.passed_tests} o'tmadi
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div
              style={{
                background: "white",
                borderRadius: 20,
                border: "1px solid #e2e8f0",
                boxShadow: "0 2px 8px rgba(0,0,0,.04)",
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  padding: "18px 20px 14px",
                  borderBottom: "1px solid #f1f5f9",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div
                    style={{
                      width: 32,
                      height: 32,
                      background: "#eef2ff",
                      borderRadius: 10,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <svg
                      width="15"
                      height="15"
                      fill="none"
                      stroke="#4f46e5"
                      strokeWidth="2"
                      viewBox="0 0 24 24"
                    >
                      <circle cx="12" cy="12" r="10" />
                      <polyline points="12 6 12 12 16 14" />
                    </svg>
                  </div>
                  <div>
                    <h2
                      className="fs"
                      style={{
                        fontSize: 16,
                        color: "#0f172a",
                        margin: 0,
                        letterSpacing: "-0.01em",
                      }}
                    >
                      So'nggi testlar
                    </h2>
                    <p style={{ fontSize: 12, color: "#94a3b8", margin: 0 }}>
                      Xatolar ustiga bosib ko'ring
                    </p>
                  </div>
                </div>
                <span
                  style={{
                    fontSize: 12,
                    color: "#94a3b8",
                    background: "#f8f9fc",
                    padding: "4px 10px",
                    borderRadius: 8,
                    border: "1px solid #f1f5f9",
                  }}
                >
                  {results.length} ta
                </span>
              </div>

              {results.length === 0 ? (
                <div style={{ padding: "40px 24px", textAlign: "center" }}>
                  <p style={{ fontSize: 14, color: "#94a3b8" }}>
                    Hali test topshirilmagan
                  </p>
                  <a
                    href="/test"
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 6,
                      marginTop: 12,
                      fontSize: 13,
                      fontWeight: 600,
                      color: "#4f46e5",
                      textDecoration: "none",
                      background: "#eef2ff",
                      padding: "8px 16px",
                      borderRadius: 10,
                    }}
                  >
                    Testga o'tish →
                  </a>
                </div>
              ) : (
                <div>
                  {results.map((r, i) => {
                    const sc =
                      r.score_percent >= 80
                        ? { bg: "#f0fdf4", text: "#16a34a" }
                        : r.score_percent >= 60
                          ? { bg: "#eef2ff", text: "#4f46e5" }
                          : r.score_percent >= 40
                            ? { bg: "#fefce8", text: "#ca8a04" }
                            : { bg: "#fff1f2", text: "#dc2626" };

                    return (
                      <button
                        key={r.id}
                        onClick={() => openModal(r)}
                        style={{
                          width: "100%",
                          display: "flex",
                          alignItems: "center",
                          gap: 14,
                          padding: "14px 20px",
                          background: "transparent",
                          border: "none",
                          borderBottom:
                            i < results.length - 1
                              ? "1px solid #f8f9fc"
                              : "none",
                          cursor: "pointer",
                          textAlign: "left",
                          transition: "background .15s",
                        }}
                        onMouseEnter={(e) =>
                          ((e.currentTarget as HTMLElement).style.background =
                            "#f8f9fc")
                        }
                        onMouseLeave={(e) =>
                          ((e.currentTarget as HTMLElement).style.background =
                            "transparent")
                        }
                      >
                        {/* Score */}
                        <div
                          style={{
                            width: 48,
                            height: 48,
                            borderRadius: 14,
                            background: sc.bg,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            flexShrink: 0,
                          }}
                        >
                          <span
                            className="fs"
                            style={{
                              fontSize: 13,
                              color: sc.text,
                              lineHeight: 1,
                            }}
                          >
                            {r.score_percent}%
                          </span>
                        </div>

                        {/* Info */}
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: 7,
                              marginBottom: 6,
                            }}
                          >
                            <span
                              style={{
                                fontSize: 11,
                                fontWeight: 700,
                                padding: "2px 8px",
                                borderRadius: 6,
                                background: r.passed ? "#dcfce7" : "#fee2e2",
                                color: r.passed ? "#16a34a" : "#dc2626",
                              }}
                            >
                              {r.passed ? "O'tdi ✓" : "O'tmadi"}
                            </span>
                            <span style={{ fontSize: 12, color: "#94a3b8" }}>
                              {fmtDate(r.taken_at)}
                            </span>
                          </div>
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: 8,
                            }}
                          >
                            <div
                              style={{
                                flex: 1,
                                height: 5,
                                background: "#f1f5f9",
                                borderRadius: 999,
                                overflow: "hidden",
                              }}
                            >
                              <div
                                style={{
                                  height: "100%",
                                  background: "#4f46e5",
                                  width: `${(r.correct / r.total) * 100}%`,
                                  borderRadius: 999,
                                }}
                              />
                            </div>
                            <span
                              style={{
                                fontSize: 11,
                                color: "#94a3b8",
                                flexShrink: 0,
                              }}
                            >
                              {r.correct}/{r.total}
                            </span>
                          </div>
                        </div>

                        {/* Right */}
                        <div style={{ textAlign: "right", flexShrink: 0 }}>
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: 6,
                              justifyContent: "flex-end",
                              marginBottom: 3,
                            }}
                          >
                            <span
                              style={{
                                fontSize: 12,
                                fontWeight: 600,
                                color: "#22c55e",
                              }}
                            >
                              +{r.correct}
                            </span>
                            <span style={{ fontSize: 11, color: "#e2e8f0" }}>
                              /
                            </span>
                            {r.wrong > 0 ? (
                              <span
                                style={{
                                  fontSize: 11,
                                  fontWeight: 700,
                                  color: "white",
                                  background: "#ef4444",
                                  padding: "2px 7px",
                                  borderRadius: 6,
                                }}
                              >
                                -{r.wrong} xato
                              </span>
                            ) : (
                              <span
                                style={{
                                  fontSize: 12,
                                  color: "#22c55e",
                                  fontWeight: 600,
                                }}
                              >
                                0 xato ✓
                              </span>
                            )}
                          </div>
                          <span style={{ fontSize: 11, color: "#94a3b8" }}>
                            {fmtTime(r.duration_sec)}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
              {modal && (
                <div
                  onClick={(e) => {
                    if (e.target === e.currentTarget) setModal(null);
                  }}
                  style={{
                    position: "fixed",
                    inset: 0,
                    background: "rgba(15,23,42,.55)",
                    backdropFilter: "blur(6px)",
                    zIndex: 50,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    padding: 16,
                  }}
                >
                  <style>{`
      @keyframes modalIn { from { opacity:0; transform:scale(.96) translateY(8px) } to { opacity:1; transform:scale(1) translateY(0) } }
      @keyframes spin { to { transform: rotate(360deg) } }
      @keyframes imgFadeIn { from { opacity:0; transform:scale(.97) } to { opacity:1; transform:scale(1) } }
      .wrong-scroll::-webkit-scrollbar { width: 4px; }
      .wrong-scroll::-webkit-scrollbar-track { background: transparent; }
      .wrong-scroll::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 999px; }
      .wrong-scroll::-webkit-scrollbar-thumb:hover { background: #cbd5e1; }
      .img-btn:hover { background: #e0e7ff !important; color: #3730a3 !important; }
    `}</style>

                  {/* Image lightbox */}
                  {imagePreview && (
                    <div
                      onClick={() => setImagePreview(null)}
                      style={{
                        position: "fixed",
                        inset: 0,
                        background: "rgba(0,0,0,.85)",
                        zIndex: 100,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        padding: 24,
                        cursor: "zoom-out",
                      }}
                    >
                      <img
                        src={imagePreview}
                        alt="preview"
                        style={{
                          maxWidth: "100%",
                          maxHeight: "90vh",
                          borderRadius: 16,
                          animation: "imgFadeIn .2s ease",
                          objectFit: "contain",
                        }}
                      />
                      <button
                        onClick={() => setImagePreview(null)}
                        style={{
                          position: "absolute",
                          top: 20,
                          right: 20,
                          width: 36,
                          height: 36,
                          borderRadius: "50%",
                          border: "none",
                          background: "rgba(255,255,255,.15)",
                          color: "white",
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: 18,
                        }}
                      >
                        ✕
                      </button>
                    </div>
                  )}

                  <div
                    style={{
                      background: "white",
                      borderRadius: 24,
                      width: "100%",
                      maxWidth: 540,
                      maxHeight: "88vh",
                      display: "flex",
                      flexDirection: "column",
                      boxShadow: "0 24px 64px rgba(0,0,0,.2)",
                      animation: "modalIn .25s cubic-bezier(.22,1,.36,1)",
                    }}
                  >
                    {/* Header */}
                    <div
                      style={{
                        padding: "20px 24px 16px",
                        borderBottom: "1px solid #f1f5f9",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        flexShrink: 0,
                      }}
                    >
                      <div>
                        <h3
                          style={{
                            fontSize: 18,
                            color: "#0f172a",
                            margin: "0 0 2px",
                            letterSpacing: "-0.015em",
                          }}
                        >
                          Test #{modal.result.id}
                        </h3>
                        <p
                          style={{ fontSize: 12, color: "#94a3b8", margin: 0 }}
                        >
                          {fmtDate(modal.result.taken_at)}
                        </p>
                      </div>
                      <button
                        onClick={() => setModal(null)}
                        style={{
                          width: 32,
                          height: 32,
                          borderRadius: 10,
                          border: "1px solid #e2e8f0",
                          background: "#f8f9fc",
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          color: "#64748b",
                          flexShrink: 0,
                        }}
                      >
                        <svg
                          width="14"
                          height="14"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2.5"
                          viewBox="0 0 24 24"
                        >
                          <line x1="18" y1="6" x2="6" y2="18" />
                          <line x1="6" y1="6" x2="18" y2="18" />
                        </svg>
                      </button>
                    </div>

                    {/* Score strip */}
                    <div
                      style={{
                        padding: "14px 24px",
                        background: modal.result.passed ? "#f0fdf4" : "#fff1f2",
                        borderBottom: "1px solid #f1f5f9",
                        display: "flex",
                        alignItems: "center",
                        gap: 16,
                        flexShrink: 0,
                      }}
                    >
                      <div>
                        <p
                          style={{
                            fontSize: 38,
                            color: modal.result.passed ? "#16a34a" : "#dc2626",
                            margin: 0,
                            lineHeight: 1,
                          }}
                        >
                          {modal.result.score_percent}%
                        </p>
                        <p
                          style={{
                            fontSize: 12,
                            fontWeight: 600,
                            color: modal.result.passed ? "#15803d" : "#be123c",
                            margin: "3px 0 0",
                          }}
                        >
                          {modal.result.passed ? "O'tdi ✓" : "O'tmadi"}
                        </p>
                      </div>
                      <div
                        style={{
                          flex: 1,
                          display: "grid",
                          gridTemplateColumns: "repeat(3,1fr)",
                          gap: 8,
                        }}
                      >
                        {[
                          {
                            val: modal.result.correct,
                            label: "To'g'ri",
                            bg: "#dcfce7",
                            col: "#16a34a",
                          },
                          {
                            val: modal.result.wrong,
                            label: "Xato",
                            bg: "#fee2e2",
                            col: "#dc2626",
                          },
                          {
                            val: fmtTime(modal.result.duration_sec),
                            label: "Vaqt",
                            bg: "#eef2ff",
                            col: "#4f46e5",
                          },
                        ].map((s, i) => (
                          <div
                            key={i}
                            style={{
                              background: s.bg,
                              borderRadius: 10,
                              padding: "8px",
                              textAlign: "center",
                            }}
                          >
                            <p
                              style={{
                                fontSize: 18,
                                color: s.col,
                                margin: "0 0 1px",
                                lineHeight: 1,
                              }}
                            >
                              {s.val}
                            </p>
                            <p
                              style={{
                                fontSize: 11,
                                color: s.col,
                                opacity: 0.7,
                                margin: 0,
                              }}
                            >
                              {s.label}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Wrongs list — scroll shu div da */}
                    <div
                      className="wrong-scroll"
                      style={{
                        flex: 1,
                        overflowY: "auto",
                        padding: "16px 24px",
                        display: "flex",
                        flexDirection: "column",
                        gap: 12,
                      }}
                    >
                      {modalLoading ? (
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            padding: "40px 0",
                          }}
                        >
                          <svg
                            style={{
                              animation: "spin .7s linear infinite",
                              width: 24,
                              height: 24,
                            }}
                            fill="none"
                            viewBox="0 0 24 24"
                          >
                            <circle
                              style={{ opacity: 0.25 }}
                              cx="12"
                              cy="12"
                              r="10"
                              stroke="#4f46e5"
                              strokeWidth="4"
                            />
                            <path
                              style={{ opacity: 0.75 }}
                              fill="#4f46e5"
                              d="M4 12a8 8 0 018-8v8H4z"
                            />
                          </svg>
                        </div>
                      ) : modal.wrongs.length === 0 ? (
                        <div style={{ textAlign: "center", padding: "36px 0" }}>
                          <span
                            style={{
                              fontSize: 36,
                              display: "block",
                              marginBottom: 10,
                            }}
                          >
                            🎉
                          </span>
                          <p
                            style={{
                              fontSize: 14,
                              fontWeight: 700,
                              color: "#16a34a",
                              marginBottom: 4,
                            }}
                          >
                            Barcha savollarga to'g'ri javob berdingiz!
                          </p>
                          <p style={{ fontSize: 13, color: "#94a3b8" }}>
                            Bu testda hech qanday xato yo'q
                          </p>
                        </div>
                      ) : (
                        <>
                          <p
                            style={{
                              fontSize: 11,
                              fontWeight: 700,
                              color: "#94a3b8",
                              letterSpacing: "0.07em",
                              textTransform: "uppercase",
                              margin: 0,
                            }}
                          >
                            {modal.wrongs.length} ta xato savol
                          </p>

                          {modal.wrongs.map((w, i) => (
                            <div
                              key={w.id}
                              style={{
                                background: "#f8f9fc",
                                border: "1px solid #f1f5f9",
                                borderRadius: 16,
                                overflow: "hidden",
                              }}
                            >
                              <div style={{ padding: "14px" }}>
                                {/* Savol raqami + matni */}
                                <div
                                  style={{
                                    display: "flex",
                                    gap: 8,
                                    marginBottom: 10,
                                  }}
                                >
                                  <span
                                    style={{
                                      width: 20,
                                      height: 20,
                                      background: "#fee2e2",
                                      borderRadius: 6,
                                      display: "flex",
                                      alignItems: "center",
                                      justifyContent: "center",
                                      fontSize: 10,
                                      fontWeight: 700,
                                      color: "#dc2626",
                                      flexShrink: 0,
                                      marginTop: 1,
                                    }}
                                  >
                                    {i + 1}
                                  </span>
                                  <p
                                    style={{
                                      fontSize: 13,
                                      fontWeight: 600,
                                      color: "#1e293b",
                                      margin: 0,
                                      lineHeight: 1.45,
                                    }}
                                  >
                                    {w.questions.question}
                                  </p>
                                </div>

                                {/* Rasm ko'rish button — agar mavjud bo'lsa */}
                                {w.questions.image && (
                                  <button
                                    className="img-btn"
                                    onClick={() =>
                                      setImagePreview(
                                        imgUrl(w.questions.image) ?? "",
                                      )
                                    }
                                    style={{
                                      display: "flex",
                                      alignItems: "center",
                                      gap: 6,
                                      marginBottom: 10,
                                      padding: "6px 12px",
                                      background: "#eef2ff",
                                      border: "1px solid #c7d2fe",
                                      borderRadius: 8,
                                      cursor: "pointer",
                                      color: "#4f46e5",
                                      fontSize: 12,
                                      fontWeight: 600,
                                      transition: "all .15s",
                                    }}
                                  >
                                    <svg
                                      width="14"
                                      height="14"
                                      fill="none"
                                      stroke="currentColor"
                                      strokeWidth="2"
                                      viewBox="0 0 24 24"
                                    >
                                      <rect
                                        x="3"
                                        y="3"
                                        width="18"
                                        height="18"
                                        rx="2"
                                      />
                                      <circle cx="8.5" cy="8.5" r="1.5" />
                                      <polyline points="21 15 16 10 5 21" />
                                    </svg>
                                    Rasmni ko'rish
                                  </button>
                                )}

                                {/* Variantlar */}
                                <div
                                  style={{
                                    display: "flex",
                                    flexDirection: "column",
                                    gap: 6,
                                  }}
                                >
                                  {w.questions.options.map((opt, idx) => {
                                    const isCorrect = idx === w.correct;
                                    const isSelected = idx === w.selected;
                                    if (!isCorrect && !isSelected) return null;
                                    return (
                                      <div
                                        key={idx}
                                        style={{
                                          display: "flex",
                                          alignItems: "center",
                                          gap: 8,
                                          padding: "8px 12px",
                                          borderRadius: 10,
                                          border: `1px solid ${isCorrect ? "#bbf7d0" : "#fecdd3"}`,
                                          background: isCorrect
                                            ? "#f0fdf4"
                                            : "#fff1f2",
                                        }}
                                      >
                                        <div
                                          style={{
                                            width: 18,
                                            height: 18,
                                            borderRadius: "50%",
                                            background: isCorrect
                                              ? "#22c55e"
                                              : "#ef4444",
                                            display: "flex",
                                            alignItems: "center",
                                            justifyContent: "center",
                                            flexShrink: 0,
                                          }}
                                        >
                                          {isCorrect ? (
                                            <svg
                                              width="9"
                                              height="9"
                                              fill="none"
                                              stroke="white"
                                              strokeWidth="2.5"
                                              viewBox="0 0 24 24"
                                            >
                                              <polyline points="20 6 9 17 4 12" />
                                            </svg>
                                          ) : (
                                            <svg
                                              width="7"
                                              height="7"
                                              fill="none"
                                              stroke="white"
                                              strokeWidth="2.5"
                                              viewBox="0 0 24 24"
                                            >
                                              <line
                                                x1="18"
                                                y1="6"
                                                x2="6"
                                                y2="18"
                                              />
                                              <line
                                                x1="6"
                                                y1="6"
                                                x2="18"
                                                y2="18"
                                              />
                                            </svg>
                                          )}
                                        </div>
                                        <span
                                          style={{
                                            fontSize: 11,
                                            fontWeight: 700,
                                            color: isCorrect
                                              ? "#16a34a"
                                              : "#dc2626",
                                            flexShrink: 0,
                                          }}
                                        >
                                          {String.fromCharCode(65 + idx)}.
                                        </span>
                                        <span
                                          style={{
                                            fontSize: 12,
                                            color: isCorrect
                                              ? "#15803d"
                                              : "#be123c",
                                            lineHeight: 1.4,
                                          }}
                                        >
                                          {opt}
                                        </span>
                                        <span
                                          style={{
                                            marginLeft: "auto",
                                            fontSize: 10,
                                            fontWeight: 600,
                                            color: isCorrect
                                              ? "#16a34a"
                                              : "#dc2626",
                                            flexShrink: 0,
                                          }}
                                        >
                                          {isCorrect ? "To'g'ri" : "Siz"}
                                        </span>
                                      </div>
                                    );
                                  })}
                                </div>

                                {/* Explanation */}
                                {w.questions.explanation && (
                                  <div
                                    style={{
                                      marginTop: 8,
                                      padding: "8px 12px",
                                      background: "#eff6ff",
                                      border: "1px solid #bfdbfe",
                                      borderRadius: 10,
                                      display: "flex",
                                      gap: 8,
                                    }}
                                  >
                                    <span
                                      style={{ fontSize: 13, flexShrink: 0 }}
                                    >
                                      💡
                                    </span>
                                    <p
                                      style={{
                                        fontSize: 12,
                                        color: "#1d4ed8",
                                        margin: 0,
                                        lineHeight: 1.5,
                                      }}
                                    >
                                      {w.questions.explanation}
                                    </p>
                                  </div>
                                )}
                              </div>
                            </div>
                          ))}
                        </>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </>
        )}

        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-50">
            <h2 className="font-semibold text-slate-800 text-sm">
              Daraja tizimi
            </h2>
          </div>
          <div className="p-3 grid grid-cols-5 gap-2">
            {RANKS.map((r) => (
              <div
                key={r.name}
                className={`flex flex-col items-center gap-1 p-3 rounded-xl border text-center transition-all ${
                  rankObj.name === r.name
                    ? `${r.bg} ${r.border} shadow-sm scale-105`
                    : "border-slate-100 hover:bg-slate-50"
                }`}
              >
                <span className="text-xl">{r.icon}</span>
                <span
                  className={`text-xs font-semibold ${rankObj.name === r.name ? r.color : "text-slate-400"}`}
                >
                  {r.name}
                </span>
                <span className="text-xs text-slate-300">{r.minXP}+ XP</span>
                {rankObj.name === r.name && (
                  <span
                    className={`text-xs px-1.5 py-0.5 rounded-full ${r.bg} ${r.color} font-semibold border ${r.border}`}
                  >
                    Siz
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>

        <WeeklyLeaderboard currentUserId={user.id} />
      </main>
    </div>
  );
}
