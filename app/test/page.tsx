"use client";
import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase-browser";

interface Question {
  id: number;
  question: string;
  image: string | null;
  options: string[];
  answer: number;
  explanation: string | null;
}

type Phase = "start" | "test" | "result";

const CONFIGS = [
  { count: 20, minutes: 25 },
  { count: 50, minutes: 50 },
];
const BUCKET = "questions-images";
const SKIP_SEC = 3;

function shuffle<T>(arr: T[]): T[] {
  return [...arr].sort(() => Math.random() - 0.5);
}
function fmtTime(sec: number) {
  const m = Math.floor(sec / 60)
    .toString()
    .padStart(2, "0");
  const s = (sec % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
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

    const safeCtx = ctx;
    const safeCanvas = canvas;

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
      for (let i = 0; i < 40; i++) {
        const angle = (i / 40) * Math.PI * 2;
        const speed = 2 + Math.random() * 5;
        particles.push({
          x,
          y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed - 1.5,
          alpha: 1,
          color: COLORS[Math.floor(Math.random() * COLORS.length)],
          size: 3 + Math.random() * 3,
        });
      }
    }

    function loop() {
      safeCtx.clearRect(0, 0, safeCanvas.width, safeCanvas.height);
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.1;
        p.alpha -= 0.016;
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
      if (particles.length > 0) rafRef.current = requestAnimationFrame(loop);
    }

    // setTimeout — DOM paint bo'lgandan keyin offsetWidth to'g'ri o'lchamni beradi
    const t = setTimeout(() => {
      safeCanvas.width = safeCanvas.offsetWidth || 440;
      safeCanvas.height = safeCanvas.offsetHeight || 400;

      const w = safeCanvas.width;
      const h = safeCanvas.height;

      burst(w * 0.2, h * 0.3);
      setTimeout(() => burst(w * 0.8, h * 0.2), 250);
      setTimeout(() => burst(w * 0.5, h * 0.4), 500);
      setTimeout(() => burst(w * 0.15, h * 0.5), 750);
      setTimeout(() => burst(w * 0.85, h * 0.45), 1000);

      rafRef.current = requestAnimationFrame(loop);
    }, 50);

    return () => {
      clearTimeout(t);
      cancelAnimationFrame(rafRef.current);
    };
  }, [active]);

  // Canvas doim mount bo'ladi — active bo'lganda ko'rinadi
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
        opacity: active ? 1 : 0,
        transition: "opacity .3s",
      }}
    />
  );
}

