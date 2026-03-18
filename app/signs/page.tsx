"use client";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase-browser";

const BUCKET = "road-signs";

const CATEGORIES = [
  "Ogohlantiruvchi belgilar",
  "Ta'qiqlovchi belgilar",
  "Buyuruvchi belgilar",
  "Axborot-ishora belgilari",
  "Servis belgilari",
  "Qo'shimcha axborot belgilari",
] as const;

type Category = (typeof CATEGORIES)[number];

interface Sign {
  id: number;
  name: string;
  description: string | null;
  category: Category;
  image: string | null;
}

const CAT_META: Record<
  string,
  {
    desc: string;
    accent: string;
    bg: string;
    border: string;
    text: string;
    dot: string;
  }
> = {
  "Ogohlantiruvchi belgilar": {
    desc: "Xavf va ehtiyotkorlik talab qiladigan joylar",
    accent: "#f59e0b",
    bg: "#fff",
    border: "#fde68a",
    text: "#92400e",
    dot: "#f59e0b",
  },
  "Ta'qiqlovchi belgilar": {
    desc: "Harakatni cheklash va taqiqlash belgilari",
    accent: "#ef4444",
    bg: "#fff1f2",
    border: "#fecdd3",
    text: "#9f1239",
    dot: "#ef4444",
  },
  "Buyuruvchi belgilar": {
    desc: "Haydovchi bajarishi shart bo'lgan buyruqlar",
    accent: "#3b82f6",
    bg: "#eff6ff",
    border: "#bfdbfe",
    text: "#1e40af",
    dot: "#3b82f6",
  },
  "Axborot-ishora belgilari": {
    desc: "Yo'nalish va masofa haqida ma'lumot",
    accent: "#22c55e",
    bg: "#fff",
    border: "#bbf7d0",
    text: "#14532d",
    dot: "#22c55e",
  },
  "Servis belgilari": {
    desc: "Xizmat ko'rsatish ob'ektlari belgilari",
    accent: "#8b5cf6",
    bg: "#fff",
    border: "#ddd6fe",
    text: "#5b21b6",
    dot: "#8b5cf6",
  },
  "Qo'shimcha axborot belgilari": {
    desc: "Asosiy belgilarni to'ldiruvchi axborot",
    accent: "#64748b",
    bg: "#f8fafc",
    border: "#e2e8f0",
    text: "#334155",
    dot: "#64748b",
  },
};

