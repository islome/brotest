"use client";
import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase-browser";
import Link from "next/link";
import Image from "next/image";
import AuthScene from "@/components/AuthScene";

type Mode = "login" | "signup";
const MAX_ATTEMPTS = 5;
const BLOCK_MINUTES = 15;

export default function AuthPage() {
  const router = useRouter();
  const supabase = createClient();
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const paneRef = useRef<HTMLDivElement>(null);

  const [mode, setMode] = useState<Mode>("login");
  const [firstname, setFirstname] = useState("");
  const [lastname, setLastname] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [attempts, setAttempts] = useState(0);
  const [isBlocked, setIsBlocked] = useState(false);
  const [blockSecs, setBlockSecs] = useState(0);
  const [fading, setFading] = useState(false);
  const [vis, setVis] = useState(false);
  const [paneH, setPaneH] = useState<number | undefined>(undefined);

  useEffect(() => {
    const t = setTimeout(() => setVis(true), 60);
    return () => {
      clearTimeout(t);
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  // Login ↔ signup almashganda kartochka balandligini silliq animatsiya qilish
  useEffect(() => {
    const el = paneRef.current;
    if (!el) return;
    const update = () => setPaneH(el.offsetHeight);
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  function startBlockTimer() {
    setIsBlocked(true);
    let s = BLOCK_MINUTES * 60;
    setBlockSecs(s);
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      s--;
      setBlockSecs(s);
      if (s <= 0) {
        clearInterval(timerRef.current!);
        setIsBlocked(false);
        setAttempts(0);
      }
    }, 1000);
  }

  function fmt(s: number) {
    return `${Math.floor(s / 60)
      .toString()
      .padStart(2, "0")}:${(s % 60).toString().padStart(2, "0")}`;
  }

  function switchMode(next: Mode) {
    if (fading || mode === next) return;
    setFading(true);
    setTimeout(() => {
      setMode(next);
      setError("");
      setSuccess("");
      setFading(false);
    }, 190);
  }

  async function checkBlocked(): Promise<boolean> {
    try {
      const res = await fetch("/api/auth-attempts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "check",
          email: `${username}@autotest.uz`,
        }),
      });
      if (!res.ok) return false;
      const d = await res.json();
      if (d.isBlocked) {
        startBlockTimer();
        setAttempts(d.attempts);
      }
      return d.isBlocked ?? false;
    } catch {
      return false;
    }
  }

  async function recordFail() {
    try {
      const res = await fetch("/api/auth-attempts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "record",
          email: `${username}@autotest.uz`,
        }),
      });
      if (!res.ok) return 0;
      const d = await res.json();
      setAttempts(d.attempts);
      if (d.isBlocked) startBlockTimer();
      return d.attempts as number;
    } catch {
      return 0;
    }
  }

  async function clearAttempts() {
    await fetch("/api/auth-attempts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "clear",
        email: `${username}@autotest.uz`,
      }),
    });
  }

  // Parol kuchi
  function pwStrength(p: string): {
    level: number;
    label: string;
    color: string;
  } {
    if (!p) return { level: 0, label: "", color: "" };
    let s = 0;
    if (p.length >= 8) s++;
    if (/[A-Z]/.test(p)) s++;
    if (/[0-9]/.test(p)) s++;
    if (/[^a-zA-Z0-9]/.test(p)) s++;
    if (s <= 1) return { level: 1, label: "Zaif", color: "#ef4444" };
    if (s === 2) return { level: 2, label: "O'rtacha", color: "#f59e0b" };
    if (s === 3) return { level: 3, label: "Yaxshi", color: "#3b82f6" };
    return { level: 4, label: "Kuchli", color: "#10b981" };
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);

    if (mode === "login") {
      if (!username.trim()) {
        setError("Username kiriting");
        setLoading(false);
        return;
      }

      const blocked = await checkBlocked();
      if (blocked) {
        setLoading(false);
        return;
      }

      const { error: err } = await supabase.auth.signInWithPassword({
        email: `${username.trim().toLowerCase()}@autotest.uz`,
        password,
      });

      if (err) {
        const newAtt = await recordFail();
        const left = Math.max(0, MAX_ATTEMPTS - newAtt);
        setError(
          left > 0
            ? `Username yoki parol noto'g'ri. Yana ${left} ta urinish.`
            : `${BLOCK_MINUTES} daqiqa kuting.`,
        );
        setLoading(false);
        return;
      }

      await clearAttempts();
      router.push("/");
      router.refresh();
    } else {
      if (!firstname.trim()) {
        setError("Ism kiriting");
        setLoading(false);
        return;
      }
      if (!lastname.trim()) {
        setError("Familiya kiriting");
        setLoading(false);
        return;
      }
      if (!username.trim()) {
        setError("Username kiriting");
        setLoading(false);
        return;
      }
      if (username.length < 3) {
        setError("Username kamida 3 ta belgi bo'lishi kerak");
        setLoading(false);
        return;
      }
      if (password.length < 6) {
        setError("Parol kamida 6 ta belgi bo'lishi kerak");
        setLoading(false);
        return;
      }

      // Username tekshirish
      const { data: exists } = await supabase
        .from("users")
        .select("id")
        .eq("username", username.trim().toLowerCase())
        .maybeSingle();

      if (exists) {
        setError("Bu username band. Boshqa username tanlang.");
        setLoading(false);
        return;
      }

      const res = await fetch("/api/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstname: firstname.trim(),
          lastname: lastname.trim(),
          username: username.trim().toLowerCase(),
          password,
        }),
      });
      let data: { error?: string; success?: boolean; userId?: string } = {};
      try {
        data = await res.json();
      } catch {
        setError("Server xatosi yuz berdi. Qayta urinib ko'ring.");
        setLoading(false);
        return;
      }

      if (!res.ok) {
        setError(data.error || "Xato yuz berdi.");
        setLoading(false);
        return;
      }

      // Auto login
      const { error: loginErr } = await supabase.auth.signInWithPassword({
        email: `${username.trim().toLowerCase()}@autotest.uz`,
        password,
      });

      if (loginErr) {
        setSuccess("Ro'yxatdan o'tildi! Endi kiring.");
        setLoading(false);
        switchMode("login");
        return;
      }

      router.push("/");
      router.refresh();
    }

    setLoading(false);
  }

  const strength = pwStrength(password);
  const isSignup = mode === "signup";

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,600&display=swap');
        .font-syne { font-family: 'Syne', sans-serif; font-weight: 800; }
        .font-dm   { font-family: 'DM Sans', sans-serif; }
        input:-webkit-autofill { -webkit-box-shadow: 0 0 0px 1000px #f8f9fc inset !important; }
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes authFieldUp { from { opacity:0; transform:translateY(12px); } to { opacity:1; transform:translateY(0); } }
        .auth-stagger > * { animation: authFieldUp .42s cubic-bezier(.22,1,.36,1) both; }
        .auth-stagger > *:nth-child(1){animation-delay:.02s}
        .auth-stagger > *:nth-child(2){animation-delay:.07s}
        .auth-stagger > *:nth-child(3){animation-delay:.12s}
        .auth-stagger > *:nth-child(4){animation-delay:.17s}
        .auth-stagger > *:nth-child(5){animation-delay:.22s}
        @media (prefers-reduced-motion: reduce){
          .auth-stagger > *{animation:none}
        }
      `}</style>

      <div className="font-dm min-h-screen w-full bg-[#f8f9fc] lg:grid lg:grid-cols-[1.05fr_0.95fr]">
        {/* ══ LEFT — showcase panel (desktop) ══ */}
        <aside className="relative hidden lg:flex flex-col justify-between overflow-hidden p-10 xl:p-14 text-white">
          {/* gradient + glow background */}
          <div className="absolute inset-0 bg-gradient-to-br from-indigo-600 via-indigo-700 to-violet-800" />
          <div className="absolute -top-24 -left-24 w-96 h-96 rounded-full bg-white/10 blur-3xl" />
          <div className="absolute bottom-0 right-0 w-[28rem] h-[28rem] rounded-full bg-violet-400/20 blur-3xl" />
          <div
            className="absolute inset-0 opacity-[0.12]"
            style={{
              backgroundImage:
                "radial-gradient(circle at 1px 1px, #fff 1px, transparent 0)",
              backgroundSize: "28px 28px",
            }}
          />

          {/* brand */}
          <Link
            href="/"
            className="relative z-10 flex items-center gap-2.5 no-underline w-fit"
          >
            <Image
              src="/logo.png"
              alt="Brotest"
              width={40}
              height={40}
              className="rounded-xl"
            />
            <span className="font-syne text-2xl text-white tracking-tight">
              Brotest
            </span>
          </Link>

          {/* headline + scene */}
          <div className="relative z-10 my-8">
            <h1
              className="font-syne leading-[1.08] tracking-[-0.03em] mb-4"
              style={{ fontSize: "clamp(28px, 3vw, 42px)" }}
            >
              Bilim bilan
              <br />
              yo&apos;lga chiqing.
            </h1>
            <p className="text-indigo-100/80 text-base max-w-sm leading-relaxed">
              Minglab talabalar Brotest bilan haydovchilik guvohnomasiga
              tayyorlanmoqda. Endi navbat sizda.
            </p>

            <div className="mt-6">
              <AuthScene />
            </div>
          </div>

          {/* trust bullets */}
          <ul className="relative z-10 flex flex-wrap gap-x-6 gap-y-2.5 text-sm text-indigo-100/90">
            {[
              "Real imtihon savollari",
              "Tezkor natija va tahlil",
              "Bepul boshlash",
            ].map((t) => (
              <li key={t} className="flex items-center gap-2">
                <span className="w-4 h-4 rounded-full bg-white/20 flex items-center justify-center shrink-0">
                  <svg
                    width="9"
                    height="9"
                    fill="none"
                    stroke="#fff"
                    strokeWidth="3"
                    viewBox="0 0 24 24"
                  >
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </span>
                {t}
              </li>
            ))}
          </ul>
        </aside>

        {/* ══ RIGHT — form panel ══ */}
        <main className="relative flex items-center justify-center px-5 py-10 sm:px-8 min-h-screen lg:min-h-0">
          {/* mobile ambient background */}
          <div className="lg:hidden absolute inset-0 overflow-hidden pointer-events-none">
            <div className="absolute -top-20 -right-16 w-72 h-72 rounded-full bg-indigo-200/40 blur-3xl" />
            <div className="absolute bottom-0 -left-16 w-72 h-72 rounded-full bg-violet-200/40 blur-3xl" />
          </div>

          <div
            className="relative w-full max-w-[420px]"
            style={{
              opacity: vis ? 1 : 0,
              transform: vis ? "translateY(0)" : "translateY(22px)",
              transition:
                "opacity .6s ease, transform .6s cubic-bezier(.22,1,.36,1)",
            }}
          >
            {/* brand (mobile) */}
            <Link
              href="/"
              className="lg:hidden flex items-center justify-center gap-2.5 no-underline mb-7"
            >
              <Image
                src="/logo.png"
                alt="Brotest"
                width={40}
                height={40}
                className="rounded-xl"
              />
              <span className="font-syne text-2xl text-slate-900 tracking-tight">
                Brotest
              </span>
            </Link>

            {/* card */}
            <div className="bg-white rounded-3xl border border-slate-200 shadow-[0_12px_40px_-12px_rgba(15,23,42,0.15)] p-7 sm:p-8">
              {/* heading */}
              <div className="mb-6">
                <h2 className="font-syne text-2xl text-slate-900 tracking-tight mb-1">
                  {isSignup ? "Hisob yarating" : "Xush kelibsiz"}
                </h2>
                <p className="text-sm text-slate-400">
                  {isSignup
                    ? "Bir daqiqada ro'yxatdan o'ting"
                    : "Hisobingizga qaytib kiring"}
                </p>
              </div>

              {/* tab switcher with sliding pill */}
              <div className="relative grid grid-cols-2 p-1 bg-slate-100 rounded-2xl mb-6">
                <span
                  className="absolute top-1 bottom-1 left-1 w-[calc(50%-4px)] bg-white rounded-xl shadow-sm"
                  style={{
                    transform: isSignup ? "translateX(100%)" : "translateX(0)",
                    transition: "transform .34s cubic-bezier(.22,1,.36,1)",
                  }}
                />
                {(["login", "signup"] as Mode[]).map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => switchMode(m)}
                    className={`relative z-10 py-2.5 text-sm font-semibold rounded-xl transition-colors duration-200 ${
                      mode === m
                        ? "text-indigo-600"
                        : "text-slate-400 hover:text-slate-600"
                    }`}
                  >
                    {m === "login" ? "Kirish" : "Ro'yxatdan o'tish"}
                  </button>
                ))}
              </div>

              {/* blocked */}
              {isBlocked && (
                <div className="bg-orange-50 border border-orange-200 rounded-2xl p-5 mb-5 text-center">
                  <div className="w-9 h-9 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-2.5">
                    <svg
                      width="16"
                      height="16"
                      fill="none"
                      stroke="#f97316"
                      strokeWidth="2"
                      viewBox="0 0 24 24"
                    >
                      <circle cx="12" cy="12" r="10" />
                      <line x1="12" y1="8" x2="12" y2="12" />
                      <line x1="12" y1="16" x2="12.01" y2="16" />
                    </svg>
                  </div>
                  <p className="text-[13px] font-semibold text-orange-700 mb-1.5">
                    Hisob vaqtincha bloklandi
                  </p>
                  <p className="font-syne text-4xl text-orange-600 leading-none tracking-wide mb-1.5">
                    {fmt(blockSecs)}
                  </p>
                  <p className="text-xs text-orange-400">
                    5 ta noto&apos;g&apos;ri urinishdan keyin blok
                  </p>
                </div>
              )}

              {/* error */}
              {error && !isBlocked && (
                <div className="flex items-start gap-2.5 bg-rose-50 border border-rose-200 rounded-2xl px-4 py-3 mb-4">
                  <svg
                    width="15"
                    height="15"
                    fill="none"
                    stroke="#ef4444"
                    strokeWidth="2"
                    viewBox="0 0 24 24"
                    className="shrink-0 mt-0.5"
                  >
                    <circle cx="12" cy="12" r="10" />
                    <line x1="15" y1="9" x2="9" y2="15" />
                    <line x1="9" y1="9" x2="15" y2="15" />
                  </svg>
                  <span className="text-[13px] text-rose-700 leading-relaxed">
                    {error}
                  </span>
                </div>
              )}

              {/* success */}
              {success && (
                <div className="flex items-start gap-2.5 bg-green-50 border border-green-200 rounded-2xl px-4 py-3 mb-4">
                  <svg
                    width="15"
                    height="15"
                    fill="none"
                    stroke="#22c55e"
                    strokeWidth="2"
                    viewBox="0 0 24 24"
                    className="shrink-0 mt-0.5"
                  >
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  <span className="text-[13px] text-green-700 leading-relaxed">
                    {success}
                  </span>
                </div>
              )}

              {/* form — smooth crossfade + animated height */}
              <form onSubmit={handleSubmit}>
                <div
                  style={{
                    height: paneH,
                    transition: "height .4s cubic-bezier(.22,1,.36,1)",
                    overflow: "hidden",
                  }}
                >
                  <div ref={paneRef}>
                    <div
                      style={{
                        opacity: fading ? 0 : 1,
                        transform: fading
                          ? "translateY(10px) scale(0.99)"
                          : "translateY(0) scale(1)",
                        transition: "opacity .19s ease, transform .19s ease",
                      }}
                    >
                      <div
                        key={mode}
                        className="auth-stagger flex flex-col gap-3.5"
                      >
                        {/* Signup: ism + familiya */}
                        {isSignup && (
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className={labelCls}>Ism</label>
                              <input
                                type="text"
                                placeholder="Ali"
                                value={firstname}
                                onChange={(e) => setFirstname(e.target.value)}
                                autoComplete="given-name"
                                disabled={loading}
                                className={inputCls}
                              />
                            </div>
                            <div>
                              <label className={labelCls}>Familiya</label>
                              <input
                                type="text"
                                placeholder="Karimov"
                                value={lastname}
                                onChange={(e) => setLastname(e.target.value)}
                                autoComplete="family-name"
                                disabled={loading}
                                className={inputCls}
                              />
                            </div>
                          </div>
                        )}

                        {/* Username */}
                        <div>
                          <label className={labelCls}>Username</label>
                          <div className="relative">
                            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">
                              <svg
                                width="15"
                                height="15"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                viewBox="0 0 24 24"
                              >
                                <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
                                <circle cx="12" cy="7" r="4" />
                              </svg>
                            </span>
                            <input
                              type="text"
                              placeholder="ali_karimov"
                              value={username}
                              onChange={(e) =>
                                setUsername(
                                  e.target.value
                                    .toLowerCase()
                                    .replace(/[^a-z0-9_]/g, ""),
                                )
                              }
                              autoComplete="username"
                              disabled={loading || isBlocked}
                              required
                              className={`${inputCls} pl-10`}
                            />
                          </div>
                          {isSignup &&
                            username.length > 0 &&
                            username.length < 3 && (
                              <p className="text-xs text-amber-500 mt-1.5">
                                Kamida 3 ta belgi kerak
                              </p>
                            )}
                        </div>

                        {/* Password */}
                        <div>
                          <label className={labelCls}>Parol</label>
                          <div className="relative">
                            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">
                              <svg
                                width="15"
                                height="15"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                viewBox="0 0 24 24"
                              >
                                <rect x="3" y="11" width="18" height="11" rx="2" />
                                <path d="M7 11V7a5 5 0 0110 0v4" />
                              </svg>
                            </span>
                            <input
                              type={showPass ? "text" : "password"}
                              placeholder="••••••••"
                              value={password}
                              onChange={(e) => setPassword(e.target.value)}
                              autoComplete={
                                isSignup ? "new-password" : "current-password"
                              }
                              disabled={loading || isBlocked}
                              required
                              minLength={6}
                              className={`${inputCls} pl-10 pr-11`}
                            />
                            <button
                              type="button"
                              tabIndex={-1}
                              onClick={() => setShowPass((v) => !v)}
                              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-indigo-600 transition-colors p-1"
                            >
                              {showPass ? (
                                <svg
                                  width="16"
                                  height="16"
                                  fill="none"
                                  stroke="currentColor"
                                  strokeWidth="2"
                                  viewBox="0 0 24 24"
                                >
                                  <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94" />
                                  <path d="M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19" />
                                  <line x1="1" y1="1" x2="23" y2="23" />
                                </svg>
                              ) : (
                                <svg
                                  width="16"
                                  height="16"
                                  fill="none"
                                  stroke="currentColor"
                                  strokeWidth="2"
                                  viewBox="0 0 24 24"
                                >
                                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                                  <circle cx="12" cy="12" r="3" />
                                </svg>
                              )}
                            </button>
                          </div>

                          {/* Login: attempt dots */}
                          {!isSignup && attempts > 0 && !isBlocked && (
                            <div className="flex gap-1.5 mt-2">
                              {[...Array(MAX_ATTEMPTS)].map((_, i) => (
                                <div
                                  key={i}
                                  className="flex-1 h-[3px] rounded-full transition-colors duration-300"
                                  style={{
                                    background:
                                      i < attempts ? "#ef4444" : "#e2e8f0",
                                  }}
                                />
                              ))}
                            </div>
                          )}

                          {/* Signup: password strength */}
                          {isSignup && password.length > 0 && (
                            <div className="mt-2">
                              <div className="flex gap-1">
                                {[1, 2, 3, 4].map((i) => (
                                  <div
                                    key={i}
                                    className="flex-1 h-[3px] rounded-full transition-colors duration-300"
                                    style={{
                                      background:
                                        i <= strength.level
                                          ? strength.color
                                          : "#e2e8f0",
                                    }}
                                  />
                                ))}
                              </div>
                              <p className="text-xs text-slate-400 mt-1.5">
                                Parol kuchi:{" "}
                                <span
                                  className="font-semibold"
                                  style={{ color: strength.color }}
                                >
                                  {strength.label}
                                </span>
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* submit */}
                <button
                  type="submit"
                  disabled={loading || isBlocked}
                  className="group w-full mt-5 flex items-center justify-center gap-2 bg-indigo-600 enabled:hover:bg-indigo-700 enabled:hover:-translate-y-0.5 disabled:bg-indigo-300 disabled:cursor-not-allowed text-white font-bold text-[15px] py-3.5 rounded-2xl shadow-lg shadow-indigo-200 enabled:hover:shadow-xl enabled:hover:shadow-indigo-300 transition-all"
                >
                  {loading ? (
                    <>
                      <svg
                        className="w-4 h-4"
                        style={{ animation: "spin .7s linear infinite" }}
                        fill="none"
                        viewBox="0 0 24 24"
                      >
                        <circle
                          style={{ opacity: 0.25 }}
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        />
                        <path
                          style={{ opacity: 0.75 }}
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8v8H4z"
                        />
                      </svg>
                      {isSignup ? "Ro'yxatdan o'tilmoqda..." : "Kirilmoqda..."}
                    </>
                  ) : (
                    <>
                      {isSignup ? "Ro'yxatdan o'tish" : "Kirish"}
                      <svg
                        width="16"
                        height="16"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.5"
                        viewBox="0 0 24 24"
                        className="group-enabled:group-hover:translate-x-0.5 transition-transform"
                      >
                        <line x1="5" y1="12" x2="19" y2="12" />
                        <polyline points="12 5 19 12 12 19" />
                      </svg>
                    </>
                  )}
                </button>
              </form>

              {/* switch mode */}
              <p className="text-center text-sm text-slate-400 mt-5">
                {isSignup ? "Hisobingiz bormi?" : "Hisobingiz yo'qmi?"}{" "}
                <button
                  type="button"
                  onClick={() => switchMode(isSignup ? "login" : "signup")}
                  className="text-indigo-600 font-semibold hover:text-indigo-700 transition-colors"
                >
                  {isSignup ? "Kiring" : "Ro'yxatdan o'ting"}
                </button>
              </p>
            </div>

            {/* back link */}
            <p className="text-center mt-5 text-sm">
              <Link
                href="/"
                className="text-slate-400 hover:text-indigo-600 transition-colors no-underline"
              >
                ← Bosh sahifaga qaytish
              </Link>
            </p>
          </div>
        </main>
      </div>
    </>
  );
}

// ── style helpers ──────────────────────────────
const labelCls =
  "block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5";

const inputCls =
  "w-full box-border bg-slate-50 border-2 border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 outline-none transition-colors focus:border-indigo-500 focus:bg-white placeholder:text-slate-400 disabled:opacity-60";
