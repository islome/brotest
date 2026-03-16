"use client";
import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase-browser";

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

function Fireworks({ active }: { active: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    if (!active) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;

    type Particle = {
      x: number;
      y: number;
      vx: number;
      vy: number;
      alpha: number;
      color: string;
      size: number;
    };

    const COLORS = [
      "#6366f1",
      "#8b5cf6",
      "#f59e0b",
      "#10b981",
      "#ef4444",
      "#3b82f6",
      "#ec4899",
    ];
    const particles: Particle[] = [];

    function burst(x: number, y: number) {
      for (let i = 0; i < 36; i++) {
        const angle = (i / 36) * Math.PI * 2;
        const speed = 2 + Math.random() * 4;
        particles.push({
          x,
          y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed - 1,
          alpha: 1,
          color: COLORS[Math.floor(Math.random() * COLORS.length)],
          size: 3 + Math.random() * 3,
        });
      }
    }

    const w = canvas.width;
    const h = canvas.height;

    setTimeout(() => burst(w * 0.25, h * 0.3), 0);
    setTimeout(() => burst(w * 0.75, h * 0.2), 300);
    setTimeout(() => burst(w * 0.5, h * 0.35), 600);

    // canvas va ctx ni local variable ga bind qilamiz
    // TypeScript closure da null deb hisoblaydi, shuning uchun
    // non-null guaranteed local var ishlatamiz
    const safeCtx = ctx;
    const safeCanvas = canvas;

    function loop() {
      safeCtx.clearRect(0, 0, safeCanvas.width, safeCanvas.height);
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.08;
        p.alpha -= 0.018;
        if (p.alpha <= 0) {
          particles.splice(i, 1);
          continue;
        }
        safeCtx.globalAlpha = p.alpha;
        safeCtx.fillStyle = p.color;
        safeCtx.beginPath();
        safeCtx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        safeCtx.fill();
      }
      safeCtx.globalAlpha = 1;
      if (particles.length > 0) {
        rafRef.current = requestAnimationFrame(loop);
      }
    }

    rafRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafRef.current);
  }, [active]);

  if (!active) return null;
  return (
    <canvas
      ref={canvasRef}
      style={{
        position: "absolute",
        inset: 0,
        width: "100%",
        height: "100%",
        pointerEvents: "none",
        zIndex: 10,
      }}
    />
  );
}

// Medal colors for top 3
const MEDALS = [
  {
    bg: "linear-gradient(135deg,#fbbf24,#f59e0b)",
    shadow: "rgba(245,158,11,.4)",
    label: "🥇",
    rank: "text-amber-600",
  },
  {
    bg: "linear-gradient(135deg,#94a3b8,#64748b)",
    shadow: "rgba(100,116,139,.35)",
    label: "🥈",
    rank: "text-slate-500",
  },
  {
    bg: "linear-gradient(135deg,#c084fc,#a855f7)",
    shadow: "rgba(168,85,247,.35)",
    label: "🥉",
    rank: "text-violet-500",
  },
];

