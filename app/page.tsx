"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase-browser";

interface UserData {
  firstname: string;
  lastname: string;
  username: string;
  role: string;
  avatar_icon: string;
}

function CountUp({ value, suffix = "" }: { value: number; suffix?: string }) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let startTime: number | null = null;
    const duration = 3000;

    const animate = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / duration, 1);
      const easedProgress = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
      
      setCount(Math.floor(easedProgress * value));

      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };

    const animationId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationId);
  }, [value]);

  return <>{count.toLocaleString()}{suffix}</>;
}

export default function MainPage() {
  const supabase = createClient();
  const router = useRouter();

  const [user, setUser] = useState<UserData | null>(null);
  const [qCount, setQCount] = useState<number>(0);
  const [uCount, setUCount] = useState<number>(0);
  const [menuOpen, setMenuOpen] = useState(false);
  const [mobileNav, setMobileNav] = useState(false);
  const [vis, setVis] = useState(false);

  useEffect(() => {
    setTimeout(() => setVis(true), 60);
    async function init() {
      const {
        data: { user: au },
      } = await supabase.auth.getUser();
      if (au) {
        const { data } = await supabase
          .from("users")
          .select("firstname,lastname,username,role, avatar_icon")
          .eq("id", au.id)
          .single();
        if (data) setUser(data);
      }
      const [{ count: q }, { count: u }] = await Promise.all([
        supabase.from("questions").select("*", { count: "exact", head: true }),
        supabase.from("users").select("*", { count: "exact", head: true }),
      ]);
      setQCount(q ?? 0);
      setUCount(u ?? 0);
    }
    init();
  }, []);

  async function logout() {
    await supabase.auth.signOut();
    setUser(null);
    setMenuOpen(false);
    setMobileNav(false);
  }

  const initials = user
    ? (user.firstname.charAt(0) + user.lastname.charAt(0)).toUpperCase()
    : "";

  const navLinks = [
    { href: "/test", label: "Test topshirish" },
    { href: "/signs", label: "Yo'l belgilari" },
    { href: "/profile", label: "Profil" },
  ];

  const features = [
    {
      e: "✅",
      bg: "bg-blue-50",
      title: "Real savollar",
      desc: "O'zbekiston yo'l harakati xizmati talablariga mos keluvchi haqiqiy imtihon savollari.",
    },
    {
      e: "⏱",
      bg: "bg-yellow-50",
      title: "Vaqt boshqaruvi",
      desc: "Real imtihon sharoiti: 20 yoki 50 savol, belgilangan vaqt doirasida.",
    },
    {
      e: "📊",
      bg: "bg-green-50",
      title: "Statistika",
      desc: "Har bir testdan keyin batafsil tahlil: to'g'ri, xato, o'tish foizi.",
    },
    {
      e: "⭐",
      bg: "bg-purple-50",
      title: "Daraja tizimi",
      desc: "Yangi → Boshliq → O'rtacha → Tajribali → Usta. XP yig'ing, darajangizni oshiring.",
    },
    {
      e: "🖼",
      bg: "bg-sky-50",
      title: "Rasmli savollar",
      desc: "Yo'l belgilari va vaziyatli rasmlar bilan ishlash — real imtihon kabi.",
    },
    {
      e: "🆓",
      bg: "bg-rose-50",
      title: "Bepul kirish",
      desc: "Ro'yxatdan o'tmasdan ham testdan foydalanish mumkin. Statistika uchun hisob kerak.",
    },
  ];

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,600&display=swap');
        .font-syne { font-family: 'Syne', sans-serif; font-weight: 800; }
        .font-dm   { font-family: 'DM Sans', sans-serif; }
        @keyframes marquee { from { transform: translateX(0); } to { transform: translateX(-50%); } }
        .marquee-track { display: flex; width: max-content; animation: marquee 28s linear infinite; }
        .marquee-wrap:hover .marquee-track { animation-play-state: paused; }
        @keyframes dot-pulse { 0%,100%{opacity:1} 50%{opacity:.4} }
        .dot-pulse { animation: dot-pulse 2s infinite; }
        @keyframes fadeUp { from { opacity:0; transform:translateY(20px); } to { opacity:1; transform:translateY(0); } }
        .fade-up-1 { animation: fadeUp .6s cubic-bezier(.22,1,.36,1) .05s both; }
        .fade-up-2 { animation: fadeUp .6s cubic-bezier(.22,1,.36,1) .15s both; }
        .fade-up-3 { animation: fadeUp .6s cubic-bezier(.22,1,.36,1) .25s both; }
        .fade-up-4 { animation: fadeUp .6s cubic-bezier(.22,1,.36,1) .35s both; }
        .fade-up-5 { animation: fadeUp .6s cubic-bezier(.22,1,.36,1) .45s both; }
      `}</style>

      <div className="font-dm min-h-screen bg-[#f8f9fc]">
        {/* ══ NAVBAR ══ */}
        <nav
          className="sticky top-0 z-50 border-b border-slate-200"
          style={{
            background: "rgba(255,255,255,.88)",
            backdropFilter: "blur(20px)",
          }}
        >
          <div className="max-w-6xl mx-auto px-5 h-16 flex items-center justify-between gap-4">
            {/* Logo */}
            <a
              href="/"
              className="flex items-center gap-2.5 no-underline shrink-0"
            >
              <div
                style={{
                  width: 40,
                  height: 40,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  overflow: "hidden",
                }}
              >
                <img
                  src="/logo.png"
                  alt="Brotest Logo"
                  style={{
                    width: "100%",
                    height: "100%",
                    objectFit: "contain",
                  }}
                />
              </div>
              <span className="font-syne text-xl text-slate-900 tracking-tight">
                Brotest
              </span>
            </a>

            {/* Desktop center links */}
            <div className="hidden md:flex items-center gap-1">
              {navLinks.map((l) => (
                <a
                  key={l.href}
                  href={l.href}
                  className="text-sm font-medium text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 px-4 py-2 rounded-xl transition-all no-underline"
                >
                  {l.label}
                </a>
              ))}
              {user?.role === "admin" && (
                <a
                  href="/admin/addQuestion"
                  className="text-sm font-medium text-violet-600 hover:bg-violet-50 px-4 py-2 rounded-xl transition-all no-underline"
                >
                  Admin
                </a>
              )}
            </div>

            {/* Desktop auth */}
            <div className="hidden md:flex items-center gap-2">
              {user ? (
                <div className="relative">
                  <button
                    onClick={() => setMenuOpen((v) => !v)}
                    className="flex items-center gap-2.5 bg-white border border-slate-200 hover:border-indigo-300 rounded-xl px-3 py-2 transition-all cursor-pointer"
                  >
                    <div className="w-7 h-7 flex items-center justify-center">
                      <span className="text-xl mb-2">
                        {user.avatar_icon}
                      </span>
                    </div>
                    <span className="text-sm font-medium text-slate-700">
                      {user.firstname}
                    </span>
                    <svg
                      width="11"
                      height="11"
                      fill="none"
                      stroke="#94a3b8"
                      strokeWidth="2.5"
                      viewBox="0 0 24 24"
                      className={`transition-transform duration-200 ${menuOpen ? "rotate-180" : ""}`}
                    >
                      <polyline points="6 9 12 15 18 9" />
                    </svg>
                  </button>

                  {menuOpen && (
                    <div className="absolute right-0 top-full mt-2 w-52 bg-white rounded-2xl border border-slate-100 shadow-xl py-2 z-50">
                      {[
                        {
                          href: "/profile",
                          icon: "M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2M12 11a4 4 0 100-8 4 4 0 000 8z",
                          label: "Profilim",
                        },
                        {
                          href: "/test",
                          icon: "M5 3l14 9-14 9V3z",
                          label: "Test topshirish",
                        },
                      ].map((item) => (
                        <a
                          key={item.href}
                          href={item.href}
                          onClick={() => setMenuOpen(false)}
                          className="flex items-center gap-3 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 transition-colors no-underline"
                        >
                          <svg
                            width="14"
                            height="14"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            viewBox="0 0 24 24"
                          >
                            <path d={item.icon} />
                          </svg>
                          {item.label}
                        </a>
                      ))}
                      {user.role === "admin" && (
                        <a
                          href="/admin/addQuestion"
                          onClick={() => setMenuOpen(false)}
                          className="flex items-center gap-3 px-4 py-2.5 text-sm text-violet-600 hover:bg-violet-50 transition-colors no-underline"
                        >
                          <svg
                            width="14"
                            height="14"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            viewBox="0 0 24 24"
                          >
                            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                          </svg>
                          Admin panel
                        </a>
                      )}
                      <div className="my-1.5 border-t border-slate-100" />
                      <button
                        onClick={logout}
                        className="flex items-center gap-3 px-4 py-2.5 text-sm text-red-500 hover:bg-red-50 transition-colors w-full text-left cursor-pointer bg-transparent border-none"
                      >
                        <svg
                          width="14"
                          height="14"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          viewBox="0 0 24 24"
                        >
                          <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" />
                          <polyline points="16 17 21 12 16 7" />
                          <line x1="21" y1="12" x2="9" y2="12" />
                        </svg>
                        Chiqish
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <>
                  <a
                    href="/auth"
                    className="text-sm font-medium text-slate-600 hover:text-indigo-600 hover:bg-slate-100 px-4 py-2 rounded-xl transition-all no-underline"
                  >
                    Kirish
                  </a>
                  <a
                    href="/auth"
                    className="text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 hover:-translate-y-0.5 px-5 py-2.5 rounded-xl transition-all shadow-md shadow-indigo-200 no-underline"
                  >
                    Ro'yxatdan o'tish
                  </a>
                </>
              )}
            </div>

            {/* Mobile right */}
            <div className="flex md:hidden items-center gap-2">
              {user && (
                <div className="w-8 h-8 flex items-center justify-center">
                  <span className="text-xs mb-1">
                    {user.avatar_icon}
                  </span>
                </div>
              )}
              <button
                onClick={() => setMobileNav((v) => !v)}
                className="w-9 h-9 flex flex-col items-center justify-center gap-1.5 bg-white border border-slate-200 rounded-xl cursor-pointer"
              >
                <span
                  className={`block h-0.5 bg-slate-600 transition-all duration-200 ${mobileNav ? "w-5 rotate-45 translate-y-2" : "w-5"}`}
                />
                <span
                  className={`block h-0.5 bg-slate-600 transition-all duration-200 ${mobileNav ? "opacity-0 w-5" : "w-4"}`}
                />
                <span
                  className={`block h-0.5 bg-slate-600 transition-all duration-200 ${mobileNav ? "w-5 -rotate-45 -translate-y-2" : "w-5"}`}
                />
              </button>
            </div>
          </div>

          {/* Mobile menu */}
          {mobileNav && (
            <div className="md:hidden border-t border-slate-100 bg-white px-5 py-4 flex flex-col gap-1">
              {navLinks.map((l) => (
                <a
                  key={l.href}
                  href={l.href}
                  onClick={() => setMobileNav(false)}
                  className="flex items-center gap-3 px-3 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50 rounded-xl transition-colors no-underline"
                >
                  {l.label}
                </a>
              ))}
              {user?.role === "admin" && (
                <a
                  href="/admin/addQuestion"
                  onClick={() => setMobileNav(false)}
                  className="flex items-center gap-3 px-3 py-3 text-sm font-medium text-violet-600 hover:bg-violet-50 rounded-xl transition-colors no-underline"
                >
                  Admin panel
                </a>
              )}
              <div className="border-t border-slate-100 mt-2 pt-3 flex flex-col gap-2">
                {user ? (
                  <>
                    <a
                      href="/profile"
                      onClick={() => setMobileNav(false)}
                      className="flex items-center gap-3 px-3 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50 rounded-xl no-underline"
                    >
                      👤 {user.firstname} {user.lastname}
                    </a>
                    <button
                      onClick={logout}
                      className="flex items-center gap-2 px-3 py-3 text-sm font-semibold text-red-500 hover:bg-red-50 rounded-xl w-full text-left cursor-pointer bg-transparent border-none"
                    >
                      Chiqish
                    </button>
                  </>
                ) : (
                  <div className="flex gap-2">
                    <a
                      href="/auth"
                      className="flex-1 text-center text-sm font-medium text-slate-600 border border-slate-200 py-2.5 rounded-xl no-underline hover:bg-slate-50 transition-all"
                    >
                      Kirish
                    </a>
                    <a
                      href="/auth"
                      className="flex-1 text-center text-sm font-semibold text-white bg-indigo-600 py-2.5 rounded-xl no-underline hover:bg-indigo-700 transition-all"
                    >
                      Ro'yxatdan o'tish
                    </a>
                  </div>
                )}
              </div>
            </div>
          )}
        </nav>

        {menuOpen && (
          <div
            className="fixed inset-0 z-40"
            onClick={() => setMenuOpen(false)}
          />
        )}

        {/* ══ HERO ══ */}
        <section className="px-5 pt-16 pb-14 sm:pt-20 sm:pb-16 lg:pt-24 lg:pb-20">
          <div className="max-w-4xl mx-auto text-center">
            <div className="fade-up-1 inline-flex items-center gap-2 bg-indigo-50 border border-indigo-200 text-indigo-700 text-xs font-semibold px-4 py-2 rounded-full mb-8">
              <span className="dot-pulse w-1.5 h-1.5 bg-indigo-500 rounded-full" />
              Avtomobil guvohnomasi uchun test platformasi
            </div>

            <div className="fade-up-2 mb-6">
              <h1
                className="font-syne text-slate-900 leading-[1.02] tracking-[-0.035em] m-0"
                style={{ fontSize: "clamp(32px, 7vw, 100px)" }}
              >
                Haydovchilik
              </h1>
              <h1
                className="font-syne text-indigo-600 leading-[1.02] tracking-[-0.035em] m-0 inline-block relative"
                style={{ fontSize: "clamp(32px, 7vw, 100px)" }}
              >
                guvohnomasini
                <svg
                  className="absolute left-0 w-full overflow-visible"
                  style={{ bottom: -6 }}
                  viewBox="0 0 400 12"
                  fill="none"
                >
                  <path
                    d="M4 8 C80 2 260 2 396 8"
                    stroke="#a5b4fc"
                    strokeWidth="4"
                    strokeLinecap="round"
                  />
                </svg>
              </h1>
              <h1
                className="font-syne text-slate-900 leading-[1.02] tracking-[-0.035em] m-0"
                style={{ fontSize: "clamp(22px, 7vw, 100px)" }}
              >
                oling!
              </h1>
            </div>

            <p className="fade-up-3 text-slate-500 leading-relaxed mx-auto mb-10 max-w-lg text-base sm:text-lg">
              Real savollarga asoslangan testlar, tezkor natijalar va kuzatuv
              statistikasi. Imtihonga tayyor bo'ling.
            </p>

            {/* CTA */}
            <div className="fade-up-4 flex flex-col sm:flex-row items-center justify-center gap-3">
              <a
                href="/test"
                className="w-full sm:w-auto flex items-center justify-center gap-2.5 bg-indigo-600 hover:bg-indigo-700 hover:-translate-y-0.5 text-white font-bold text-base px-8 py-4 rounded-2xl transition-all shadow-lg shadow-indigo-200 hover:shadow-xl hover:shadow-indigo-300 no-underline"
              >
                <svg width="16" height="16" fill="white" viewBox="0 0 24 24">
                  <polygon points="5 3 19 12 5 21 5 3" />
                </svg>
                Testni boshlash
              </a>
              {user ? (
                <a
                  href="/profile"
                  className="w-full sm:w-auto flex items-center justify-center gap-2 bg-white hover:bg-slate-50 hover:-translate-y-0.5 text-slate-700 font-semibold text-base px-8 py-4 rounded-2xl border-2 border-slate-200 hover:border-indigo-300 transition-all no-underline"
                >
                  Profilim
                  <svg
                    width="15"
                    height="15"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    viewBox="0 0 24 24"
                  >
                    <polyline points="9 18 15 12 9 6" />
                  </svg>
                </a>
              ) : (
                <a
                  href="/auth"
                  className="w-full sm:w-auto flex items-center justify-center gap-2 bg-white hover:bg-slate-50 hover:-translate-y-0.5 text-slate-700 font-semibold text-base px-8 py-4 rounded-2xl border-2 border-slate-200 hover:border-indigo-300 transition-all no-underline"
                >
                  Hisob yaratish
                  <svg
                    width="15"
                    height="15"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    viewBox="0 0 24 24"
                  >
                    <polyline points="9 18 15 12 9 6" />
                  </svg>
                </a>
              )}
            </div>
          </div>
        </section>

        {/* ══ STATS ══ */}
        <section className="px-5 pb-16 sm:pb-20 fade-up-5">
          <div className="max-w-3xl mx-auto grid grid-cols-3 gap-3 sm:gap-4">
            {[
              {
                target: qCount,
                suffix: "+",
                label: "Savol bazasida",
                sub: "real imtihon savollari",
              },
              {
                target: uCount,
                suffix: "+",
                label: "Foydalanuvchilar",
                sub: "ro'yxatdan o'tgan",
              },
              {
                target: 70,
                suffix: "%",
                label: "O'tish chegarasi",
                sub: "muvaffaqiyatli hisob",
              },
            ].map((s, i) => (
              <div
                key={i}
                className="bg-white rounded-2xl border border-slate-200 px-3 py-5 sm:px-6 sm:py-7 text-center shadow-sm hover:-translate-y-1 hover:shadow-lg transition-all"
              >
                <p
                  className="font-syne text-indigo-600 leading-none mb-2"
                  style={{ fontSize: "clamp(28px,6vw,44px)" }}
                >
                  <CountUp value={s.target} suffix={s.suffix} />
                </p>
                <p className="text-xs sm:text-sm font-semibold text-slate-700 mb-1">
                  {s.label}
                </p>
                <p className="text-xs text-slate-400 hidden sm:block">
                  {s.sub}
                </p>
              </div>
            ))}
          </div>
        </section>

        <div className="marquee-wrap border-y border-slate-200 bg-white py-3.5 mb-16 sm:mb-20 overflow-hidden">
          <div
            className="marquee-track"
            style={{
              display: "flex",
              width: "max-content",
              animation: "marquee-scroll 25s linear infinite",
            }}
          >
            {[0, 1].map((ri) => (
              <div key={ri} className="flex items-center gap-10 px-5">
                {[
                  "Yo'l harakati qoidalari",
                  "Real imtihon savollari",
                  "Tezkor natijalar",
                  "Statistika va tahlil",
                  "Daraja tizimi",
                  "Bepul foydalanish",
                  "Rasmli savollar",
                  "Vaqtli test",
                ].map((t, i) => (
                  <span
                    key={i}
                    className="flex items-center gap-3 text-sm font-medium text-slate-500 whitespace-nowrap"
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 shrink-0" />
                    {t}
                  </span>
                ))}
              </div>
            ))}
          </div>
        </div>

        {/* ══ FEATURES ══ */}
        <section className="px-5 pb-16 sm:pb-20">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-10 sm:mb-14">
              <h2
                className="font-syne text-slate-900 tracking-tight mb-3"
                style={{ fontSize: "clamp(28px,5vw,48px)" }}
              >
                Nima uchun Brotest?
              </h2>
              <p className="text-slate-500 text-base max-w-md mx-auto">
                Imtihonga tayyorlanishning eng samarali yo'li
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {features.map((f, i) => (
                <div
                  key={i}
                  className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm hover:-translate-y-1 hover:shadow-md transition-all"
                >
                  <div
                    className={`w-12 h-12 ${f.bg} rounded-2xl flex items-center justify-center mb-4 text-xl`}
                  >
                    {f.e}
                  </div>
                  <p className="font-bold text-slate-800 text-base mb-2">
                    {f.title}
                  </p>
                  <p className="text-sm text-slate-500 leading-relaxed m-0">
                    {f.desc}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ══ CTA BANNER ══ */}
        <section className="px-5 pb-16 sm:pb-20">
          <div className="max-w-6xl mx-auto">
            <div className="bg-gradient-to-br from-indigo-600 to-violet-700 rounded-3xl px-6 py-14 sm:px-12 sm:py-16 text-center relative overflow-hidden">
              <div className="absolute w-64 h-64 bg-white/5 rounded-full -top-16 -right-12" />
              <div className="absolute w-48 h-48 bg-white/5 rounded-full -bottom-12 -left-8" />
              <div className="relative">
                <h2
                  className="font-syne text-white tracking-tight mb-3"
                  style={{ fontSize: "clamp(28px,5vw,52px)" }}
                >
                  Bugun boshlang!
                </h2>
                <p className="text-indigo-200 text-base sm:text-lg mb-8 max-w-md mx-auto leading-relaxed">
                  Minglab o'zbekistonliklar shu platforma orqali guvohnoma oldi.
                  Siz ham ularga qo'shiling.
                </p>
                <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                  <a
                    href="/test"
                    className="w-full sm:w-auto flex items-center justify-center gap-2.5 bg-white hover:-translate-y-0.5 text-indigo-700 font-bold text-sm sm:text-base px-7 py-3.5 rounded-2xl transition-all shadow-lg no-underline"
                  >
                    <svg
                      width="14"
                      height="14"
                      fill="#4f46e5"
                      viewBox="0 0 24 24"
                    >
                      <polygon points="5 3 19 12 5 21 5 3" />
                    </svg>
                    Testni boshlash
                  </a>
                  {!user && (
                    <a
                      href="/auth"
                      className="w-full sm:w-auto flex items-center justify-center gap-2 bg-white/10 hover:bg-white/20 hover:-translate-y-0.5 border border-white/25 text-white font-semibold text-sm sm:text-base px-7 py-3.5 rounded-2xl transition-all no-underline"
                    >
                      Ro'yxatdan o'tish
                    </a>
                  )}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ══ FOOTER ══ */}
        <footer className="border-t border-slate-200 bg-white px-5 py-7 sm:py-8">
          <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 bg-indigo-600 rounded-[9px] flex items-center justify-center">
                <svg
                  width="12"
                  height="12"
                  fill="none"
                  stroke="white"
                  strokeWidth="2.2"
                  viewBox="0 0 24 24"
                >
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                </svg>
              </div>
              <span className="font-syne text-sm text-slate-900">Brotest</span>
              <span className="text-slate-300">·</span>
              <span className="text-xs text-slate-400 hidden sm:inline">
                Haydovchilik testlari platformasi
              </span>
            </div>
            <div className="flex items-center gap-5 flex-wrap justify-center">
              {[
                { href: "/test", l: "Test" },
                { href: "/signs", l: "Yo'l belgilari" },
                { href: "/profile", l: "Profil" },
                ...(!user ? [{ href: "/auth", l: "Kirish" }] : []),
              ].map((x) => (
                <a
                  key={x.href}
                  href={x.href}
                  className="text-xs text-slate-400 hover:text-indigo-600 transition-colors no-underline"
                >
                  {x.l}
                </a>
              ))}
              {user?.role === "admin" && (
                <a
                  href="/admin/addQuestion"
                  className="text-xs text-violet-500 hover:text-violet-700 transition-colors no-underline"
                >
                  Admin
                </a>
              )}
            </div>
          </div>
        </footer>
      </div>
    </>
  );
}
