"use client";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase-browser";
import Link from "next/link";

interface UserData {
  firstname: string;
  lastname: string;
  username: string;
  subscription?: string;
  avatar_icon: string;
}

export default function PricingPage() {
  const [user, setUser] = useState<UserData | null>(null);
  const [vis, setVis] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    setTimeout(() => setVis(true), 60);
    async function init() {
      try {
        const supabase = createClient();
        const {
          data: { user: au },
        } = await supabase.auth.getUser();
        if (au) {
          const { data } = await supabase
            .from("users")
            .select("firstname,lastname,username,subscription,avatar_icon")
            .eq("id", au.id)
            .single();
          if (data) setUser(data);
        }
      } catch (error) {
        console.error("Failed to fetch user:", error);
      }
    }
    init();
  }, []);

  const navLinks = [
    { href: "/test", label: "Test topshirish" },
    { href: "/signs", label: "Yo'l belgilari" },
    { href: "/pricing", label: "Obuna" },
    { href: "/profile", label: "Profil" },
  ];

  const pricingPlans = [
    {
      id: "free",
      name: "Free",
      price: 0,
      billingPeriod: "abadiy",
      description: "Cheklash uchun birinchi qadam",
      cta: "Boshlash",
      ctaLink: "/test",
      highlight: false,
      features: [
        { name: "Cheklash sonini saralash", included: true },
        { name: "Statistika va analitika", included: false },
        { name: "Barcha xususiyatlar", included: false },
      ],
    },
    {
      id: "plus",
      name: "Plus",
      price: 4.99,
      billingPeriod: "oy",
      description: "Cheksiz imkoniyatlar va statistika",
      cta: "Yuksaltirish",
      ctaLink: "/test",
      highlight: true,
      features: [
        { name: "Cheklash sonini saralash", included: true },
        { name: "Statistika va analitika", included: true },
        { name: "Barcha xususiyatlar", included: false },
      ],
    },
    {
      id: "life",
      name: "Life",
      price: 49.99,
      billingPeriod: "bir vaqta",
      description: "Abadiy barcha xususiyatlar",
      cta: "Xarid qilish",
      ctaLink: "/test",
      highlight: false,
      features: [
        { name: "Cheklash sonini saralash", included: true },
        { name: "Statistika va analitika", included: true },
        { name: "Barcha xususiyatlar", included: true },
      ],
    },
  ];

  const allFeatures = [
    { name: "Cheklash sonini saralash", category: "Asosiy" },
    { name: "Statistika va analitika", category: "Asosiy" },
    { name: "Barcha xususiyatlar", category: "Premium" },
  ];

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,600&display=swap');
        .font-syne { font-family: 'Syne', sans-serif; font-weight: 800; }
        .font-dm   { font-family: 'DM Sans', sans-serif; }
        @keyframes fadeUp { from { opacity:0; transform:translateY(20px); } to { opacity:1; transform:translateY(0); } }
        .fade-up-1 { animation: fadeUp .6s cubic-bezier(.22,1,.36,1) .05s both; }
        .fade-up-2 { animation: fadeUp .6s cubic-bezier(.22,1,.36,1) .15s both; }
        .fade-up-3 { animation: fadeUp .6s cubic-bezier(.22,1,.36,1) .25s both; }
        .fade-up-4 { animation: fadeUp .6s cubic-bezier(.22,1,.36,1) .35s both; }
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
            <Link
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
            </Link>

            {/* Desktop center links */}
            <div className="hidden md:flex items-center gap-1">
              {navLinks.map((l) => (
                <Link
                  key={l.href}
                  href={l.href}
                  className="text-sm font-medium text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 px-4 py-2 rounded-xl transition-all no-underline"
                >
                  {l.label}
                </Link>
              ))}
            </div>

            {/* Desktop auth */}
            <div className="hidden md:flex items-center gap-2">
              {user ? (
                <button
                  onClick={() => setMenuOpen((v) => !v)}
                  className="flex items-center gap-2.5 bg-white border border-slate-200 hover:border-indigo-300 rounded-xl px-3 py-2 transition-all cursor-pointer"
                >
                  <div className="w-7 h-7 flex items-center justify-center">
                    <span className="text-xl mb-2">{user.avatar_icon}</span>
                  </div>
                  <span className="text-sm font-medium text-slate-700">
                    {user.firstname}
                  </span>
                </button>
              ) : (
                <>
                  <Link
                    href="/auth"
                    className="text-sm font-medium text-slate-500 hover:text-indigo-600 px-4 py-2 rounded-xl transition-all no-underline"
                  >
                    Kirish
                  </Link>
                  <Link
                    href="/auth"
                    className="text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 px-6 py-2 rounded-xl transition-all no-underline"
                  >
                    Ro'yxatdan o'tish
                  </Link>
                </>
              )}
            </div>

            {/* Mobile menu button */}
            <div className="md:hidden flex items-center gap-2">
              {user ? (
                <div className="w-8 h-8 flex items-center justify-center">
                  <span className="text-lg">{user.avatar_icon}</span>
                </div>
              ) : (
                <Link
                  href="/auth"
                  className="text-sm font-bold text-indigo-600 no-underline"
                >
                  Kirish
                </Link>
              )}
            </div>
          </div>
        </nav>

        {/* ══ HERO SECTION ══ */}
        <section className="px-5 pt-16 sm:pt-20 pb-12">
          <div className="max-w-4xl mx-auto text-center">
            <div className="fade-up-1 inline-flex items-center gap-2 bg-indigo-50 border border-indigo-200 rounded-full px-4 py-2 mb-6">
              <span className="text-indigo-600 text-sm font-bold">💎 Tarif rejasini tanlang</span>
            </div>
            <h1
              className="font-syne text-slate-900 tracking-tight mb-4"
              style={{ fontSize: "clamp(32px,6vw,56px)" }}
            >
              Hamma uchun musbat
              <br />
              <span className="text-indigo-600">narx taklifi</span>
            </h1>
            <p className="text-slate-500 text-base sm:text-lg max-w-2xl mx-auto leading-relaxed mb-8">
              Botlarning imtihon platforma uchun tarif rejasi. Bepuldan premium-gacha barcha xususiyatlarni o'rganib chiqing.
            </p>
          </div>
        </section>

        <section className="px-5 py-12 sm:py-16">
          <div className="max-w-6xl mx-auto">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {pricingPlans.map((plan, idx) => (
                <div
                  key={plan.id}
                  className={`fade-up-${idx + 2} rounded-3xl transition-all ${
                    plan.highlight
                      ? "bg-gradient-to-br from-indigo-50 to-blue-50 border-2 border-indigo-300 shadow-lg scale-105"
                      : "bg-white border border-slate-200 shadow-sm hover:-translate-y-1 hover:shadow-md"
                  }`}
                  style={{ animationDelay: `${idx * 0.1}s` }}
                >
                  <div className="p-6 sm:p-8">
                    {plan.highlight && (
                      <div className="inline-flex items-center gap-2 bg-indigo-600 text-white rounded-full px-3 py-1 mb-4 text-xs font-bold">
                        ⭐ Tavsiya etilgan
                      </div>
                    )}
                    <h3 className="font-syne text-2xl text-slate-900 mb-2">
                      {plan.name}
                    </h3>
                    <p className="text-slate-500 text-sm mb-6">{plan.description}</p>

                    {/* Price */}
                    <div className="mb-6">
                      <div className="flex items-baseline gap-2">
                        <span className="font-syne text-4xl sm:text-5xl text-slate-900">
                          {plan.price === 0 ? "Bepul" : `$${plan.price.toFixed(2)}`}
                        </span>
                        {plan.price > 0 && (
                          <span className="text-slate-500 text-sm">/ {plan.billingPeriod}</span>
                        )}
                      </div>
                    </div>

                    {/* CTA Button */}
                    <a
                      href={plan.ctaLink}
                      className={`block w-full text-center font-bold py-3 px-6 rounded-2xl mb-6 transition-all no-underline ${
                        plan.highlight
                          ? "bg-indigo-600 hover:bg-indigo-700 text-white hover:-translate-y-0.5 shadow-lg"
                          : "bg-slate-100 hover:bg-slate-200 text-slate-900 hover:-translate-y-0.5"
                      }`}
                    >
                      {plan.cta}
                    </a>

                    {/* Features */}
                    <div className="space-y-3 border-t border-slate-200 pt-6">
                      {plan.features.map((feature, i) => (
                        <div key={i} className="flex items-start gap-3">
                          <span
                            className={`text-lg leading-none pt-0.5 flex-shrink-0 ${
                              feature.included ? "text-green-500" : "text-slate-300"
                            }`}
                          >
                            {feature.included ? "✓" : "✗"}
                          </span>
                          <span
                            className={`text-sm ${
                              feature.included ? "text-slate-700" : "text-slate-400"
                            }`}
                          >
                            {feature.name}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ══ COMPARISON TABLE ══ */}
        <section className="px-5 py-12 sm:py-16">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-12">
              <h2
                className="font-syne text-slate-900 tracking-tight mb-2"
                style={{ fontSize: "clamp(28px,5vw,44px)" }}
              >
                Tarif rejalarining tafsili
              </h2>
              <p className="text-slate-500 text-base">
                Barcha xususiyatlarni qiyoslang
              </p>
            </div>

            <div className="overflow-x-auto rounded-2xl border border-slate-200">
              <table className="w-full">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    <th className="text-left px-4 sm:px-6 py-4 font-semibold text-slate-900">
                      Xususiyat
                    </th>
                    {pricingPlans.map((plan) => (
                      <th
                        key={plan.id}
                        className="text-center px-4 sm:px-6 py-4 font-semibold text-slate-900 whitespace-nowrap"
                      >
                        {plan.name}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {allFeatures.map((feature, idx) => (
                    <tr
                      key={idx}
                      className={`border-b border-slate-200 ${
                        idx % 2 === 0 ? "bg-white" : "bg-slate-50"
                      }`}
                    >
                      <td className="px-4 sm:px-6 py-4 font-medium text-slate-700 text-sm">
                        {feature.name}
                      </td>
                      {pricingPlans.map((plan) => {
                        const featureIncluded = plan.features.find(
                          (f) => f.name === feature.name
                        )?.included;
                        return (
                          <td
                            key={`${plan.id}-${feature.name}`}
                            className="text-center px-4 sm:px-6 py-4"
                          >
                            <span
                              className={`text-xl ${
                                featureIncluded
                                  ? "text-green-500"
                                  : "text-slate-300"
                              }`}
                            >
                              {featureIncluded ? "✓" : "✗"}
                            </span>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* ══ CTA BANNER ══ */}
        <section className="px-5 py-12 sm:py-16">
          <div className="max-w-6xl mx-auto">
            <div className="bg-gradient-to-br from-indigo-600 to-violet-700 rounded-3xl px-6 py-14 sm:px-12 sm:py-16 text-center relative overflow-hidden">
              <div className="absolute w-64 h-64 bg-white/5 rounded-full -top-16 -right-12" />
              <div className="absolute w-48 h-48 bg-white/5 rounded-full -bottom-12 -left-8" />
              <div className="relative">
                <h2
                  className="font-syne text-white tracking-tight mb-3"
                  style={{ fontSize: "clamp(28px,5vw,48px)" }}
                >
                  Bugun boshlang!
                </h2>
                <p className="text-indigo-200 text-base sm:text-lg mb-8 max-w-md mx-auto leading-relaxed">
                  O'zbekiston haydovchilik imtihoniga tayyorlaning va yuksak natija oling.
                </p>
                <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                  <Link 
                    href="/test"
                    className="w-full sm:w-auto flex items-center justify-center gap-2.5 bg-white hover:-translate-y-0.5 text-indigo-700 font-bold text-sm sm:text-base px-7 py-3.5 rounded-2xl transition-all shadow-lg no-underline"
                  >
                    <svg width="14" height="14" fill="#4f46e5" viewBox="0 0 24 24">
                      <polygon points="5 3 19 12 5 21 5 3" />
                    </svg>
                    Testni boshlash
                  </Link>
                  {!user && (
                    <Link 
                      href="/auth"
                      className="w-full sm:w-auto flex items-center justify-center gap-2 bg-white/10 hover:bg-white/20 hover:-translate-y-0.5 border border-white/25 text-white font-semibold text-sm sm:text-base px-7 py-3.5 rounded-2xl transition-all no-underline"
                    >
                      Ro'yxatdan o'tish
                    </Link>
                  )}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ══ FOOTER ══ */}
        <footer className="border-t border-slate-200 bg-white px-5 py-7 sm:py-8 mt-8">
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
                { href: "/pricing", l: "Obuna" },
                { href: "/profile", l: "Profil" },
              ].map((x) => (
                <Link 
                  key={x.href}
                  href={x.href}
                  className="text-xs text-slate-400 hover:text-indigo-600 transition-colors no-underline"
                >
                  {x.l}
                </Link>
              ))}
            </div>
          </div>
        </footer>
      </div>
    </>
  );
}