export default function WeeklyLeaderboard({
  currentUserId,
}: {
  currentUserId?: string;
}) {
  const supabase = createClient();

  const [entries, setEntries] = useState<LeaderEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [fireworks, setFireworks] = useState(false);
  const [weekRange, setWeekRange] = useState("");

  useEffect(() => {
    // Hafta oralig'ini hisoblash
    const now = new Date();
    const day = now.getDay() || 7; // 1=Mon … 7=Sun
    const mon = new Date(now);
    mon.setDate(now.getDate() - (day - 1));
    const sun = new Date(mon);
    sun.setDate(mon.getDate() + 6);
    const fmt = (d: Date) =>
      d.toLocaleDateString("uz-UZ", { day: "2-digit", month: "short" });
    setWeekRange(`${fmt(mon)} – ${fmt(sun)}`);

    supabase
      .from("weekly_leaderboard")
      .select("*")
      .then(({ data }) => {
        setEntries((data ?? []) as LeaderEntry[]);
        setLoading(false);
        if ((data ?? []).length > 0) {
          setTimeout(() => setFireworks(true), 400);
          setTimeout(() => setFireworks(false), 4000);
        }
      });
  }, []);

  function initials(e: LeaderEntry) {
    return (e.firstname.charAt(0) + e.lastname.charAt(0)).toUpperCase();
  }

  const myRank = entries.findIndex((e) => e.id === currentUserId) + 1;

  return (
    <>
      <style>{`
        @keyframes podiumIn {
          from { opacity:0; transform:translateY(16px) scale(.97); }
          to   { opacity:1; transform:translateY(0)    scale(1);   }
        }
        @keyframes rowSlide {
          from { opacity:0; transform:translateX(-10px); }
          to   { opacity:1; transform:translateX(0);     }
        }
        .podium-card { animation: podiumIn .5s cubic-bezier(.22,1,.36,1) both; }
        .lb-row      { animation: rowSlide .4s cubic-bezier(.22,1,.36,1) both; }
        .xp-bar-fill { transition: width 1.2s cubic-bezier(.22,1,.36,1); }
      `}</style>

      <div
        style={{
          background: "white",
          borderRadius: 20,
          border: "1px solid #e2e8f0",
          boxShadow: "0 2px 8px rgba(0,0,0,.04)",
          overflow: "hidden",
          position: "relative",
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
            position: "relative",
            zIndex: 5,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div
              style={{
                width: 32,
                height: 32,
                background: "linear-gradient(135deg,#fbbf24,#f59e0b)",
                borderRadius: 10,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: "0 3px 8px rgba(245,158,11,.3)",
              }}
            >
              <span style={{ fontSize: 15 }}>🏆</span>
            </div>
            <div>
              <h2
                style={{
                  fontFamily: "'Syne',sans-serif",
                  fontWeight: 800,
                  fontSize: 16,
                  color: "#0f172a",
                  margin: 0,
                  letterSpacing: "-0.01em",
                }}
              >
                Top students this week
              </h2>
              <p style={{ fontSize: 11, color: "#94a3b8", margin: 0 }}>
                {weekRange}
              </p>
            </div>
          </div>
          {myRank > 0 && (
            <span
              style={{
                fontSize: 12,
                fontWeight: 700,
                color: "#4f46e5",
                background: "#eef2ff",
                border: "1px solid #c7d2fe",
                padding: "3px 10px",
                borderRadius: 999,
              }}
            >
              Siz #{myRank}
            </span>
          )}
        </div>

        {loading ? (
          <div
            style={{
              padding: "40px",
              display: "flex",
              justifyContent: "center",
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
        ) : entries.length === 0 ? (
          <div style={{ padding: "40px 24px", textAlign: "center" }}>
            <span style={{ fontSize: 32, display: "block", marginBottom: 10 }}>
              📭
            </span>
            <p
              style={{
                fontSize: 14,
                fontWeight: 600,
                color: "#475569",
                marginBottom: 4,
              }}
            >
              Bu hafta hali test topshirilmagan
            </p>
            <p style={{ fontSize: 12, color: "#94a3b8" }}>Birinchi bo'ling!</p>
            <a
              href="/test"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                marginTop: 14,
                fontSize: 13,
                fontWeight: 600,
                color: "white",
                background: "#4f46e5",
                padding: "8px 18px",
                borderRadius: 10,
                textDecoration: "none",
                boxShadow: "0 4px 12px rgba(79,70,229,.3)",
              }}
            >
              Testni boshlash →
            </a>
          </div>
        ) : (
          <>
            {/* Fireworks canvas */}
            <div style={{ position: "relative", overflow: "hidden" }}>
              <Fireworks active={fireworks} />

              {/* Top 3 podium */}
              {entries.length >= 1 && (
                <div
                  style={{
                    padding: "20px 16px 16px",
                    background: "linear-gradient(180deg,#fafbff 0%,white 100%)",
                    display: "grid",
                    gridTemplateColumns: "repeat(3,1fr)",
                    gap: 10,
                    alignItems: "flex-end",
                    position: "relative",
                    zIndex: 5,
                  }}
                >
                  {/* Reorder: 2nd | 1st | 3rd */}
                  {[entries[1], entries[0], entries[2]].map((entry, podIdx) => {
                    if (!entry) return <div key={podIdx} />;
                    const realIdx = podIdx === 0 ? 1 : podIdx === 1 ? 0 : 2;
                    const medal = MEDALS[realIdx];
                    const isFirst = realIdx === 0;
                    const isMe = entry.id === currentUserId;
                    const heights = ["88px", "108px", "72px"]; // 2nd, 1st, 3rd
                    return (
                      <div
                        key={entry.id}
                        className="podium-card"
                        style={{
                          animationDelay: `${podIdx * 80}ms`,
                          display: "flex",
                          flexDirection: "column",
                          alignItems: "center",
                          gap: 6,
                        }}
                      >
                        {/* Avatar */}
                        <div style={{ position: "relative" }}>
                          <div
                            style={{
                              width: isFirst ? 52 : 44,
                              height: isFirst ? 52 : 44,
                              borderRadius: "50%",
                              background: `linear-gradient(135deg,${isMe ? "#6366f1,#7c3aed" : "#94a3b8,#64748b"})`,
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              border: isMe
                                ? "2.5px solid #6366f1"
                                : "2px solid #e2e8f0",
                              boxShadow: isMe
                                ? "0 0 0 3px rgba(99,102,241,.2)"
                                : "none",
                              fontSize: isFirst ? 18 : 15,
                              fontWeight: 700,
                              color: "white",
                              fontFamily: "'Syne',sans-serif",
                            }}
                          >
                            {initials(entry)}
                            {entry.avatar_icon}
                          </div>
                          <span
                            style={{
                              position: "absolute",
                              bottom: -4,
                              right: -4,
                              fontSize: isFirst ? 16 : 13,
                            }}
                          >
                            {medal.label}
                          </span>
                        </div>

                        {/* Name */}
                        <div style={{ textAlign: "center" }}>
                          <p
                            style={{
                              fontSize: 12,
                              fontWeight: 700,
                              color: isMe ? "#4f46e5" : "#0f172a",
                              margin: 0,
                              lineHeight: 1.2,
                            }}
                          >
                            {entry.firstname}
                          </p>
                          <p
                            style={{
                              fontSize: 11,
                              fontWeight: 700,
                              color: "#4f46e5",
                              margin: "2px 0 0",
                            }}
                          >
                            {entry.weekly_xp} XP
                          </p>
                        </div>

                        {/* Podium block */}
                        <div
                          style={{
                            width: "100%",
                            height: heights[podIdx],
                            background: medal.bg,
                            borderRadius: "10px 10px 0 0",
                            boxShadow: `0 -4px 16px ${medal.shadow}`,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            flexDirection: "column",
                            gap: 2,
                          }}
                        >
                          <span
                            style={{
                              fontSize: isFirst ? 22 : 18,
                              fontFamily: "'Syne',sans-serif",
                              fontWeight: 800,
                              color: "white",
                            }}
                          >
                            #{realIdx + 1}
                          </span>
                          <span
                            style={{
                              fontSize: 10,
                              color: "rgba(255,255,255,.8)",
                              fontWeight: 600,
                            }}
                          >
                            {entry.tests_count} test
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* 4th+ list */}
            {entries.length > 3 && (
              <div style={{ padding: "0 0 8px" }}>
                <div
                  style={{
                    padding: "10px 20px 6px",
                    borderTop: "1px solid #f1f5f9",
                  }}
                >
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
                    Qolgan o'rinlar
                  </p>
                </div>

                {entries.slice(3).map((entry, idx) => {
                  const rank = idx + 4;
                  const isMe = entry.id === currentUserId;
                  const maxXP = entries[0]?.weekly_xp ?? 1;

                  return (
                    <div
                      key={entry.id}
                      className="lb-row"
                      style={{
                        animationDelay: `${idx * 50 + 200}ms`,
                        display: "flex",
                        alignItems: "center",
                        gap: 12,
                        padding: "10px 20px",
                        borderRadius: 0,
                        transition: "background .15s",
                        background: isMe ? "#f5f3ff" : "transparent",
                        borderLeft: isMe
                          ? "3px solid #6366f1"
                          : "3px solid transparent",
                      }}
                      onMouseEnter={(e) => {
                        if (!isMe)
                          (e.currentTarget as HTMLElement).style.background =
                            "#f8f9fc";
                      }}
                      onMouseLeave={(e) => {
                        if (!isMe)
                          (e.currentTarget as HTMLElement).style.background =
                            "transparent";
                      }}
                    >
                      {/* Rank */}
                      <span
                        style={{
                          width: 24,
                          fontSize: 13,
                          fontWeight: 700,
                          color: "#94a3b8",
                          textAlign: "center",
                          flexShrink: 0,
                        }}
                      >
                        {rank}
                      </span>

                      {/* Avatar */}
                      <div
                        style={{
                          width: 34,
                          height: 34,
                          borderRadius: "50%",
                          background: isMe
                            ? "linear-gradient(135deg,#6366f1,#7c3aed)"
                            : "linear-gradient(135deg,#e2e8f0,#cbd5e1)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: 12,
                          fontWeight: 700,
                          color: isMe ? "white" : "#64748b",
                          flexShrink: 0,
                          border: isMe ? "2px solid #6366f1" : "none",
                        }}
                      >
                        {initials(entry)}
                      </div>

                      {/* Name + bar */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            marginBottom: 4,
                          }}
                        >
                          <span
                            style={{
                              fontSize: 13,
                              fontWeight: isMe ? 700 : 600,
                              color: isMe ? "#4f46e5" : "#1e293b",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
                            }}
                          >
                            {entry.firstname} {entry.lastname}
                          </span>
                          <span
                            style={{
                              fontSize: 12,
                              fontWeight: 700,
                              color: "#4f46e5",
                              flexShrink: 0,
                              marginLeft: 8,
                            }}
                          >
                            {entry.weekly_xp} XP
                          </span>
                        </div>
                        {/* XP bar */}
                        <div
                          style={{
                            height: 4,
                            background: "#f1f5f9",
                            borderRadius: 999,
                            overflow: "hidden",
                          }}
                        >
                          <div
                            className="xp-bar-fill"
                            style={{
                              height: "100%",
                              borderRadius: 999,
                              background: isMe
                                ? "linear-gradient(90deg,#6366f1,#8b5cf6)"
                                : "#cbd5e1",
                              width: `${(entry.weekly_xp / maxXP) * 100}%`,
                            }}
                          />
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
                padding: "12px 20px",
                borderTop: "1px solid #f1f5f9",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                background: "#fafbff",
              }}
            >
              <p style={{ fontSize: 11, color: "#94a3b8", margin: 0 }}>
                Har dushanba yangilanadi · {entries.length} ishtirokchi
              </p>
              <a
                href="/test"
                style={{
                  fontSize: 12,
                  fontWeight: 600,
                  color: "#4f46e5",
                  textDecoration: "none",
                  display: "flex",
                  alignItems: "center",
                  gap: 4,
                }}
              >
                Test topshirish →
              </a>
            </div>
          </>
        )}
      </div>

      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </>
  );
}
