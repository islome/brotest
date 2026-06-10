"use client";
import { useState } from "react";
import { createClient } from "@/lib/supabase-browser";

interface Props {
  userId: string;
  userName: string;
  onClose: () => void;
  onSubmitted: () => void;
}

const EMOJIS = [
  { value: 1, emoji: "😡", label: "Juda yomon", color: "#ef4444", bg: "#fef2f2" },
  { value: 2, emoji: "😕", label: "Yomon", color: "#f97316", bg: "#fff7ed" },
  { value: 3, emoji: "😐", label: "O'rtacha", color: "#eab308", bg: "#fefce8" },
  { value: 4, emoji: "🙂", label: "Yaxshi", color: "#22c55e", bg: "#f0fdf4" },
  { value: 5, emoji: "🤩", label: "Ajoyib", color: "#6366f1", bg: "#eef2ff" },
];

export default function FeedbackModal({
  userId,
  userName,
  onClose,
  onSubmitted,
}: Props) {
  const supabase = createClient();

  const [rate, setRate] = useState<number | null>(null);
  const [hovered, setHovered] = useState<number | null>(null);
  const [comment, setComment] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  const active = hovered ?? rate;
  const activeMeta = EMOJIS.find((e) => e.value === active) ?? null;

  async function handleSubmit() {
    if (!rate) {
      setError("Iltimos, baho tanlang");
      return;
    }
    setLoading(true);
    setError("");

    const { error: dbErr } = await supabase.from("feedback").insert({
      user_id: userId,
      name: userName,
      feedback: comment.trim() || null,
      rate,
    });

    if (dbErr) {
      setError("Xatolik yuz berdi. Qaytadan urinib ko'ring.");
      setLoading(false);
      return;
    }

    setLoading(false);
    setDone(true);
    onSubmitted();
    setTimeout(onClose, 2000);
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{
        background: "rgba(15,23,42,.6)",
        backdropFilter: "blur(8px)",
        animation: "fbFade .25s ease",
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget && !loading) onClose();
      }}
    >
      <div
        className="bg-white w-full max-w-sm shadow-2xl overflow-hidden relative"
        style={{
          borderRadius: 24,
          animation: "fbIn .4s cubic-bezier(.22,1.2,.36,1)",
        }}
      >

        {done ? (
          /* ── SUCCESS STATE ── */
          <div
            style={{
              padding: "44px 28px",
              textAlign: "center",
              animation: "fbFade .3s ease",
            }}
          >
            <div
              style={{
                width: 72,
                height: 72,
                margin: "0 auto 18px",
                borderRadius: "50%",
                background: "linear-gradient(135deg,#22c55e,#16a34a)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: "0 10px 30px rgba(34,197,94,.4)",
                animation: "fbPop .5s cubic-bezier(.22,1.4,.36,1)",
              }}
            >
              <svg
                width="34"
                height="34"
                fill="none"
                stroke="white"
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
                viewBox="0 0 24 24"
                style={{
                  strokeDasharray: 30,
                  strokeDashoffset: 30,
                  animation: "fbCheck .5s .15s ease forwards",
                }}
              >
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>
            <h3
              style={{
                fontSize: 20,
                fontWeight: 800,
                color: "#0f172a",
                margin: "0 0 6px",
              }}
            >
              Rahmat! 🎉
            </h3>
            <p style={{ fontSize: 14, color: "#64748b", margin: 0, lineHeight: 1.5 }}>
              Fikringiz biz uchun juda muhim.
              <br />
              Siz bilan birga yaxshilanamiz!
            </p>
          </div>
        ) : (
          <>
            {/* Close button */}
            <button
              onClick={onClose}
              disabled={loading}
              className="absolute flex items-center justify-center text-slate-400 hover:text-slate-600 transition-colors cursor-pointer disabled:opacity-40"
              style={{
                top: 16,
                right: 16,
                width: 32,
                height: 32,
                borderRadius: 10,
                border: "1px solid #e2e8f0",
                background: "#f8fafc",
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

            <div style={{ padding: "28px 28px 26px" }}>
              {/* Header */}
              <div style={{ textAlign: "center", marginBottom: 22 }}>
                <span
                  style={{
                    fontSize: 34,
                    display: "block",
                    marginBottom: 8,
                    animation: "fbWave 2.2s ease-in-out infinite",
                  }}
                >
                  💬
                </span>
                <h3
                  style={{
                    fontSize: 19,
                    fontWeight: 800,
                    color: "#0f172a",
                    margin: "0 0 4px",
                    letterSpacing: "-0.01em",
                  }}
                >
                  Biz haqimizda nima fikrdasiz?
                </h3>
                <p style={{ fontSize: 13, color: "#94a3b8", margin: 0 }}>
                  Fikr-mulohazalaringizni qoldiring va yaxshilanishimizga yordam bering!
                </p>
              </div>

              {/* Emoji rating */}
              <div
                style={{
                  display: "flex",
                  justifyContent: "center",
                  gap: 6,
                  marginBottom: 8,
                }}
              >
                {EMOJIS.map((e) => {
                  const isActive = active === e.value;
                  const isSelected = rate === e.value;
                  return (
                    <button
                      key={e.value}
                      type="button"
                      onClick={() => {
                        setRate(e.value);
                        setError("");
                      }}
                      onMouseEnter={() => setHovered(e.value)}
                      onMouseLeave={() => setHovered(null)}
                      style={{
                        flex: 1,
                        aspectRatio: "1",
                        maxWidth: 56,
                        border: isSelected
                          ? `2px solid ${e.color}`
                          : "2px solid transparent",
                        borderRadius: 16,
                        background: isSelected ? e.bg : "#f8fafc",
                        cursor: "pointer",
                        fontSize: 26,
                        lineHeight: 1,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        transition:
                          "transform .2s cubic-bezier(.22,1.4,.36,1), background .2s, border-color .2s, opacity .2s",
                        transform: isActive
                          ? "scale(1.18) translateY(-3px)"
                          : active
                            ? "scale(.92)"
                            : "scale(1)",
                        opacity: active && !isActive ? 0.5 : 1,
                      }}
                    >
                      {e.emoji}
                    </button>
                  );
                })}
              </div>

              {/* Active label */}
              <div
                style={{
                  height: 22,
                  textAlign: "center",
                  marginBottom: 16,
                }}
              >
                {activeMeta && (
                  <span
                    key={activeMeta.value}
                    style={{
                      fontSize: 13,
                      fontWeight: 700,
                      color: activeMeta.color,
                      animation: "fbPop .25s ease",
                      display: "inline-block",
                    }}
                  >
                    {activeMeta.label}
                  </span>
                )}
              </div>

              {/* Comment */}
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Fikr yoki taklifingizni yozing... (ixtiyoriy)"
                rows={3}
                maxLength={500}
                style={{
                  width: "100%",
                  boxSizing: "border-box",
                  background: "#f8fafc",
                  border: "2px solid #e2e8f0",
                  borderRadius: 14,
                  padding: "12px 14px",
                  fontSize: 14,
                  color: "#0f172a",
                  outline: "none",
                  resize: "none",
                  fontFamily: "inherit",
                  lineHeight: 1.5,
                  transition: "border-color .2s",
                }}
                onFocus={(e) => (e.currentTarget.style.borderColor = "#6366f1")}
                onBlur={(e) => (e.currentTarget.style.borderColor = "#e2e8f0")}
              />

              {error && (
                <p
                  style={{
                    fontSize: 12,
                    color: "#dc2626",
                    margin: "10px 0 0",
                    textAlign: "center",
                    animation: "fbFade .2s ease",
                  }}
                >
                  {error}
                </p>
              )}

              {/* Submit */}
              <button
                onClick={handleSubmit}
                disabled={loading}
                className="cursor-pointer border-none disabled:opacity-70"
                style={{
                  width: "100%",
                  marginTop: 16,
                  padding: "13px",
                  borderRadius: 14,
                  fontSize: 15,
                  fontWeight: 700,
                  color: "white",
                  background:
                    "linear-gradient(135deg,#6366f1,#8b5cf6)",
                  boxShadow: "0 8px 20px rgba(99,102,241,.35)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                  transition: "transform .15s, box-shadow .15s",
                }}
                onMouseEnter={(ev) => {
                  if (!loading)
                    ev.currentTarget.style.transform = "translateY(-2px)";
                }}
                onMouseLeave={(ev) =>
                  (ev.currentTarget.style.transform = "translateY(0)")
                }
              >
                {loading ? (
                  <>
                    <span
                      style={{
                        width: 16,
                        height: 16,
                        borderRadius: "50%",
                        border: "2px solid rgba(255,255,255,.3)",
                        borderTopColor: "white",
                        animation: "fbSpin .7s linear infinite",
                      }}
                    />
                    Yuborilmoqda...
                  </>
                ) : (
                  "Yuborish"
                )}
              </button>
            </div>
          </>
        )}
      </div>

      <style>{`
        @keyframes fbFade { from { opacity: 0 } to { opacity: 1 } }
        @keyframes fbIn {
          from { opacity: 0; transform: scale(.9) translateY(24px) }
          to   { opacity: 1; transform: scale(1) translateY(0) }
        }
        @keyframes fbPop {
          0%   { transform: scale(.5); opacity: 0 }
          60%  { transform: scale(1.15) }
          100% { transform: scale(1); opacity: 1 }
        }
        @keyframes fbCheck { to { stroke-dashoffset: 0 } }
        @keyframes fbSpin { to { transform: rotate(360deg) } }
        @keyframes fbWave {
          0%, 100% { transform: rotate(0deg) }
          25%      { transform: rotate(-12deg) }
          75%      { transform: rotate(12deg) }
        }
      `}</style>
    </div>
  );
}