export default function StreetSignsPage() {
  const supabase = createClient();

  const [signs, setSigns] = useState<Sign[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Category | "all">("all");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Sign | null>(null);
  const [vis, setVis] = useState(false);

  useEffect(() => {
    setTimeout(() => setVis(true), 60);
    supabase
      .from("road_signs")
      .select("*")
      .order("category")
      .order("name")
      .then(({ data }) => {
        setSigns(data ?? []);
        setLoading(false);
      });
  }, []);

  function imgUrl(img: string | null) {
    if (!img) return null;
    if (img.startsWith("http")) return img;
    return supabase.storage.from(BUCKET).getPublicUrl(img).data.publicUrl;
  }

  function anim(delay: number): React.CSSProperties {
    return {
      opacity: vis ? 1 : 0,
      transform: vis ? "translateY(0)" : "translateY(20px)",
      transition: `opacity .55s ease ${delay}ms, transform .55s cubic-bezier(.22,1,.36,1) ${delay}ms`,
    };
  }

  const filtered = signs.filter((s) => {
    const matchTab = activeTab === "all" || s.category === activeTab;
    const matchSearch =
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      (s.description ?? "").toLowerCase().includes(search.toLowerCase());
    return matchTab && matchSearch;
  });

  // Group by category for "all" view
  const grouped = CATEGORIES.reduce(
    (acc, cat) => {
      const items = filtered.filter((s) => s.category === cat);
      if (items.length) acc[cat] = items;
      return acc;
    },
    {} as Record<string, Sign[]>,
  );

  const counts = CATEGORIES.reduce(
    (acc, cat) => {
      acc[cat] = signs.filter((s) => s.category === cat).length;
      return acc;
    },
    {} as Record<string, number>,
  );

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Momo+Trust+Display&family=Science+Gothic:wght@100..900&display=swap');
        .fs{font-family:"Momo Trust Display", sans-serif;font-weight:400}
        .fb{font-family:'DM Sans',sans-serif}
        .lift{transition:transform .22s cubic-bezier(.34,1.56,.64,1),box-shadow .22s ease}
        .lift:hover{transform:translateY(-4px);box-shadow:0 16px 40px rgba(0,0,0,.1)!important}
        .sign-card{cursor:pointer}
        .sign-card:hover .sign-name{color:#4f46e5}
        @keyframes modalIn{from{opacity:0;transform:scale(.96) translateY(10px)}to{opacity:1;transform:scale(1) translateY(0)}}
        @keyframes spin{to{transform:rotate(360deg)}}
      `}</style>

      <div className="fb" style={{ minHeight: "100vh", background: "#f8f9fc" }}>
        {/* Navbar */}
        <nav
          style={{
            background: "rgba(255,255,255,.88)",
            backdropFilter: "blur(20px)",
            borderBottom: "1px solid #e2e8f0",
            position: "sticky",
            top: 0,
            zIndex: 20,
          }}
        >
          <div
            style={{
              maxWidth: 1100,
              margin: "0 auto",
              padding: "0 24px",
              height: 56,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <a
              href="/"
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                textDecoration: "none",
              }}
            >
              <div
                style={{
                  width: 30,
                  height: 30,
                  background: "#4f46e5",
                  borderRadius: 10,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <svg
                  width="13"
                  height="13"
                  fill="none"
                  stroke="white"
                  strokeWidth="2.2"
                  viewBox="0 0 24 24"
                >
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                </svg>
              </div>
              <span className="fs" style={{ fontSize: 16, color: "#0f172a" }}>
                Brotest
              </span>
            </a>
            <div style={{ display: "flex", gap: 4 }}>
              <a
                href="/test"
                style={{
                  fontSize: 13,
                  fontWeight: 500,
                  color: "#64748b",
                  padding: "6px 14px",
                  borderRadius: 10,
                  textDecoration: "none",
                  transition: "all .15s",
                }}
                onMouseEnter={(e) => {
                  const el = e.currentTarget as HTMLElement;
                  el.style.color = "#4f46e5";
                  el.style.background = "#eef2ff";
                }}
                onMouseLeave={(e) => {
                  const el = e.currentTarget as HTMLElement;
                  el.style.color = "#64748b";
                  el.style.background = "transparent";
                }}
              >
                Test
              </a>
              <a
                href="/profile"
                style={{
                  fontSize: 13,
                  fontWeight: 500,
                  color: "#64748b",
                  padding: "6px 14px",
                  borderRadius: 10,
                  textDecoration: "none",
                  transition: "all .15s",
                }}
                onMouseEnter={(e) => {
                  const el = e.currentTarget as HTMLElement;
                  el.style.color = "#4f46e5";
                  el.style.background = "#eef2ff";
                }}
                onMouseLeave={(e) => {
                  const el = e.currentTarget as HTMLElement;
                  el.style.color = "#64748b";
                  el.style.background = "transparent";
                }}
              >
                Profil
              </a>
            </div>
          </div>
        </nav>

        {/* Hero */}
        <section style={{ padding: "52px 24px 40px", ...anim(0) }}>
          <div style={{ maxWidth: 700, margin: "0 auto", textAlign: "center" }}>
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                background: "#eef2ff",
                border: "1px solid #c7d2fe",
                color: "#4338ca",
                fontSize: 12,
                fontWeight: 600,
                padding: "6px 14px",
                borderRadius: 999,
                marginBottom: 20,
              }}
            >
              <span
                style={{
                  width: 6,
                  height: 6,
                  background: "#4f46e5",
                  borderRadius: "50%",
                  display: "inline-block",
                }}
              />
              Yangi yo'l belgilari 2026 - {signs.length} ta belgi
            </div>
            <h1
              className="fs"
              style={{
                fontSize: "clamp(36px,6vw,58px)",
                color: "#0f172a",
                letterSpacing: "-0.03em",
                lineHeight: 1.05,
                margin: "0 0 14px",
              }}
            >
              Yo'l belgilari
            </h1>
            <p
              style={{
                fontSize: 16,
                color: "#64748b",
                lineHeight: 1.7,
                maxWidth: 500,
                margin: "0 auto 28px",
              }}
            >
              Barcha yo'l belgilarini kategoriyalar bo'yicha o'rganing va test
              oldidan takrorlang.
            </p>

            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "0 24px 28px",
                maxWidth: 1100,
                margin: "0 auto",
                ...anim(100),
              }}
            >
              <div style={{ position: "relative", flex: 1 }}>
                <span
                  style={{
                    position: "absolute",
                    left: 14,
                    top: "50%",
                    transform: "translateY(-50%)",
                    color: "#94a3b8",
                    display: "flex",
                  }}
                >
                  <svg
                    width="16"
                    height="16"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    viewBox="0 0 24 24"
                  >
                    <circle cx="11" cy="11" r="8" />
                    <line x1="21" y1="21" x2="16.65" y2="16.65" />
                  </svg>
                </span>
                <input
                  type="text"
                  placeholder="Belgi qidirish..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  style={{
                    width: "100%",
                    boxSizing: "border-box",
                    height: 42,
                    background: "white",
                    border: "2px solid #e2e8f0",
                    borderRadius: 12,
                    padding: "0 14px 0 42px",
                    fontSize: 13,
                    fontWeight: 500,
                    color: "#0f172a",
                    outline: "none",
                    transition: "border-color .2s",
                    fontFamily: "inherit",
                  }}
                  onFocus={(e) =>
                    (e.currentTarget.style.borderColor = "#6366f1")
                  }
                  onBlur={(e) =>
                    (e.currentTarget.style.borderColor = "#e2e8f0")
                  }
                />
                {search && (
                  <button
                    onClick={() => setSearch("")}
                    style={{
                      position: "absolute",
                      right: 10,
                      top: "50%",
                      transform: "translateY(-50%)",
                      background: "#f1f5f9",
                      border: "none",
                      borderRadius: 6,
                      width: 22,
                      height: 22,
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "#64748b",
                    }}
                  >
                    <svg
                      width="10"
                      height="10"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      viewBox="0 0 24 24"
                    >
                      <line x1="18" y1="6" x2="6" y2="18" />
                      <line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                  </button>
                )}
              </div>

              <div
                className="hidden sm:block"
                style={{ position: "relative", flexShrink: 0 }}
              >
                <select
                  value={activeTab}
                  onChange={(e) =>
                    setActiveTab(
                      e.target.value as Parameters<typeof setActiveTab>[0],
                    )
                  }
                  style={{
                    appearance: "none",
                    WebkitAppearance: "none",
                    height: 42,
                    padding: "0 38px 0 14px",
                    borderRadius: 12,
                    border: "2px solid #e2e8f0",
                    background: "white",
                    color: "#1e293b",
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: "pointer",
                    minWidth: 200,
                    outline: "none",
                    transition: "border-color .2s",
                    fontFamily: "inherit",
                  }}
                  onFocus={(e) =>
                    (e.currentTarget.style.borderColor = "#6366f1")
                  }
                  onBlur={(e) =>
                    (e.currentTarget.style.borderColor = "#e2e8f0")
                  }
                >
                  <option value="all">🗂 Barchasi ({signs.length})</option>
                  {CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat} ({counts[cat] ?? 0})
                    </option>
                  ))}
                </select>
                <svg
                  style={{
                    position: "absolute",
                    right: 12,
                    top: "50%",
                    transform: "translateY(-50%)",
                    pointerEvents: "none",
                  }}
                  width="14"
                  height="14"
                  viewBox="0 0 16 16"
                  fill="none"
                >
                  <path
                    d="M4 6l4 4 4-4"
                    stroke="#64748b"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>

              <div
                className="flex sm:hidden"
                style={{ position: "relative", flexShrink: 0 }}
              >
                <select
                  value={activeTab}
                  onChange={(e) =>
                    setActiveTab(
                      e.target.value as Parameters<typeof setActiveTab>[0],
                    )
                  }
                  style={{
                    position: "absolute",
                    inset: 0,
                    opacity: 0,
                    cursor: "pointer",
                    width: "100%",
                    height: "100%",
                    zIndex: 1,
                  }}
                >
                  <option value="all">🗂 Barchasi ({signs.length})</option>
                  {CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat} ({counts[cat] ?? 0})
                    </option>
                  ))}
                </select>
                <div
                  style={{
                    height: 42,
                    width: 42,
                    borderRadius: 12,
                    border: `2px solid ${activeTab !== "all" ? "#6366f1" : "#e2e8f0"}`,
                    background: activeTab !== "all" ? "#eef2ff" : "white",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 18,
                    pointerEvents: "none",
                  }}
                >
                  🗂
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Content */}
        <div
          style={{ maxWidth: 1100, margin: "0 auto", padding: "0 24px 60px" }}
        >
          {loading ? (
            <div
              style={{
                display: "flex",
                justifyContent: "center",
                padding: "80px 0",
              }}
            >
              <svg
                style={{
                  animation: "spin .7s linear infinite",
                  width: 28,
                  height: 28,
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
          ) : filtered.length === 0 ? (
            <div style={{ textAlign: "center", padding: "80px 0" }}>
              <p
                style={{
                  fontSize: 15,
                  fontWeight: 600,
                  color: "#64748b",
                  marginBottom: 6,
                }}
              >
                Hech narsa topilmadi
              </p>
              <p style={{ fontSize: 13, color: "#94a3b8" }}>
                Qidiruv so'zini o'zgartiring
              </p>
            </div>
          ) : activeTab !== "all" ? (
            // Single category grid
            <div>
              {(() => {
                const meta = CAT_META[activeTab];
                return (
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      marginBottom: 20,
                    }}
                  >
                    <div>
                      <h2
                        className="fs"
                        style={{
                          fontSize: 20,
                          color: "#0f172a",
                          margin: 0,
                          letterSpacing: "-0.015em",
                        }}
                      >
                        {activeTab}
                      </h2>
                      <p style={{ fontSize: 12, color: "#94a3b8", margin: 0 }}>
                        {meta.desc}
                      </p>
                    </div>
                  </div>
                );
              })()}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fill,minmax(160px,1fr))",
                  gap: 12,
                }}
              >
                {filtered.map((s) => (
                  <SignCard
                    key={s.id}
                    sign={s}
                    onClick={() => setSelected(s)}
                    imgUrl={imgUrl}
                  />
                ))}
              </div>
            </div>
          ) : (
            // All — grouped by category
            <div style={{ display: "flex", flexDirection: "column", gap: 40 }}>
              {(Object.entries(grouped) as [string, Sign[]][]).map(
                ([cat, items]) => {
                  const meta = CAT_META[cat];
                  return (
                    <div key={cat}>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          marginBottom: 16,
                          flexWrap: "wrap",
                          gap: 8,
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 10,
                          }}
                        >
                          <div>
                            <h2
                              className="fs"
                              style={{
                                fontSize: 18,
                                color: "#0f172a",
                                margin: 0,
                                letterSpacing: "-0.015em",
                              }}
                            >
                              {cat}
                            </h2>
                            <p
                              style={{
                                fontSize: 12,
                                color: "#94a3b8",
                                margin: 0,
                              }}
                            >
                              {meta.desc}
                            </p>
                          </div>
                        </div>
                        {/* <button
                          onClick={() => setActiveTab(cat as Category)}
                          style={{
                            fontSize: 12,
                            fontWeight: 600,
                            color: meta.accent,
                            background: meta.bg,
                            border: `1px solid ${meta.border}`,
                            padding: "5px 12px",
                            borderRadius: 8,
                            cursor: "pointer",
                            transition: "all .15s",
                          }}
                        >
                          Hammasini ko'rish ({items.length})
                        </button> */}
                      </div>
                      <div
                        style={{
                          display: "grid",
                          gridTemplateColumns:
                            "repeat(auto-fill,minmax(160px,1fr))",
                          gap: 12,
                        }}
                      >
                        {items.slice(0, 8).map((s) => (
                          <SignCard
                            key={s.id}
                            sign={s}
                            onClick={() => setSelected(s)}
                            imgUrl={imgUrl}
                          />
                        ))}
                        {items.length > 8 && (
                          <button
                            onClick={() => setActiveTab(cat as Category)}
                            style={{
                              background: meta.bg,
                              border: `2px dashed ${meta.border}`,
                              borderRadius: 16,
                              display: "flex",
                              flexDirection: "column",
                              alignItems: "center",
                              justifyContent: "center",
                              gap: 8,
                              padding: "24px",
                              cursor: "pointer",
                              transition: "all .2s",
                            }}
                            onMouseEnter={(e) =>
                              ((
                                e.currentTarget as HTMLElement
                              ).style.transform = "translateY(-3px)")
                            }
                            onMouseLeave={(e) =>
                              ((
                                e.currentTarget as HTMLElement
                              ).style.transform = "translateY(0)")
                            }
                          >
                            <span
                              className="fs"
                              style={{ fontSize: 22, color: meta.accent }}
                            >
                              +{items.length - 8}
                            </span>
                            <span
                              style={{
                                fontSize: 12,
                                color: meta.text,
                                fontWeight: 600,
                              }}
                            >
                              Yana ko'rish
                            </span>
                          </button>
                        )}
                      </div>
                    </div>
                  );
                },
              )}
            </div>
          )}
        </div>
      </div>

      {selected &&
        (() => {
          const meta = CAT_META[selected.category];
          const url = imgUrl(selected.image);
          return (
            <div
              onClick={(e) => {
                if (e.target === e.currentTarget) setSelected(null);
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
              <div
                style={{
                  background: "white",
                  borderRadius: 24,
                  width: "100%",
                  maxWidth: 480,
                  boxShadow: "0 24px 64px rgba(0,0,0,.2)",
                  animation: "modalIn .25s cubic-bezier(.22,1,.36,1)",
                  overflow: "hidden",
                }}
              >
                {/* Image area — katta, to'liq kenglikda */}
                <div
                  style={{
                    background: meta.bg,
                    width: "100%",
                    aspectRatio: "1 / 0.9",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    position: "relative",
                    padding: "10%",
                  }}
                >
                  {/* X — yuqori o'ngda, to'liq yumaloq */}
                  <button
                    onClick={() => setSelected(null)}
                    style={{
                      position: "absolute",
                      top: 12,
                      right: 12,
                      width: 32,
                      height: 32,
                      borderRadius: "50%",
                      border: "1px solid " + meta.border,
                      background: "white",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "#64748b",
                      boxShadow: "0 2px 6px rgba(0,0,0,.08)",
                      transition: "background .15s",
                    }}
                    onMouseEnter={(e) =>
                      ((e.currentTarget as HTMLElement).style.background =
                        "#f8fafc")
                    }
                    onMouseLeave={(e) =>
                      ((e.currentTarget as HTMLElement).style.background =
                        "white")
                    }
                  >
                    <svg
                      width="12"
                      height="12"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      viewBox="0 0 24 24"
                    >
                      <line x1="18" y1="6" x2="6" y2="18" />
                      <line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                  </button>

                  {url ? (
                    <img
                      src={url}
                      alt={selected.name}
                      style={{
                        width: "100%",
                        height: "100%",
                        objectFit: "contain",
                      }}
                    />
                  ) : (
                    <span></span>
                  )}
                </div>

                {/* Info */}
                <div style={{ padding: "18px 22px 22px" }}>
                  {/* <span
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 5,
                      fontSize: 11,
                      fontWeight: 700,
                      color: meta.text,
                      background: meta.bg,
                      border: "1px solid " + meta.border,
                      padding: "3px 10px",
                      borderRadius: 999,
                      marginBottom: 10,
                    }}
                  >
                    <span
                      style={{
                        width: 5,
                        height: 5,
                        borderRadius: "50%",
                        background: meta.accent,
                        display: "inline-block",
                      }}
                    />
                    {selected.category}
                  </span> */}

                  <h3
                    className="fs"
                    style={{
                      fontSize: 20,
                      color: "#0f172a",
                      margin: 0,
                      letterSpacing: "-0.02em",
                      lineHeight: 1.25,
                      textAlign: "center",
                    }}
                  >
                    {selected.name}
                  </h3>

                  {selected.description && (
                    <p
                      style={{
                        fontSize: 14,
                        color: "#475569",
                        lineHeight: 1.65,
                        margin: "10px 0 0",
                      }}
                    >
                      {selected.description}
                    </p>
                  )}
                </div>
              </div>
            </div>
          );
        })()}
    </>
  );
}

function SignCard({
  sign,
  onClick,
  imgUrl,
}: {
  sign: Sign;
  onClick: () => void;
  imgUrl: (img: string | null) => string | null;
}) {
  const meta = CAT_META[sign.category];
  const url = imgUrl(sign.image);

  return (
    <button
      onClick={onClick}
      className="sign-card"
      style={{
        background: "white",
        border: "1.5px solid #e8ecf0",
        borderRadius: 16,
        padding: 0,
        display: "flex",
        flexDirection: "column",
        cursor: "pointer",
        boxShadow: "0 1px 4px rgba(0,0,0,.05)",
        transition:
          "transform .2s cubic-bezier(.34,1.56,.64,1), box-shadow .2s, border-color .2s",
        width: "100%",
        overflow: "hidden",
        textAlign: "center",
      }}
      onMouseEnter={(e) => {
        const el = e.currentTarget as HTMLElement;
        el.style.transform = "translateY(-3px)";
        el.style.boxShadow = "0 10px 28px rgba(0,0,0,.1)";
        el.style.borderColor = "#c7d2fe";
        const name = el.querySelector(".sign-name") as HTMLElement;
        if (name) name.style.color = "#4f46e5";
      }}
      onMouseLeave={(e) => {
        const el = e.currentTarget as HTMLElement;
        el.style.transform = "translateY(0)";
        el.style.boxShadow = "0 1px 4px rgba(0,0,0,.05)";
        el.style.borderColor = "#e8ecf0";
        const name = el.querySelector(".sign-name") as HTMLElement;
        if (name) name.style.color = "#374151";
      }}
    >
      {/* Rasm — kartochkaning 75% balandligini egallaydi */}
      <div
        style={{
          width: "100%",
          aspectRatio: "1 / 0.85", // kenglik:balandlik = to'g'ri to'rtburchak
          background: meta.bg,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "12%",
          boxSizing: "border-box",
          flexShrink: 0,
        }}
      >
        {url ? (
          <img
            src={url}
            alt={sign.name}
            style={{
              width: "100%",
              height: "100%",
              objectFit: "contain",
              display: "block",
            }}
          />
        ) : (
          <span></span>
        )}
      </div>

      {/* Nom — pastki 25% */}
      <div
        style={{
          flex: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "8px 10px",
          borderTop: "1px solid #f1f5f9",
          background: "white",
          minHeight: 44,
        }}
      >
        <p
          className="sign-name"
          style={{
            fontSize: 11,
            fontWeight: 600,
            color: "#374151",
            lineHeight: 1.35,
            margin: 0,
            transition: "color .15s",
            display: "-webkit-box",
            WebkitLineClamp: 2,
            WebkitBoxOrient: "vertical",
            overflow: "hidden",
          }}
        >
          {sign.name}
        </p>
      </div>
    </button>
  );
}
