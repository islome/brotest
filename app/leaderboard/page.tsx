"use client";
import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase-browser";
import Link from "next/link";

interface LeaderEntry {
  id: string;
  firstname: string;
  lastname: string;
  username: string;
  avatar_icon?: string;
  tests_count: number;
  total_correct: number;
  passed_count: number;
  weekly_xp: number;
}

const MEDALS = ["🥇", "🥈", "🥉"];
const TABS = [
  { key: "weekly_xp", label: "Bu hafta", icon: "⚡" },
  { key: "total_correct", label: "Eng ko'p to'g'ri", icon: "🎯" },
  { key: "tests_count", label: "Eng ko'p test", icon: "📝" },
  { key: "passed_count", label: "O'tganlar", icon: "✅" },
];

function initials(e: LeaderEntry) {
  return (e.firstname.charAt(0) + e.lastname.charAt(0)).toUpperCase();
}

function anim(delay = 0) {
  return {
    opacity: 0,
    animation: `fadeUp .5s cubic-bezier(.22,1,.36,1) ${delay}ms both`,
  } as React.CSSProperties;
}

export default function LeaderboardPage() {
  const supabase = useMemo(() => createClient(), []);
  const [entries, setEntries] = useState<LeaderEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<keyof LeaderEntry>("weekly_xp");
  const [currentUserId, setCurrentUserId] = useState<string>();
  const [weekRange, setWeekRange] = useState("");
  const [search, setSearch] = useState("");

  useEffect(() => {
    const now = new Date();
    const day = now.getDay() || 7;
    const mon = new Date(now);
    mon.setDate(now.getDate() - (day - 1));
    const sun = new Date(mon);
    sun.setDate(mon.getDate() + 6);
    const fmt = (d: Date) =>
      d.toLocaleDateString("uz-UZ", { day: "2-digit", month: "short" });
    setWeekRange(`${fmt(mon)} ~ ${fmt(sun)}`);

    supabase.auth.getUser().then(({ data }) => {
      setCurrentUserId(data.user?.id);
    });

    supabase
      .from("weekly_leaderboard")
      .select("*")
      .then(({ data }) => {
        setEntries((data ?? []) as LeaderEntry[]);
        setLoading(false);
      });
  }, [supabase]);

  const allSorted = useMemo(
    () => [...entries].sort((a, b) => (b[tab] as number) - (a[tab] as number)),
    [entries, tab],
  );

  const sorted = useMemo(() => {
    if (!search) return allSorted;
    const q = search.toLowerCase();
    return allSorted.filter(
      (e) =>
        `${e.firstname} ${e.lastname}`.toLowerCase().includes(q) ||
        e.username?.toLowerCase().includes(q),
    );
  }, [allSorted, search]);

  const myRank = allSorted.findIndex((e) => e.id === currentUserId) + 1;
  const me = allSorted.find((e) => e.id === currentUserId);
  const maxVal = (allSorted[0]?.[tab] as number) ?? 1;

  return (
    <>
      <style>{`
        @keyframes fadeUp {
          from { opacity:0; transform:translateY(14px); }
          to   { opacity:1; transform:translateY(0); }
        }
        @keyframes spin { to { transform: rotate(360deg); } }
        .lb-row { transition: background .15s; }
        .lb-row:hover { background: #f8fafc !important; }
        .tab-btn { transition: all .2s; }
      `}</style>

      <div
        style={{
          minHeight: "100vh",
          background: "#f8fafc",
          fontFamily: "'Syne', sans-serif",
        }}
      >
        {/* Hero header */}
        <div
          style={{
            background:
              "linear-gradient(135deg, #1e1b4b 0%, #312e81 50%, #4338ca 100%)",
            padding: "40px 24px 80px",
            position: "relative",
            overflow: "hidden",
          }}
        >
          {/* Decorative circles */}
          <div
            style={{
              position: "absolute",
              top: -60,
              right: -60,
              width: 240,
              height: 240,
              borderRadius: "50%",
              background: "rgba(255,255,255,.04)",
              pointerEvents: "none",
            }}
          />
          <div
            style={{
              position: "absolute",
              bottom: -40,
              left: -40,
              width: 180,
              height: 180,
              borderRadius: "50%",
              background: "rgba(255,255,255,.03)",
              pointerEvents: "none",
            }}
          />

          <div
            style={{
              maxWidth: 720,
              margin: "0 auto",
              position: "relative",
              zIndex: 2,
            }}
          >
            {/* Back */}
            <Link
              href="/profile"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                color: "rgba(255,255,255,.6)",
                fontSize: 13,
                fontWeight: 600,
                textDecoration: "none",
                marginBottom: 24,
                ...anim(0),
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
                <path d="M19 12H5M12 5l-7 7 7 7" />
              </svg>
              Orqaga
            </Link>

            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 14,
                marginBottom: 8,
                ...anim(60),
              }}
            >
              <div
                style={{
                  width: 48,
                  height: 48,
                  background: "linear-gradient(135deg,#fbbf24,#f59e0b)",
                  borderRadius: 14,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  boxShadow: "0 8px 24px rgba(245,158,11,.4)",
                  fontSize: 22,
                }}
              >
                🏆
              </div>
              <div>
                <h1
                  style={{
                    fontSize: 26,
                    fontWeight: 800,
                    color: "white",
                    margin: 0,
                    letterSpacing: "-0.02em",
                  }}
                >
                  Reyting jadvali
                </h1>
                <p
                  style={{
                    fontSize: 13,
                    color: "rgba(255,255,255,.5)",
                    margin: 0,
                  }}
                >
                  {weekRange} · {entries.length} ishtirokchi
                </p>
              </div>
            </div>

            {/* My rank card */}
            {me && (
              <div
                style={{
                  marginTop: 20,
                  background: "rgba(255,255,255,.08)",
                  border: "1px solid rgba(255,255,255,.12)",
                  borderRadius: 16,
                  padding: "14px 18px",
                  display: "flex",
                  alignItems: "center",
                  gap: 14,
                  backdropFilter: "blur(8px)",
                  ...anim(120),
                }}
              >
                <div
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: "50%",
                    background: "linear-gradient(135deg,#6366f1,#7c3aed)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 14,
                    fontWeight: 800,
                    color: "white",
                    border: "2px solid rgba(255,255,255,.3)",
                  }}
                >
                  {initials(me)}
                </div>
                <div style={{ flex: 1 }}>
                  <p
                    style={{
                      margin: 0,
                      fontSize: 13,
                      fontWeight: 700,
                      color: "white",
                    }}
                  >
                    {me.firstname} {me.lastname}
                  </p>
                  <p
                    style={{
                      margin: 0,
                      fontSize: 11,
                      color: "rgba(255,255,255,.5)",
                    }}
                  >
                    Sizning o'rningiz
                  </p>
                </div>
                <div style={{ display: "flex", gap: 16 }}>
                  {[
                    { label: "O'rin", value: `#${myRank}` },
                    { label: "XP", value: `${me.weekly_xp}` },
                    { label: "Testlar", value: `${me.tests_count}` },
                  ].map(({ label, value }) => (
                    <div key={label} style={{ textAlign: "center" }}>
                      <p
                        style={{
                          margin: 0,
                          fontSize: 16,
                          fontWeight: 800,
                          color: "white",
                        }}
                      >
                        {value}
                      </p>
                      <p
                        style={{
                          margin: 0,
                          fontSize: 10,
                          color: "rgba(255,255,255,.45)",
                          fontWeight: 600,
                        }}
                      >
                        {label}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Main content — pulls up over hero */}
        <div
          style={{
            maxWidth: 720,
            margin: "-44px auto 0",
            padding: "0 16px 48px",
            position: "relative",
            zIndex: 10,
          }}
        >
          {/* Card */}
          <div
            style={{
              background: "white",
              borderRadius: 20,
              border: "1px solid #e2e8f0",
              boxShadow: "0 4px 24px rgba(0,0,0,.07)",
              overflow: "hidden",
              ...anim(180),
            }}
          >
            {/* Tabs */}
            <div
              style={{
                display: "flex",
                gap: 4,
                padding: "14px 14px 0",
                borderBottom: "1px solid #f1f5f9",
                overflowX: "auto",
              }}
            >
              {TABS.map((t) => (
                <button
                  key={t.key}
                  className="tab-btn"
                  onClick={() => setTab(t.key as keyof LeaderEntry)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 5,
                    padding: "8px 14px 10px",
                    border: "none",
                    background: "none",
                    cursor: "pointer",
                    fontSize: 13,
                    fontWeight: 700,
                    color: tab === t.key ? "#4f46e5" : "#94a3b8",
                    borderBottom: `2px solid ${tab === t.key ? "#4f46e5" : "transparent"}`,
                    marginBottom: -1,
                    whiteSpace: "nowrap",
                    fontFamily: "'Syne',sans-serif",
                  }}
                >
                  <span style={{ fontSize: 14 }}>{t.icon}</span>
                  {t.label}
                </button>
              ))}
            </div>

            {/* Search */}
            <div
              style={{
                padding: "12px 16px",
                borderBottom: "1px solid #f1f5f9",
              }}
            >
              <div style={{ position: "relative" }}>
                <span
                  style={{
                    position: "absolute",
                    left: 12,
                    top: "50%",
                    transform: "translateY(-50%)",
                    color: "#94a3b8",
                    display: "flex",
                  }}
                >
                  <svg
                    width="15"
                    height="15"
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
                  placeholder="Foydalanuvchi qidirish..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  style={{
                    width: "100%",
                    boxSizing: "border-box",
                    height: 38,
                    background: "#f8fafc",
                    border: "1.5px solid #e2e8f0",
                    borderRadius: 10,
                    padding: "0 12px 0 36px",
                    fontSize: 13,
                    color: "#0f172a",
                    outline: "none",
                    fontFamily: "inherit",
                  }}
                  onFocus={(e) =>
                    (e.currentTarget.style.borderColor = "#6366f1")
                  }
                  onBlur={(e) =>
                    (e.currentTarget.style.borderColor = "#e2e8f0")
                  }
                />
              </div>
            </div>

            {loading ? (
              <div
                style={{
                  padding: "20px 16px 16px",
                  display: "flex",
                  flexDirection: "column",
                  gap: 16,
                }}
              >
                <style>{`
    @keyframes shimmer {
      0%   { background-position: 200% 0; }
      100% { background-position: -200% 0; }
    }
    .sk {
      background: linear-gradient(90deg, #f1f5f9 25%, #e2e8f0 50%, #f1f5f9 75%);
      background-size: 200% 100%;
      animation: shimmer 1.5s infinite;
      border-radius: 6px;
    }
  `}</style>

                <div
                  className="sk"
                  style={{ height: 9, width: 100, marginTop: 4 }}
                />

                {/* 4–6 qatorlar */}
                {[0, 1, 2].map((i) => (
                  <div
                    key={i}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 12,
                      padding: "10px 0",
                      opacity: 1 - i * 0.2,
                    }}
                  >
                    {/* Rank raqam */}
                    <div
                      className="sk"
                      style={{ width: 18, height: 14, flexShrink: 0 }}
                    />

                    {/* Avatar */}
                    <div
                      className="sk"
                      style={{
                        width: 34,
                        height: 34,
                        borderRadius: "50%",
                        flexShrink: 0,
                      }}
                    />

                    {/* Ism + XP bar */}
                    <div
                      style={{
                        flex: 1,
                        display: "flex",
                        flexDirection: "column",
                        gap: 7,
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                        }}
                      >
                        <div
                          className="sk"
                          style={{ height: 11, width: "45%" }}
                        />
                        <div className="sk" style={{ height: 11, width: 40 }} />
                      </div>
                      <div
                        className="sk"
                        style={{ height: 4, width: "100%", borderRadius: 999 }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            ) : sorted.length === 0 ? (
              <div style={{ padding: "48px 24px", textAlign: "center" }}>
                <span style={{ fontSize: 36 }}>🔍</span>
                <p
                  style={{
                    fontSize: 15,
                    fontWeight: 700,
                    color: "#475569",
                    marginTop: 12,
                  }}
                >
                  Hech narsa topilmadi
                </p>
              </div>
            ) : (
              <div>
                {sorted.map((entry, idx) => {
                  const rank =
                    allSorted.findIndex((e) => e.id === entry.id) + 1;
                  const isMe = entry.id === currentUserId;
                  const isTop3 = rank <= 3;
                  const val = entry[tab] as number;
                  const pct = Math.round((val / maxVal) * 100);

                  return (
                    <div
                      key={entry.id}
                      className="lb-row"
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 12,
                        padding: "12px 20px",
                        background: isMe ? "#f5f3ff" : "white",
                        borderLeft: isMe
                          ? "3px solid #6366f1"
                          : "3px solid transparent",
                        borderBottom: "1px solid #f8fafc",
                      }}
                    >
                      {/* Rank */}
                      <div
                        style={{
                          width: 28,
                          textAlign: "center",
                          flexShrink: 0,
                        }}
                      >
                        {isTop3 ? (
                          <span style={{ fontSize: 18 }}>
                            {MEDALS[rank - 1]}
                          </span>
                        ) : (
                          <span
                            style={{
                              fontSize: 13,
                              fontWeight: 700,
                              color: "#cbd5e1",
                            }}
                          >
                            {rank}
                          </span>
                        )}
                      </div>

                      {/* Avatar */}
                      <div
                        style={{
                          width: 38,
                          height: 38,
                          borderRadius: "50%",
                          background: isMe
                            ? "linear-gradient(135deg,#6366f1,#7c3aed)"
                            : isTop3
                              ? "linear-gradient(135deg,#fbbf24,#f59e0b)"
                              : "linear-gradient(135deg,#e2e8f0,#cbd5e1)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: 13,
                          fontWeight: 800,
                          color: isMe || isTop3 ? "white" : "#64748b",
                          flexShrink: 0,
                          border: isMe
                            ? "2px solid #6366f1"
                            : isTop3
                              ? "2px solid #fbbf24"
                              : "none",
                        }}
                      >
                        {initials(entry)}
                      </div>

                      {/* Info */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            marginBottom: 5,
                          }}
                        >
                          <div>
                            <span
                              style={{
                                fontSize: 13,
                                fontWeight: 700,
                                color: isMe ? "#4f46e5" : "#0f172a",
                              }}
                            >
                              {entry.firstname} {entry.lastname}
                            </span>
                            {entry.username && (
                              <span
                                style={{
                                  fontSize: 11,
                                  color: "#94a3b8",
                                  marginLeft: 6,
                                }}
                              >
                                @{entry.username}
                              </span>
                            )}
                          </div>
                          <span
                            style={{
                              fontSize: 13,
                              fontWeight: 800,
                              color: isMe ? "#4f46e5" : "#1e293b",
                              flexShrink: 0,
                              marginLeft: 8,
                            }}
                          >
                            {val.toLocaleString()}
                            <span
                              style={{
                                fontSize: 10,
                                fontWeight: 600,
                                color: "#94a3b8",
                                marginLeft: 3,
                              }}
                            >
                              {tab === "weekly_xp"
                                ? "XP"
                                : tab === "tests_count"
                                  ? "test"
                                  : tab === "passed_count"
                                    ? "o'tdi"
                                    : "to'g'ri"}
                            </span>
                          </span>
                        </div>

                        {/* Stats row */}
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 10,
                          }}
                        >
                          {/* Progress bar */}
                          <div
                            style={{
                              flex: 1,
                              height: 4,
                              background: "#f1f5f9",
                              borderRadius: 999,
                              overflow: "hidden",
                            }}
                          >
                            <div
                              style={{
                                height: "100%",
                                borderRadius: 999,
                                background: isMe
                                  ? "linear-gradient(90deg,#6366f1,#8b5cf6)"
                                  : isTop3
                                    ? "linear-gradient(90deg,#fbbf24,#f59e0b)"
                                    : "#e2e8f0",
                                width: `${pct}%`,
                                transition:
                                  "width 1s cubic-bezier(.22,1,.36,1)",
                              }}
                            />
                          </div>
                          {/* Mini stats */}
                          <div
                            style={{ display: "flex", gap: 8, flexShrink: 0 }}
                          >
                            <span
                              style={{
                                fontSize: 11,
                                color: "#94a3b8",
                                fontWeight: 600,
                              }}
                            >
                              📝 {entry.tests_count}
                            </span>
                            <span
                              style={{
                                fontSize: 11,
                                color: "#94a3b8",
                                fontWeight: 600,
                              }}
                            >
                              ✅ {entry.passed_count}
                            </span>
                            <span
                              style={{
                                fontSize: 11,
                                color: "#94a3b8",
                                fontWeight: 600,
                              }}
                            >
                              🎯 {entry.total_correct}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Footer */}
            <div
              style={{
                padding: "14px 20px",
                borderTop: "1px solid #f1f5f9",
                background: "#fafbff",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <p style={{ fontSize: 11, color: "#94a3b8", margin: 0 }}>
                Har dushanba yangilanadi · {entries.length} ishtirokchi
              </p>
              <Link
                href="/test"
                style={{
                  fontSize: 12,
                  fontWeight: 700,
                  color: "#4f46e5",
                  textDecoration: "none",
                }}
              >
                Test topshirish →
              </Link>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