export default function TestPage() {
  const router = useRouter();
  const supabase = createClient();

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const skipRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const elapsedRef = useRef(0);
  const [showFireworks, setShowFireworks] = useState(false);
  const [phase, setPhase] = useState<Phase>("start");
  const [configIdx, setConfigIdx] = useState(0);
  const [allQ, setAllQ] = useState<Question[]>([]);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState<(number | null)[]>([]);
  const [timeLeft, setTimeLeft] = useState(0);
  const [saved, setSaved] = useState(false);
  const [skipCountdown, setSkipCountdown] = useState<number | null>(null);
  const [vis, setVis] = useState(false);

  function imgUrl(img: string | null) {
    if (!img) return null;
    if (img.startsWith("http")) return img;
    return supabase.storage.from(BUCKET).getPublicUrl(img).data.publicUrl;
  }

  useEffect(() => {
    setTimeout(() => setVis(true), 60);
    supabase
      .from("questions")
      .select("id,question,image,options,answer,explanation")
      .then(({ data }) => {
        setAllQ(data ?? []);
        setLoading(false);
      });
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (skipRef.current) clearInterval(skipRef.current);
    };
  }, []);

  function anim(delay: number): React.CSSProperties {
    return {
      opacity: vis ? 1 : 0,
      transform: vis ? "translateY(0)" : "translateY(20px)",
      transition: `opacity 0.55s ease ${delay}ms, transform 0.55s cubic-bezier(0.22,1,0.36,1) ${delay}ms`,
    };
  }

  function startTimer(totalSec: number) {
    setTimeLeft(totalSec);
    elapsedRef.current = 0;
    if (timerRef.current) clearInterval(timerRef.current);
    let secs = totalSec;
    timerRef.current = setInterval(() => {
      secs--;
      elapsedRef.current++;
      setTimeLeft(secs);
      if (secs <= 0) {
        clearInterval(timerRef.current!);
        finishTest(elapsedRef.current);
      }
    }, 1000);
  }

  function startSkipTimer(nextFn: () => void) {
    if (skipRef.current) clearInterval(skipRef.current);
    setSkipCountdown(SKIP_SEC);
    let s = SKIP_SEC;
    skipRef.current = setInterval(() => {
      s--;
      setSkipCountdown(s);
      if (s <= 0) {
        clearInterval(skipRef.current!);
        setSkipCountdown(null);
        nextFn();
      }
    }, 1000);
  }

  function cancelSkip() {
    if (skipRef.current) {
      clearInterval(skipRef.current);
      skipRef.current = null;
    }
    setSkipCountdown(null);
  }

  function startTest() {
    const cfg = CONFIGS[configIdx];
    const pool = shuffle(allQ).slice(0, cfg.count);
    setQuestions(pool);
    setAnswers(new Array(pool.length).fill(null));
    setCurrent(0);
    setSaved(false);
    setPhase("test");
    startTimer(cfg.minutes * 60);
  }

  const finishTest = useCallback(
    async (dur?: number) => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (skipRef.current) clearInterval(skipRef.current);
      if (saved) {
        setPhase("result");
        return;
      }
      setSaved(true);

      const ans = answers;
      const correct = ans.filter((a, i) => a === questions[i]?.answer).length;
      const wrong = ans.filter((a) => a !== null).length - correct;
      const elapsed = dur ?? elapsedRef.current;
      const pct = Math.round((correct / questions.length) * 100);

      // 80% dan yuqori bo'lsa fireworks
      if (pct >= 80) {
        setShowFireworks(true);
        setTimeout(() => setShowFireworks(false), 4000);
      }

      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        const { data: result } = await supabase
          .from("test_results")
          .insert({
            user_id: user.id,
            total: questions.length,
            correct,
            wrong,
            score_percent: pct,
            passed: pct >= 70,
            duration_sec: elapsed,
          })
          .select()
          .single();

        if (result) {
          const wrongRows = ans
            .map((a, i) => ({
              user_id: user.id,
              test_result_id: result.id,
              question_id: questions[i].id,
              selected: a!,
              correct: questions[i].answer,
            }))
            .filter(
              (_, i) => ans[i] !== null && ans[i] !== questions[i].answer,
            );

          if (wrongRows.length > 0) {
            await supabase.from("wrong_answers").insert(wrongRows);
          }
        }
      }
      setPhase("result");
    },
    [answers, questions, saved],
  );

  async function exitTest() {
    cancelSkip();
    await finishTest();
    router.push("/");
  }

  function goNext() {
    if (current < questions.length - 1) {
      setCurrent((c) => c + 1);
    } else {
      finishTest();
    }
  }

  function handleAnswer(idx: number) {
    if (answers[current] !== null) return;
    const updated = [...answers];
    updated[current] = idx;
    setAnswers(updated);
    // Auto skip after 3 sec
    const isLast = current === questions.length - 1;
    startSkipTimer(() => {
      if (isLast) finishTest();
      else setCurrent((c) => c + 1);
    });
  }

  // START SCREEN
  if (phase === "start") {
    const cfg = CONFIGS[configIdx];
    return (
      <>
        <style>{`
          @import url('https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,600&display=swap');
          .fs{font-family:'Syne',sans-serif;font-weight:800}
          .fb{font-family:'DM Sans',sans-serif}
          .lift{transition:transform .25s cubic-bezier(.34,1.56,.64,1),box-shadow .25s ease}
          .lift:hover{transform:translateY(-4px);box-shadow:0 20px 48px rgba(0,0,0,.1)}
        `}</style>
        <div
          className="fb"
          style={{
            minHeight: "100vh",
            background: "#f8f9fc",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 24,
          }}
        >
          <div style={{ width: "100%", maxWidth: 680 }}>
            {/* Logo */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 10,
                marginBottom: 40,
                ...anim(0),
              }}
            >
              <a
                href="/"
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  textDecoration: "none",
                }}
              >
                <div
                  style={{
                    width: 38,
                    height: 38,
                    background: "#4f46e5",
                    borderRadius: 12,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    boxShadow: "0 4px 14px rgba(79,70,229,.35)",
                  }}
                >
                  <svg
                    width="17"
                    height="17"
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
                <span
                  className="fs"
                  style={{
                    fontSize: 22,
                    color: "#0f172a",
                    letterSpacing: "-0.02em",
                  }}
                >
                  Brotest
                </span>
              </a>
            </div>

            {/* Card */}
            <div
              style={{
                background: "white",
                borderRadius: 28,
                border: "1px solid #e2e8f0",
                overflow: "hidden",
                boxShadow: "0 4px 24px rgba(0,0,0,.06)",
                ...anim(80),
              }}
            >
              {/* Header */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 18,
                  padding: "28px 36px",
                  borderBottom: "1px solid #f1f5f9",
                }}
              >
                <div
                  style={{
                    width: 56,
                    height: 56,
                    background: "#4f46e5",
                    borderRadius: 18,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                    boxShadow: "0 6px 18px rgba(79,70,229,.3)",
                  }}
                >
                  <svg width="24" height="24" fill="white" viewBox="0 0 24 24">
                    <polygon points="5 3 19 12 5 21 5 3" />
                  </svg>
                </div>
                <div>
                  <h1
                    className="fs"
                    style={{
                      fontSize: 28,
                      color: "#0f172a",
                      letterSpacing: "-0.025em",
                      margin: 0,
                      lineHeight: 1.1,
                    }}
                  >
                    Test ishlash
                  </h1>
                  <p style={{ fontSize: 14, color: "#94a3b8", marginTop: 4 }}>
                    {cfg.count} ta tasodifiy savol · {cfg.minutes} daqiqa
                  </p>
                </div>
              </div>

              {/* Body */}
              <div
                style={{
                  display: "flex",
                  gap: 28,
                  padding: "28px 36px",
                  flexWrap: "wrap",
                }}
              >
                {/* Savol soni */}
                <div style={{ flex: 1, minWidth: 220 }}>
                  <p
                    style={{
                      fontSize: 11,
                      fontWeight: 700,
                      color: "#94a3b8",
                      letterSpacing: "0.08em",
                      textTransform: "uppercase",
                      marginBottom: 14,
                    }}
                  >
                    Savollar sonini tanlang
                  </p>
                  <div style={{ display: "flex", gap: 12 }}>
                    {CONFIGS.map((c, i) => (
                      <button
                        key={i}
                        onClick={() => setConfigIdx(i)}
                        style={{
                          flex: 1,
                          borderRadius: 20,
                          border: `2px solid ${configIdx === i ? "#4f46e5" : "#e2e8f0"}`,
                          background: configIdx === i ? "#eef2ff" : "#f8f9fc",
                          padding: "20px 16px",
                          cursor: "pointer",
                          textAlign: "center",
                          transition: "all .2s",
                          position: "relative",
                        }}
                      >
                        {configIdx === i && (
                          <div
                            style={{
                              position: "absolute",
                              top: 10,
                              right: 10,
                              width: 22,
                              height: 22,
                              background: "#4f46e5",
                              borderRadius: "50%",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                            }}
                          >
                            <svg
                              width="10"
                              height="10"
                              fill="none"
                              stroke="white"
                              strokeWidth="2.5"
                              viewBox="0 0 24 24"
                            >
                              <polyline points="20 6 9 17 4 12" />
                            </svg>
                          </div>
                        )}
                        <p
                          className="fs"
                          style={{
                            fontSize: 42,
                            color: configIdx === i ? "#4f46e5" : "#cbd5e1",
                            margin: 0,
                            lineHeight: 1,
                          }}
                        >
                          {c.count}
                        </p>
                        <p
                          style={{
                            fontSize: 13,
                            fontWeight: 600,
                            color: configIdx === i ? "#4f46e5" : "#94a3b8",
                            marginTop: 6,
                          }}
                        >
                          savollar
                        </p>
                        <p
                          style={{
                            fontSize: 12,
                            color: configIdx === i ? "#818cf8" : "#cbd5e1",
                            marginTop: 2,
                          }}
                        >
                          {c.minutes} daqiqa
                        </p>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Info + start */}
                <div
                  style={{
                    flex: 1,
                    minWidth: 220,
                    display: "flex",
                    flexDirection: "column",
                    gap: 14,
                  }}
                >
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(3,1fr)",
                      gap: 10,
                    }}
                  >
                    {[
                      {
                        e: "📋",
                        val: String(cfg.count),
                        label: "Savollar",
                        green: false,
                      },
                      {
                        e: "⏱",
                        val: String(cfg.minutes),
                        label: "Daqiqa",
                        green: false,
                      },
                      { e: "🎯", val: "70%", label: "O'tish", green: true },
                    ].map((s, i) => (
                      <div
                        key={i}
                        style={{
                          background: "#f8f9fc",
                          borderRadius: 16,
                          border: "1px solid #f1f5f9",
                          padding: "14px 10px",
                          textAlign: "center",
                        }}
                      >
                        <p style={{ fontSize: 18, margin: "0 0 6px" }}>{s.e}</p>
                        <p
                          className="fs"
                          style={{
                            fontSize: 22,
                            color: s.green ? "#10b981" : "#0f172a",
                            margin: "0 0 3px",
                            lineHeight: 1,
                          }}
                        >
                          {s.val}
                        </p>
                        <p style={{ fontSize: 11, color: "#94a3b8" }}>
                          {s.label}
                        </p>
                      </div>
                    ))}
                  </div>

                  <button
                    onClick={startTest}
                    disabled={loading || allQ.length === 0}
                    style={{
                      width: "100%",
                      background: "#4f46e5",
                      color: "white",
                      border: "none",
                      borderRadius: 16,
                      padding: "16px",
                      cursor: loading ? "not-allowed" : "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 10,
                      fontSize: 15,
                      fontWeight: 700,
                      boxShadow: "0 6px 20px rgba(79,70,229,.35)",
                      transition: "all .2s",
                      opacity: loading ? 0.5 : 1,
                    }}
                    onMouseEnter={(e) => {
                      if (!loading) {
                        (e.currentTarget as HTMLElement).style.background =
                          "#4338ca";
                        (e.currentTarget as HTMLElement).style.transform =
                          "translateY(-1px)";
                      }
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLElement).style.background =
                        "#4f46e5";
                      (e.currentTarget as HTMLElement).style.transform =
                        "translateY(0)";
                    }}
                  >
                    <svg
                      width="16"
                      height="16"
                      fill="white"
                      viewBox="0 0 24 24"
                    >
                      <polygon points="5 3 19 12 5 21 5 3" />
                    </svg>
                    {loading ? "Yuklanmoqda..." : "Testni boshlash"}
                  </button>
                </div>
              </div>

              <p
                style={{
                  textAlign: "center",
                  fontSize: 12,
                  color: "#94a3b8",
                  padding: "0 36px 24px",
                }}
              >
                Testni boshlash uchun ro'yxatdan o'tish shart emas
              </p>
            </div>

            <p style={{ textAlign: "center", marginTop: 20, fontSize: 13 }}>
              <a
                href="/"
                style={{
                  color: "#94a3b8",
                  textDecoration: "none",
                  transition: "color .15s",
                }}
                onMouseEnter={(e) =>
                  ((e.currentTarget as HTMLElement).style.color = "#4f46e5")
                }
                onMouseLeave={(e) =>
                  ((e.currentTarget as HTMLElement).style.color = "#94a3b8")
                }
              >
                ← Bosh sahifaga qaytish
              </a>
            </p>
          </div>
        </div>
      </>
    );
  }

  // RESULT SCREEN
  if (phase === "result") {
    const correct = answers.filter((a, i) => a === questions[i]?.answer).length;
    const wrong = answers.filter((a) => a !== null).length - correct;
    const pct = Math.round((correct / questions.length) * 100);
    const passed = pct >= 70;

    return (
      <>
        <style>{`
          @import url('https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,600&display=swap');
          .fs{font-family:'Syne',sans-serif;font-weight:800}
          .fb{font-family:'DM Sans',sans-serif}
        `}</style>
        <div
          className="fb"
          style={{
            minHeight: "100vh",
            background: "#f8f9fc",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 24,
          }}
        >
          <div
            style={{
              width: "100%",
              maxWidth: 440,
              background: "white",
              borderRadius: 28,
              border: "1px solid #e2e8f0",
              boxShadow: "0 8px 32px rgba(0,0,0,.07)",
              padding: "48px 40px",
              textAlign: "center",
              position: "relative",
              overflow: "hidden",
              ...anim(0),
            }}
          >
            <Fireworks active={showFireworks} />

            {/* Trophy */}
            <div
              style={{
                width: 80,
                height: 80,
                borderRadius: "50%",
                background: passed ? "#f0fdf4" : "#fff1f2",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                margin: "0 auto 24px",
              }}
            >
              <svg
                width="36"
                height="36"
                fill="none"
                stroke={passed ? "#10b981" : "#ef4444"}
                strokeWidth="1.5"
                viewBox="0 0 24 24"
              >
                <path d="M8 21h8M12 17v4M7 4H4a1 1 0 00-1 1v3c0 2.21 1.79 4 4 4" />
                <path d="M17 4h3a1 1 0 011 1v3c0 2.21-1.79 4-4 4" />
                <path d="M7 4h10v8a5 5 0 01-10 0V4z" />
              </svg>
            </div>

            <h2
              className="fs"
              style={{
                fontSize: 32,
                color: "#0f172a",
                letterSpacing: "-0.025em",
                margin: "0 0 4px",
              }}
            >
              Test natijalari
            </h2>
            <p style={{ fontSize: 14, color: "#94a3b8", marginBottom: 28 }}>
              Variant {configIdx + 1}
            </p>

            {/* Score */}
            <div
              style={{
                background: passed ? "#f0fdf4" : "#fff1f2",
                border: `1px solid ${passed ? "#bbf7d0" : "#fecdd3"}`,
                borderRadius: 20,
                padding: "28px 24px",
                marginBottom: 28,
              }}
            >
              <p
                className="fs"
                style={{
                  fontSize: 64,
                  color: passed ? "#10b981" : "#ef4444",
                  margin: 0,
                  lineHeight: 1,
                }}
              >
                {pct}%
              </p>
              <p
                style={{
                  fontSize: 16,
                  fontWeight: 600,
                  color: passed ? "#065f46" : "#9f1239",
                  marginTop: 8,
                }}
              >
                {passed ? "O'tdingiz!" : "O'tmadingiz"}
              </p>
            </div>

            {/* Stats */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(3,1fr)",
                gap: 12,
                marginBottom: 32,
              }}
            >
              {[
                {
                  icon: "✓",
                  c: "#10b981",
                  bc: "#d1fae5",
                  val: correct,
                  label: "To'g'ri",
                },
                {
                  icon: "✕",
                  c: "#ef4444",
                  bc: "#fee2e2",
                  val: wrong,
                  label: "Noto'g'ri",
                },
                {
                  icon: "⏱",
                  c: "#6366f1",
                  bc: "#e0e7ff",
                  val: fmtTime(elapsedRef.current),
                  label: "Vaqt",
                },
              ].map((s, i) => (
                <div
                  key={i}
                  style={{
                    background: "#f8f9fc",
                    borderRadius: 16,
                    border: "1px solid #f1f5f9",
                    padding: "16px 12px",
                    textAlign: "center",
                  }}
                >
                  <div
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: "50%",
                      border: `2px solid ${s.bc}`,
                      background: s.bc,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      margin: "0 auto 10px",
                    }}
                  >
                    <span style={{ fontSize: 14, fontWeight: 700, color: s.c }}>
                      {s.icon}
                    </span>
                  </div>
                  <p
                    className="fs"
                    style={{
                      fontSize: 22,
                      color: "#0f172a",
                      margin: "0 0 3px",
                      lineHeight: 1,
                    }}
                  >
                    {s.val}
                  </p>
                  <p style={{ fontSize: 11, color: "#94a3b8" }}>{s.label}</p>
                </div>
              ))}
            </div>

            {/* Buttons */}
            <div style={{ display: "flex", gap: 12 }}>
              <a
                href="/"
                style={{
                  flex: 1,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                  background: "#f1f5f9",
                  color: "#334155",
                  fontWeight: 600,
                  fontSize: 14,
                  padding: "14px",
                  borderRadius: 14,
                  textDecoration: "none",
                  border: "1px solid #e2e8f0",
                  transition: "all .2s",
                }}
                onMouseEnter={(e) =>
                  ((e.currentTarget as HTMLElement).style.background =
                    "#e2e8f0")
                }
                onMouseLeave={(e) =>
                  ((e.currentTarget as HTMLElement).style.background =
                    "#f1f5f9")
                }
              >
                <svg
                  width="14"
                  height="14"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  viewBox="0 0 24 24"
                >
                  <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
                  <polyline points="9 22 9 12 15 12 15 22" />
                </svg>
                Bosh sahifa
              </a>
              <button
                onClick={() => {
                  setSaved(false);
                  setPhase("start");
                }}
                style={{
                  flex: 1,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                  background: "#4f46e5",
                  color: "white",
                  fontWeight: 600,
                  fontSize: 14,
                  padding: "14px",
                  borderRadius: 14,
                  border: "none",
                  cursor: "pointer",
                  boxShadow: "0 4px 14px rgba(79,70,229,.3)",
                  transition: "all .2s",
                }}
                onMouseEnter={(e) =>
                  ((e.currentTarget as HTMLElement).style.background =
                    "#4338ca")
                }
                onMouseLeave={(e) =>
                  ((e.currentTarget as HTMLElement).style.background =
                    "#4f46e5")
                }
              >
                <svg
                  width="14"
                  height="14"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  viewBox="0 0 24 24"
                >
                  <polyline points="1 4 1 10 7 10" />
                  <path d="M3.51 15a9 9 0 102.13-9.36L1 10" />
                </svg>
                Qayta urinish
              </button>
            </div>
          </div>
        </div>
      </>
    );
  }

  const q = questions[current];
  const answered = answers[current] !== null;
  const selected = answers[current];
  const timeWarn = timeLeft <= 60;
  const answeredCount = answers.filter((a) => a !== null).length;

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,600&display=swap');
        .fs{font-family:'Syne',sans-serif;font-weight:800}
        .fb{font-family:'DM Sans',sans-serif}
        @keyframes skipBar { from{width:100%} to{width:0%} }
        .skip-bar { animation: skipBar ${SKIP_SEC}s linear forwards; }
        @keyframes fadeIn { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
        .fade-in { animation: fadeIn .3s ease forwards; }
      `}</style>
      <div
        className="fb"
        style={{
          minHeight: "100vh",
          background: "#f8f9fc",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {/* ── TOP NAV: question pills ── */}
        <div
          style={{
            position: "sticky",
            top: 0,
            zIndex: 20,
            background: "rgba(255,255,255,.92)",
            backdropFilter: "blur(16px)",
            borderBottom: "1px solid #e2e8f0",
            boxShadow: "0 1px 8px rgba(0,0,0,.04)",
          }}
        >
          <div
            style={{ maxWidth: 900, margin: "0 auto", padding: "12px 24px" }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 6,
                flexWrap: "wrap",
              }}
            >
              {questions.map((_, i) => {
                const done = answers[i] !== null;
                const cur = i === current;
                const correct = done && answers[i] === questions[i].answer;
                const wrong = done && answers[i] !== questions[i].answer;

                let bg = "#f1f5f9";
                let color = "#64748b";
                let border = "#e2e8f0";
                let shadow = "none";

                if (cur) {
                  bg = "#4f46e5";
                  color = "white";
                  border = "#4f46e5";
                  shadow = "0 4px 12px rgba(79,70,229,.35)";
                } else if (correct) {
                  bg = "#d1fae5";
                  color = "#065f46";
                  border = "#6ee7b7";
                } else if (wrong) {
                  bg = "#fee2e2";
                  color = "#991b1b";
                  border = "#fca5a5";
                }

                return (
                  <button
                    key={i}
                    onClick={() => {
                      cancelSkip();
                      setCurrent(i);
                    }}
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: "50%",
                      border: `2px solid ${border}`,
                      background: bg,
                      color,
                      fontSize: 11,
                      fontWeight: 700,
                      cursor: "pointer",
                      transition: "all .2s",
                      boxShadow: shadow,
                      transform: cur ? "scale(1.15)" : "scale(1)",
                    }}
                  >
                    {i + 1}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* ── MAIN CONTENT ── */}
        <div
          style={{
            flex: 1,
            maxWidth: 960,
            margin: "0 auto",
            width: "100%",
            padding: "28px 20px 120px",
          }}
        >
          {/* Meta row */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: 16,
            }}
          >
            <span style={{ fontSize: 13, fontWeight: 600, color: "#94a3b8" }}>
              Savol{" "}
              <span style={{ color: "#0f172a", fontSize: 15 }}>
                {current + 1}
              </span>
              <span style={{ color: "#cbd5e1" }}> / {questions.length}</span>
            </span>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              {skipCountdown !== null && (
                <div
                  className="fade-in"
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 7,
                    background: "#eef2ff",
                    border: "1px solid #c7d2fe",
                    borderRadius: 10,
                    padding: "5px 12px",
                  }}
                >
                  <span
                    style={{ fontSize: 12, fontWeight: 600, color: "#4338ca" }}
                  >
                    Keyingisi {skipCountdown}s
                  </span>
                  <button
                    onClick={cancelSkip}
                    style={{
                      width: 16,
                      height: 16,
                      borderRadius: "50%",
                      background: "#c7d2fe",
                      border: "none",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      padding: 0,
                    }}
                  >
                    <svg
                      width="8"
                      height="8"
                      fill="none"
                      stroke="#4338ca"
                      strokeWidth="2.5"
                      viewBox="0 0 24 24"
                    >
                      <line x1="18" y1="6" x2="6" y2="18" />
                      <line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                  </button>
                </div>
              )}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  background: timeWarn ? "#fff1f2" : "white",
                  border: `1px solid ${timeWarn ? "#fca5a5" : "#e2e8f0"}`,
                  borderRadius: 10,
                  padding: "7px 12px",
                  fontFamily: "monospace",
                  fontSize: 13,
                  fontWeight: 700,
                  color: timeWarn ? "#ef4444" : "#334155",
                  transition: "all .3s",
                }}
              >
                <svg
                  width="12"
                  height="12"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  viewBox="0 0 24 24"
                >
                  <circle cx="12" cy="12" r="10" />
                  <polyline points="12 6 12 12 16 14" />
                </svg>
                {fmtTime(timeLeft)}
              </div>
            </div>
          </div>

          {/* Progress bar */}
          <div
            style={{
              height: 3,
              background: "#e2e8f0",
              borderRadius: 999,
              marginBottom: 20,
              overflow: "hidden",
            }}
          >
            <div
              style={{
                height: "100%",
                background: "linear-gradient(90deg,#6366f1,#4f46e5)",
                borderRadius: 999,
                width: `${(answeredCount / questions.length) * 100}%`,
                transition: "width .4s ease",
              }}
            />
          </div>

          {/* Skip bar */}
          {skipCountdown !== null && (
            <div
              style={{
                height: 2,
                background: "#e2e8f0",
                borderRadius: 999,
                marginBottom: 16,
                overflow: "hidden",
              }}
            >
              <div
                className="skip-bar"
                style={{
                  height: "100%",
                  background: "#818cf8",
                  borderRadius: 999,
                  width: "100%",
                }}
              />
            </div>
          )}

          {/* ── DESKTOP: 2 ustun | MOBILE: 1 ustun ── */}
          <div className="test-layout">
            {/* ── CHAP (desktop) / YUQORI (mobile): savol + variantlar ── */}
            <div className="test-left">
              {/* Mobile: rasm savol USTIDA */}
              {q.image && (
                <div className="test-img-mobile">
                  <img
                    src={imgUrl(q.image) ?? ""}
                    alt="savol rasmi"
                    style={{
                      width: "100%",
                      display: "block",
                      objectFit: "contain",
                      maxHeight: 220,
                      borderRadius: "18px 18px 0 0",
                    }}
                  />
                </div>
              )}

              {/* Savol kartochkasi */}
              <div
                style={{
                  background: "white",
                  borderRadius: 18,
                  border: "1px solid #e2e8f0",
                  padding: "20px 22px 20px 18px",
                  boxShadow: "0 2px 8px rgba(0,0,0,.04)",
                  display: "flex",
                  gap: 14,
                  alignItems: "flex-start",
                }}
              >
                <div style={{ flex: 1 }}>
                  <p
                    style={{
                      fontFamily: "'DM Sans', sans-serif",
                      fontSize: "clamp(15px, 1.8vw, 19px)",
                      fontWeight: 600,
                      color: "#0f172a",
                      lineHeight: 1.6,
                      letterSpacing: "-0.01em",
                      margin: 0,
                    }}
                  >
                    {q.question}
                  </p>
                </div>
              </div>

              {/* Variantlar */}
              <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
                {q.options.map((opt, idx) => {
                  const isSelected = selected === idx;
                  const isCorrect = idx === q.answer;
                  const isWrong = answered && isSelected && !isCorrect;

                  let bg = "white",
                    border = "#e2e8f0",
                    color = "#334155",
                    radioB = "#e2e8f0",
                    opacity = 1;

                  if (answered) {
                    if (isCorrect) {
                      bg = "#f0fdf4";
                      border = "#4ade80";
                      color = "#14532d";
                      radioB = "#22c55e";
                    } else if (isWrong) {
                      bg = "#fff1f2";
                      border = "#f87171";
                      color = "#7f1d1d";
                      radioB = "#ef4444";
                    } else {
                      opacity = 0.4;
                    }
                  } else if (isSelected) {
                    bg = "#eef2ff";
                    border = "#6366f1";
                    color = "#1e1b4b";
                    radioB = "#6366f1";
                  }

                  return (
                    <button
                      key={idx}
                      onClick={() => handleAnswer(idx)}
                      disabled={answered}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 12,
                        padding: "12px 16px",
                        borderRadius: 14,
                        border: `2px solid ${border}`,
                        background: bg,
                        cursor: answered ? "default" : "pointer",
                        textAlign: "left",
                        transition: "all .18s",
                        opacity,
                        boxShadow:
                          answered && isCorrect
                            ? "0 3px 12px rgba(34,197,94,.15)"
                            : "none",
                        width: "100%",
                      }}
                      onMouseEnter={(e) => {
                        if (!answered) {
                          (e.currentTarget as HTMLElement).style.borderColor =
                            "#6366f1";
                          (e.currentTarget as HTMLElement).style.background =
                            "#eef2ff";
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!answered) {
                          (e.currentTarget as HTMLElement).style.borderColor =
                            "#e2e8f0";
                          (e.currentTarget as HTMLElement).style.background =
                            "white";
                        }
                      }}
                    >
                      <div
                        style={{
                          width: 20,
                          height: 20,
                          borderRadius: "50%",
                          border: `2.5px solid ${radioB}`,
                          background:
                            answered && (isCorrect || isWrong)
                              ? radioB
                              : "transparent",
                          flexShrink: 0,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          transition: "all .18s",
                        }}
                      >
                        {answered && isCorrect && (
                          <svg
                            width="10"
                            height="10"
                            fill="none"
                            stroke="white"
                            strokeWidth="3"
                            viewBox="0 0 24 24"
                          >
                            <polyline points="20 6 9 17 4 12" />
                          </svg>
                        )}
                        {answered && isWrong && (
                          <svg
                            width="8"
                            height="8"
                            fill="none"
                            stroke="white"
                            strokeWidth="3"
                            viewBox="0 0 24 24"
                          >
                            <line x1="18" y1="6" x2="6" y2="18" />
                            <line x1="6" y1="6" x2="18" y2="18" />
                          </svg>
                        )}
                        {!answered && isSelected && (
                          <div
                            style={{
                              width: 9,
                              height: 9,
                              borderRadius: "50%",
                              background: "#6366f1",
                            }}
                          />
                        )}
                      </div>
                      <span
                        style={{
                          width: 26,
                          height: 26,
                          borderRadius: 8,
                          flexShrink: 0,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: 11,
                          fontWeight: 800,
                          background: answered
                            ? isCorrect
                              ? "#dcfce7"
                              : isWrong
                                ? "#fee2e2"
                                : "#f1f5f9"
                            : isSelected
                              ? "#e0e7ff"
                              : "#f1f5f9",
                          color: answered
                            ? isCorrect
                              ? "#16a34a"
                              : isWrong
                                ? "#dc2626"
                                : "#94a3b8"
                            : isSelected
                              ? "#4338ca"
                              : "#94a3b8",
                        }}
                      >
                        {String.fromCharCode(65 + idx)}
                      </span>
                      <span
                        style={{
                          fontSize: 14,
                          fontWeight: 500,
                          color,
                          flex: 1,
                          lineHeight: 1.45,
                          textAlign: "left",
                        }}
                      >
                        {opt}
                      </span>
                      {answered && isCorrect && (
                        <span
                          style={{
                            fontSize: 11,
                            fontWeight: 700,
                            color: "#16a34a",
                            background: "#dcfce7",
                            padding: "2px 9px",
                            borderRadius: 20,
                            flexShrink: 0,
                          }}
                        >
                          To'g'ri ✓
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Explanation */}
              {answered && q.explanation && (
                <div
                  className="fade-in"
                  style={{
                    background: "#eff6ff",
                    border: "1px solid #bfdbfe",
                    borderRadius: 14,
                    padding: "12px 16px",
                    display: "flex",
                    gap: 10,
                  }}
                >
                  <span style={{ fontSize: 16, flexShrink: 0 }}>💡</span>
                  <p
                    style={{
                      fontSize: 13,
                      color: "#1e40af",
                      lineHeight: 1.6,
                      margin: 0,
                    }}
                  >
                    {q.explanation}
                  </p>
                </div>
              )}
            </div>

            {/* ── O'NG (faqat desktop): rasm ── */}
            {q.image && (
              <div className="test-img-desktop">
                <div
                  style={{
                    position: "sticky",
                    top: 76,
                    background: "white",
                    borderRadius: 18,
                    border: "1px solid #e2e8f0",
                    overflow: "hidden",
                    boxShadow: "0 2px 8px rgba(0,0,0,.04)",
                  }}
                >
                  <img
                    src={imgUrl(q.image) ?? ""}
                    alt="savol rasmi"
                    style={{
                      width: "100%",
                      display: "block",
                      objectFit: "contain",
                      maxHeight: 340,
                    }}
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ── Responsive styles ── */}
        <style>{`
  .test-layout {
    display: grid;
    grid-template-columns: ${q.image ? "1fr 360px" : "1fr"};
    gap: 16px;
    align-items: start;
  }
  .test-left {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }
  /* Mobile: rasm ustida ko'rinadi */
  .test-img-mobile  { display: none; }
  .test-img-desktop { display: block; }

  /* Mobile breakpoint */
  @media (max-width: 640px) {
    .test-layout {
      grid-template-columns: 1fr !important;
    }
    .test-img-mobile  { display: block; }
    .test-img-desktop { display: none;  }
  }
`}</style>

        {/* ── BOTTOM BAR ── */}
        <div
          style={{
            position: "fixed",
            bottom: 0,
            left: 0,
            right: 0,
            background: "rgba(255,255,255,.95)",
            backdropFilter: "blur(16px)",
            borderTop: "1px solid #e2e8f0",
            boxShadow: "0 -4px 20px rgba(0,0,0,.06)",
            zIndex: 30,
          }}
        >
          <div
            style={{
              maxWidth: 900,
              margin: "0 auto",
              padding: "14px 24px",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 12,
            }}
          >
            {/* Prev */}
            <button
              onClick={() => {
                cancelSkip();
                setCurrent((c) => Math.max(0, c - 1));
              }}
              disabled={current === 0}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: "10px 22px",
                borderRadius: 14,
                border: "2px solid #e2e8f0",
                background: "white",
                color: "#334155",
                fontSize: 14,
                fontWeight: 600,
                cursor: current === 0 ? "not-allowed" : "pointer",
                opacity: current === 0 ? 0.35 : 1,
                transition: "all .2s",
              }}
              onMouseEnter={(e) => {
                if (current > 0)
                  (e.currentTarget as HTMLElement).style.borderColor =
                    "#6366f1";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.borderColor = "#e2e8f0";
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
                <polyline points="15 18 9 12 15 6" />
              </svg>
              Oldingi
            </button>

            {/* Center */}
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span
                style={{
                  fontSize: 13,
                  fontWeight: 700,
                  color: "#64748b",
                  background: "#f1f5f9",
                  padding: "6px 14px",
                  borderRadius: 10,
                }}
              >
                {answeredCount} / {questions.length}
              </span>
              <button
                onClick={exitTest}
                style={{
                  padding: "7px 14px",
                  borderRadius: 10,
                  border: "none",
                  background: "transparent",
                  color: "#94a3b8",
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: "pointer",
                  transition: "all .15s",
                }}
                onMouseEnter={(e) => {
                  const el = e.currentTarget as HTMLElement;
                  el.style.color = "#64748b";
                  el.style.background = "#f1f5f9";
                }}
                onMouseLeave={(e) => {
                  const el = e.currentTarget as HTMLElement;
                  el.style.color = "#94a3b8";
                  el.style.background = "transparent";
                }}
              >
                Chiqish
              </button>
              <button
                onClick={() => finishTest()}
                style={{
                  padding: "7px 16px",
                  borderRadius: 10,
                  border: "none",
                  background: "#dcfce7",
                  color: "#16a34a",
                  fontSize: 13,
                  fontWeight: 700,
                  cursor: "pointer",
                  transition: "all .15s",
                }}
                onMouseEnter={(e) =>
                  ((e.currentTarget as HTMLElement).style.background =
                    "#bbf7d0")
                }
                onMouseLeave={(e) =>
                  ((e.currentTarget as HTMLElement).style.background =
                    "#dcfce7")
                }
              >
                Yakunlash
              </button>
            </div>

            {/* Next */}
            <button
              onClick={() => {
                cancelSkip();
                goNext();
              }}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: "10px 22px",
                borderRadius: 14,
                border: "none",
                background: "#4f46e5",
                color: "white",
                fontSize: 14,
                fontWeight: 700,
                cursor: "pointer",
                boxShadow: "0 4px 14px rgba(79,70,229,.3)",
                transition: "all .2s",
              }}
              onMouseEnter={(e) => {
                const el = e.currentTarget as HTMLElement;
                el.style.background = "#4338ca";
                el.style.transform = "translateY(-1px)";
              }}
              onMouseLeave={(e) => {
                const el = e.currentTarget as HTMLElement;
                el.style.background = "#4f46e5";
                el.style.transform = "translateY(0)";
              }}
            >
              Keyingi
              <svg
                width="14"
                height="14"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                viewBox="0 0 24 24"
              >
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
