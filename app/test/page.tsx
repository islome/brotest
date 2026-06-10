"use client";
import { useEffect, useState, useMemo, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase-browser";
import Link from "next/link";
import Image from "next/image";

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
  const supabase = useMemo(() => createClient(), []);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
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
  const [vis, setVis] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalImage, setModalImage] = useState<string | null>(null);
  const [mode, setMode] = useState<"practice" | "exam">("practice");
  const [flagged, setFlagged] = useState<boolean[]>([]);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [reviewAnswers, setReviewAnswers] = useState(false);
  const finishTestRef = useRef<((dur?: number) => Promise<void>) | null>(null);

  const answersRef = useRef(answers);
  const questionsRef = useRef(questions);

  const imgUrl = useCallback(
    (img: string | null) => {
      if (!img) return null;
      const trimmed = img.trim();
      if (!trimmed) return null;
      if (trimmed.startsWith("http")) return trimmed;
      return supabase.storage.from(BUCKET).getPublicUrl(trimmed).data.publicUrl;
    },
    [supabase],
  );

  const anim = useCallback(
    (delay: number): React.CSSProperties => ({
      opacity: vis ? 1 : 0,
      transform: vis ? "translateY(0)" : "translateY(20px)",
      transition: `opacity 0.55s ease ${delay}ms, transform 0.55s cubic-bezier(0.22,1,0.36,1) ${delay}ms`,
    }),
    [vis],
  );
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
    };
  }, [supabase]);

  useEffect(() => {
    answersRef.current = answers;
  }, [answers]);
  useEffect(() => {
    questionsRef.current = questions;
  }, [questions]);

  const finishTest = useCallback(
    async (dur?: number) => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (saved) {
        setPhase("result");
        return;
      }
      setSaved(true);

      const ans = answersRef.current;
      const qs = questionsRef.current; 
      const correct = ans.filter((a, i) => a === qs[i]?.answer).length;
      const wrong = ans.filter((a) => a !== null).length - correct;
      const elapsed = dur ?? elapsedRef.current;
      const pct = Math.round((correct / qs.length) * 100);

      function playResultSound(success: boolean) {
        try {
          const audio = new Audio(
            success ? "/sounds/success.wav" : "/sounds/fail.wav",
          );
          audio.volume = 0.8;
          audio.play();
        } catch (e) {}
      }

      if (pct >= 80) {
        setShowFireworks(true);
        setTimeout(() => setShowFireworks(false), 6000);
        playResultSound(true);
      } else {
        playResultSound(false);
      }

      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        const { data: result } = await supabase
          .from("test_results")
          .insert({
            user_id: user.id,
            total: qs.length,
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
              question_id: qs[i].id,
              selected: a!,
              correct: qs[i].answer,
            }))
            .filter((_, i) => ans[i] !== null && ans[i] !== qs[i].answer);

          if (wrongRows.length > 0) {
            await supabase.from("wrong_answers").insert(wrongRows);
          }
        }
      }
      setPhase("result");
    },
    [saved, supabase], // ✅ answers/questions ref orqali, dependency minimal
  );

  useEffect(() => {
    finishTestRef.current = finishTest;
  }, [finishTest]);

  const startTimer = useCallback((totalSec: number) => {
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
        finishTestRef.current?.(elapsedRef.current); // ✅ ref orqali
      }
    }, 1000);
  }, []);

  function startTest() {
    const cfg = CONFIGS[configIdx];
    const pool = shuffle(allQ).slice(0, cfg.count);
    setQuestions(pool);
    setAnswers(new Array(pool.length).fill(null));
    setFlagged(new Array(pool.length).fill(false));
    setCurrent(0);
    setReviewOpen(false);
    setReviewAnswers(false);
    setSaved(false);
    setPhase("test");
    startTimer(cfg.minutes * 60);
  }

  useEffect(() => {
    answersRef.current = answers;
  }, [answers]);
  useEffect(() => {
    questionsRef.current = questions;
  }, [questions]);

  async function exitTest() {
    await finishTest();
    router.push("/");
  }

  const goNext = useCallback(() => {
    if (current < questions.length - 1) setCurrent((c) => c + 1);
    else finishTest();
  }, [current, questions.length, finishTest]);

  const goPrev = useCallback(() => {
    setCurrent((c) => Math.max(0, c - 1));
  }, []);

  const toggleFlag = useCallback(() => {
    setFlagged((f) => {
      const n = [...f];
      n[current] = !n[current];
      return n;
    });
  }, [current]);

  // Practice: lock after first answer (reveal feedback).
  // Exam: record/replace silently and auto-advance on first answer.
  const selectAnswer = useCallback(
    (idx: number) => {
      if (mode === "practice") {
        if (answers[current] !== null) return;
        const updated = [...answers];
        updated[current] = idx;
        setAnswers(updated);
      } else {
        const wasUnanswered = answers[current] === null;
        const updated = [...answers];
        updated[current] = idx;
        setAnswers(updated);
        if (wasUnanswered && current < questions.length - 1) {
          window.setTimeout(() => setCurrent((c) => c + 1), 260);
        }
      }
    },
    [mode, answers, current, questions.length],
  );

  // Keyboard navigation (arrows = prev/next, 1-9 = pick option, F = flag, R = review)
  useEffect(() => {
    if (phase !== "test") return;
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      if (e.key === "Escape") {
        setModalOpen(false);
        setReviewOpen(false);
        return;
      }
      if (modalOpen || reviewOpen) return;
      const cq = questions[current];
      if (!cq) return;
      if (e.key === "ArrowRight") {
        e.preventDefault();
        goNext();
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        goPrev();
      } else if (/^[1-9]$/.test(e.key)) {
        const i = Number(e.key) - 1;
        if (i < cq.options.length) selectAnswer(i);
      } else if (e.key.toLowerCase() === "f") {
        toggleFlag();
      } else if (e.key.toLowerCase() === "r") {
        setReviewOpen((o) => !o);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [
    phase,
    modalOpen,
    reviewOpen,
    questions,
    current,
    goNext,
    goPrev,
    selectAnswer,
    toggleFlag,
  ]);

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
              <Link
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
              </Link>
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
                  flexDirection: "column",
                  gap: 22,
                  padding: "26px 32px 30px",
                }}
              >
                {/* Savol soni */}
                <div>
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

                {/* Rejim (mode) */}
                <div>
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
                    Rejim
                  </p>
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr 1fr",
                      gap: 12,
                    }}
                  >
                    {(
                      [
                        {
                          key: "practice",
                          icon: "🎓",
                          title: "Mashq rejimi",
                          desc: "Har savoldan keyin to'g'ri javob va izoh ko'rsatiladi",
                        },
                        {
                          key: "exam",
                          icon: "📝",
                          title: "Imtihon rejimi",
                          desc: "Natija va izohlar test yakunida ko'rsatiladi",
                        },
                      ] as const
                    ).map((m) => {
                      const sel = mode === m.key;
                      return (
                        <button
                          key={m.key}
                          onClick={() => setMode(m.key)}
                          style={{
                            borderRadius: 18,
                            border: `2px solid ${sel ? "#4f46e5" : "#e2e8f0"}`,
                            background: sel ? "#eef2ff" : "#f8f9fc",
                            padding: 16,
                            cursor: "pointer",
                            textAlign: "left",
                            transition: "all .2s",
                          }}
                        >
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: 8,
                              marginBottom: 7,
                            }}
                          >
                            <span style={{ fontSize: 18 }}>{m.icon}</span>
                            <span
                              style={{
                                fontWeight: 700,
                                fontSize: 14,
                                color: sel ? "#4f46e5" : "#0f172a",
                              }}
                            >
                              {m.title}
                            </span>
                          </div>
                          <p
                            style={{
                              margin: 0,
                              fontSize: 12,
                              lineHeight: 1.45,
                              color: sel ? "#6366f1" : "#94a3b8",
                            }}
                          >
                            {m.desc}
                          </p>
                        </button>
                      );
                    })}
                  </div>
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
                    (e.currentTarget as HTMLElement).style.background = "#4f46e5";
                    (e.currentTarget as HTMLElement).style.transform =
                      "translateY(0)";
                  }}
                >
                  <svg width="16" height="16" fill="white" viewBox="0 0 24 24">
                    <polygon points="5 3 19 12 5 21 5 3" />
                  </svg>
                  {loading ? "Yuklanmoqda..." : "Testni boshlash"}
                </button>
              </div>

              <p
                style={{
                  textAlign: "center",
                  fontSize: 12,
                  color: "#94a3b8",
                  padding: "0 36px 24px",
                }}
              >
                Testni boshlash uchun ro&apos;yxatdan o&apos;tish shart emas
              </p>
            </div>

            <p style={{ textAlign: "center", marginTop: 20, fontSize: 13 }}>
              <Link
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
              </Link>
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

            {/* Answer review (explanations available after completion) */}
            <button
              onClick={() => setReviewAnswers((v) => !v)}
              style={{
                width: "100%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
                background: "#fff",
                border: "1px solid #e2e8f0",
                color: "#475569",
                fontWeight: 700,
                fontSize: 13.5,
                padding: "12px",
                borderRadius: 14,
                cursor: "pointer",
                marginBottom: reviewAnswers ? 16 : 24,
                transition: "all .2s",
              }}
            >
              {reviewAnswers ? "Javoblarni yashirish" : "Javoblarni ko'rib chiqish"}
              <svg
                width="14"
                height="14"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.4"
                viewBox="0 0 24 24"
                style={{
                  transform: reviewAnswers ? "rotate(180deg)" : "none",
                  transition: "transform .2s",
                }}
              >
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </button>

            {reviewAnswers && (
              <div
                style={{
                  textAlign: "left",
                  display: "flex",
                  flexDirection: "column",
                  gap: 10,
                  maxHeight: 360,
                  overflowY: "auto",
                  marginBottom: 24,
                  paddingRight: 4,
                }}
              >
                {questions.map((qq, i) => {
                  const ua = answers[i];
                  const ok = ua !== null && ua === qq.answer;
                  return (
                    <div
                      key={i}
                      style={{
                        border: `1px solid ${ok ? "#bbf7d0" : ua === null ? "#e2e8f0" : "#fecdd3"}`,
                        background: ok
                          ? "#f0fdf4"
                          : ua === null
                            ? "#f8fafc"
                            : "#fff1f2",
                        borderRadius: 14,
                        padding: "12px 14px",
                      }}
                    >
                      <div
                        style={{ display: "flex", gap: 9, alignItems: "flex-start" }}
                      >
                        <span
                          style={{
                            flexShrink: 0,
                            width: 22,
                            height: 22,
                            borderRadius: 7,
                            display: "grid",
                            placeItems: "center",
                            fontSize: 11,
                            fontWeight: 800,
                            background: ok
                              ? "#22c55e"
                              : ua === null
                                ? "#cbd5e1"
                                : "#ef4444",
                            color: "#fff",
                          }}
                        >
                          {i + 1}
                        </span>
                        <p
                          style={{
                            margin: 0,
                            fontSize: 13,
                            fontWeight: 600,
                            color: "#0f172a",
                            lineHeight: 1.45,
                          }}
                        >
                          {qq.question}
                        </p>
                      </div>
                      <div
                        style={{
                          marginTop: 8,
                          fontSize: 12.5,
                          color: "#475569",
                          lineHeight: 1.5,
                        }}
                      >
                        <div>
                          Sizning javob:{" "}
                          <strong style={{ color: ok ? "#15803d" : "#be123c" }}>
                            {ua !== null
                              ? `${String.fromCharCode(65 + ua)}. ${qq.options[ua]}`
                              : "—"}
                          </strong>
                        </div>
                        {!ok && (
                          <div style={{ color: "#15803d" }}>
                            To&apos;g&apos;ri javob:{" "}
                            <strong>
                              {String.fromCharCode(65 + qq.answer)}.{" "}
                              {qq.options[qq.answer]}
                            </strong>
                          </div>
                        )}
                      </div>
                      {qq.explanation && (
                        <p
                          style={{
                            margin: "8px 0 0",
                            fontSize: 12,
                            color: "#64748b",
                            lineHeight: 1.5,
                            background: "#fff",
                            border: "1px solid #eef1f6",
                            borderRadius: 10,
                            padding: "8px 10px",
                          }}
                        >
                          💡 {qq.explanation}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* Buttons */}
            <div style={{ display: "flex", gap: 12 }}>
              <Link
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
              </Link>
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
  const isLast = current === questions.length - 1;
  const isFlagged = !!flagged[current];
  const revealed = mode === "practice" && answered;
  const answerCorrect = selected !== null && selected === q?.answer;
  const timeWarn = timeLeft <= 60;
  const answeredCount = answers.filter((a) => a !== null).length;
  const flaggedCount = flagged.filter(Boolean).length;
  const progressPct = questions.length
    ? (answeredCount / questions.length) * 100
    : 0;

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,600&display=swap');
        .fs{font-family:'Syne',sans-serif;font-weight:800}
        .fb{font-family:'DM Sans',sans-serif}
        @keyframes qIn{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:none}}
        .q-enter{animation:qIn .35s cubic-bezier(.22,1,.36,1)}
        @keyframes fbIn{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:none}}
        .fb-in{animation:fbIn .3s ease}
        @keyframes popIn{from{transform:scale(.6);opacity:0}to{transform:scale(1);opacity:1}}
        .pop{animation:popIn .25s cubic-bezier(.34,1.56,.64,1)}

        .ans-card{appearance:none;font-family:inherit}
        .ans-card:not(:disabled){cursor:pointer}
        .ans-card:not(:disabled):hover{border-color:#4f46e5 !important;background:#f5f6ff !important;transform:translateY(-2px);box-shadow:0 10px 24px rgba(79,70,229,.13) !important}
        .ans-card:not(:disabled):active{transform:translateY(0) scale(.994)}
        .ans-card:focus-visible{outline:3px solid rgba(79,70,229,.45);outline-offset:2px}

        .exam-icon-btn{display:flex;align-items:center;justify-content:center;width:38px;height:38px;border-radius:12px;border:1px solid #e6e9f0;background:#fff;color:#475569;cursor:pointer;flex-shrink:0;transition:all .18s}
        .exam-icon-btn:hover{background:#f1f5f9;color:#0f172a}
        .exam-ghost-btn{display:flex;align-items:center;gap:7px;padding:8px 13px;border-radius:12px;border:1px solid #e6e9f0;background:#fff;color:#475569;font-size:13.5px;font-weight:700;cursor:pointer;transition:all .18s}
        .exam-ghost-btn:hover{background:#f1f5f9;color:#0f172a;border-color:#dbe1ec}

        .exam-timer{transition:all .3s}
        @keyframes tpulse{0%,100%{box-shadow:0 0 0 0 rgba(239,68,68,.35)}50%{box-shadow:0 0 0 7px rgba(239,68,68,0)}}
        .timer-pulse{animation:tpulse 1.1s ease-in-out infinite}

        .nav-btn{display:flex;align-items:center;gap:8px;padding:13px 20px;border-radius:14px;font-size:14px;font-weight:700;cursor:pointer;transition:all .18s;font-family:inherit}
        .nav-ghost{border:1.5px solid #e2e8f0;background:#fff;color:#334155}
        .nav-ghost:not(:disabled):hover{border-color:#cbd5e1;background:#f8f9fc}
        .nav-ghost:disabled{opacity:.4;cursor:not-allowed}
        .nav-primary{border:none;background:#4f46e5;color:#fff;box-shadow:0 6px 18px rgba(79,70,229,.28)}
        .nav-primary:hover{background:#4338ca;transform:translateY(-1px);box-shadow:0 10px 24px rgba(79,70,229,.34)}
        .nav-finish{border:none;background:#16a34a;color:#fff;box-shadow:0 6px 18px rgba(22,163,74,.28)}
        .nav-finish:hover{background:#15803d;transform:translateY(-1px);box-shadow:0 10px 24px rgba(22,163,74,.34)}

        .flag-btn{display:flex;align-items:center;justify-content:center;width:36px;height:36px;border-radius:11px;border:1px solid #e6e9f0;background:#fff;cursor:pointer;flex-shrink:0;transition:all .18s}
        .flag-btn:hover{background:#fffbeb;border-color:#fde68a}

        .rev-overlay{position:fixed;inset:0;background:rgba(15,23,42,.45);backdrop-filter:blur(2px);opacity:0;pointer-events:none;transition:opacity .3s;z-index:55}
        .rev-overlay.open{opacity:1;pointer-events:auto}
        .rev-drawer{position:fixed;top:0;right:0;height:100%;width:min(370px,87vw);background:#fff;box-shadow:-24px 0 60px rgba(15,23,42,.2);transform:translateX(100%);transition:transform .38s cubic-bezier(.22,1,.36,1);z-index:60;display:flex;flex-direction:column}
        .rev-drawer.open{transform:none}
        .rev-cell{position:relative;height:46px;border-radius:12px;font-size:13.5px;font-weight:800;cursor:pointer;transition:all .15s;font-family:inherit}
        .rev-cell:hover{transform:translateY(-2px)}

        .hide-sm{display:inline}
        @media (max-width:560px){.hide-sm{display:none}}
        @media (prefers-reduced-motion:reduce){
          .q-enter,.fb-in,.pop,.timer-pulse{animation:none}
          .ans-card,.nav-btn,.rev-cell{transition:none}
        }
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
        {/* ── HEADER: position · timer · progress ── */}
        <header
          style={{
            position: "sticky",
            top: 0,
            zIndex: 40,
            background: "rgba(255,255,255,.82)",
            backdropFilter: "blur(20px)",
            WebkitBackdropFilter: "blur(20px)",
            borderBottom: "1px solid #e9edf5",
          }}
        >
          <div
            style={{ maxWidth: 760, margin: "0 auto", padding: "12px 20px 0" }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              {/* exit */}
              <button
                onClick={exitTest}
                aria-label="Testdan chiqish"
                className="exam-icon-btn"
              >
                <svg
                  width="17"
                  height="17"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.4"
                  strokeLinecap="round"
                  viewBox="0 0 24 24"
                >
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>

              {/* position + mode */}
              <div
                style={{
                  display: "flex",
                  alignItems: "baseline",
                  gap: 7,
                  flexShrink: 0,
                  whiteSpace: "nowrap",
                }}
              >
                <span
                  className="fs"
                  style={{
                    fontSize: 17,
                    color: "#0f172a",
                    letterSpacing: "-0.02em",
                    whiteSpace: "nowrap",
                  }}
                >
                  Savol {current + 1}
                </span>
                <span
                  style={{ fontSize: 14, fontWeight: 600, color: "#a3acc2" }}
                >
                  / {questions.length}
                </span>
                <span
                  className="hide-sm"
                  style={{
                    marginLeft: 4,
                    fontSize: 10.5,
                    fontWeight: 800,
                    letterSpacing: "0.06em",
                    textTransform: "uppercase",
                    padding: "3px 8px",
                    borderRadius: 999,
                    background: mode === "exam" ? "#fff7ed" : "#eef2ff",
                    color: mode === "exam" ? "#c2410c" : "#4338ca",
                    border: `1px solid ${mode === "exam" ? "#fed7aa" : "#c7d2fe"}`,
                  }}
                >
                  {mode === "exam" ? "Imtihon" : "Mashq"}
                </span>
              </div>

              <div style={{ flex: 1 }} />

              {/* review */}
              <button
                onClick={() => setReviewOpen(true)}
                className="exam-ghost-btn"
              >
                <svg
                  width="15"
                  height="15"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  viewBox="0 0 24 24"
                >
                  <rect x="3" y="3" width="7" height="7" rx="1.5" />
                  <rect x="14" y="3" width="7" height="7" rx="1.5" />
                  <rect x="3" y="14" width="7" height="7" rx="1.5" />
                  <rect x="14" y="14" width="7" height="7" rx="1.5" />
                </svg>
                <span className="hide-sm">Savollar</span>
              </button>

              {/* TIMER */}
              <div
                className={timeWarn ? "exam-timer timer-pulse" : "exam-timer"}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "8px 14px",
                  borderRadius: 14,
                  background: timeWarn ? "#fef2f2" : "#eef2ff",
                  border: `1px solid ${timeWarn ? "#fecaca" : "#d7daff"}`,
                  color: timeWarn ? "#dc2626" : "#312e81",
                }}
              >
                <svg
                  width="16"
                  height="16"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.2"
                  viewBox="0 0 24 24"
                >
                  <circle cx="12" cy="12" r="9" />
                  <polyline points="12 7 12 12 15 14" />
                </svg>
                <span
                  style={{
                    fontSize: 18,
                    fontWeight: 800,
                    fontVariantNumeric: "tabular-nums",
                    letterSpacing: "0.02em",
                    lineHeight: 1,
                  }}
                >
                  {fmtTime(timeLeft)}
                </span>
                <span
                  className="hide-sm"
                  style={{ fontSize: 11, fontWeight: 700, opacity: 0.6 }}
                >
                  qoldi
                </span>
              </div>
            </div>

            {/* progress */}
            <div style={{ padding: "11px 0 12px" }}>
              <div
                style={{
                  height: 6,
                  background: "#e9edf5",
                  borderRadius: 999,
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    height: "100%",
                    width: `${progressPct}%`,
                    background: "linear-gradient(90deg,#6366f1,#4f46e5)",
                    borderRadius: 999,
                    transition: "width .5s cubic-bezier(.22,1,.36,1)",
                  }}
                />
              </div>
            </div>
          </div>
        </header>

        {/* ── MAIN CONTENT ── */}
        <main
          style={{
            flex: 1,
            maxWidth: 760,
            margin: "0 auto",
            width: "100%",
            padding: "24px 20px 132px",
          }}
        >
          <div key={current} className="q-enter">

          {/* ── Question card (text → image) ── */}
          <section
            style={{
              background: "#fff",
              borderRadius: 24,
              border: "1px solid #eceff5",
              boxShadow: "0 4px 22px rgba(15,23,42,.05)",
              padding: q.image ? "24px 24px 20px" : "30px 26px",
            }}
          >
            <div style={{ display: "flex", alignItems: "flex-start", gap: 14 }}>
              <span
                className="fs"
                style={{
                  flexShrink: 0,
                  fontSize: 13,
                  color: "#4f46e5",
                  background: "#eef2ff",
                  border: "1px solid #e0e7ff",
                  borderRadius: 10,
                  padding: "5px 11px",
                  lineHeight: 1,
                  marginTop: 4,
                }}
              >
                {current + 1}
              </span>
              <p
                style={{
                  flex: 1,
                  margin: 0,
                  fontSize: "clamp(19px, 2.3vw, 25px)",
                  fontWeight: 700,
                  lineHeight: 1.5,
                  letterSpacing: "-0.01em",
                  color: "#0f172a",
                }}
              >
                {q.question}
              </p>
              <button
                onClick={toggleFlag}
                className="flag-btn"
                aria-pressed={isFlagged}
                aria-label={
                  isFlagged ? "Belgini olib tashlash" : "Savolni belgilash"
                }
                title="Belgilash (F)"
                style={{
                  background: isFlagged ? "#fffbeb" : "#fff",
                  borderColor: isFlagged ? "#fde68a" : "#e6e9f0",
                }}
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill={isFlagged ? "#f59e0b" : "none"}
                  stroke={isFlagged ? "#f59e0b" : "#cbd5e1"}
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M4 21V4h13l-2 4 2 4H4" />
                </svg>
              </button>
            </div>

            {q.image ? (
              <button
                onClick={() => {
                  setModalImage(imgUrl(q.image));
                  setModalOpen(true);
                }}
                aria-label="Rasmni kattalashtirish"
                style={{
                  display: "block",
                  width: "100%",
                  marginTop: 18,
                  padding: 8,
                  borderRadius: 18,
                  border: "1px solid #eceff5",
                  background: "#f7f8fb",
                  cursor: "zoom-in",
                }}
              >
                <Image
                  src={imgUrl(q.image) ?? ""}
                  alt="Savol rasmi"
                  width={800}
                  height={600}
                  loading="lazy"
                  style={{
                    width: "100%",
                    height: "auto",
                    display: "block",
                    objectFit: "contain",
                    maxHeight: 380,
                    borderRadius: 12,
                  }}
                />
              </button>
            ) : (
              <div
                style={{
                  marginTop: 18,
                  padding: "14px 16px",
                  borderRadius: 18,
                  border: "1px dashed #d0d5e8",
                  background: "#f7f8fb",
                  color: "#9aa3b8",
                  fontSize: 14,
                  textAlign: "center",
                }}
              >
                Bu savol uchun rasm yuklanmagan
              </div>
            )}
          </section>

          {/* ── Answers ── */}
          <div
            role="radiogroup"
            aria-label="Javob variantlari"
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 12,
              marginTop: 18,
            }}
          >
            {q.options.map((opt, idx) => {
              const isSelected = selected === idx;
              const isCorrect = idx === q.answer;
              const isWrongSel = revealed && isSelected && !isCorrect;
              const showCorrect = revealed && isCorrect;

              let border = "#e6e9f0";
              let bg = "#fff";
              let letterBg = "#f1f5f9";
              let letterC = "#64748b";
              let textC = "#1e293b";
              let shadow = "0 1px 2px rgba(15,23,42,.04)";
              let opacity = 1;

              if (revealed) {
                if (isCorrect) {
                  border = "#86efac";
                  bg = "#f0fdf4";
                  letterBg = "#22c55e";
                  letterC = "#fff";
                  textC = "#14532d";
                  shadow = "0 8px 22px rgba(34,197,94,.16)";
                } else if (isWrongSel) {
                  border = "#fca5a5";
                  bg = "#fef2f2";
                  letterBg = "#ef4444";
                  letterC = "#fff";
                  textC = "#7f1d1d";
                  shadow = "0 8px 22px rgba(239,68,68,.14)";
                } else {
                  opacity = 0.5;
                }
              } else if (isSelected) {
                border = "#4f46e5";
                bg = "#eef2ff";
                letterBg = "#4f46e5";
                letterC = "#fff";
                textC = "#1e1b4b";
                shadow = "0 8px 22px rgba(79,70,229,.18)";
              }

              return (
                <button
                  key={idx}
                  className="ans-card"
                  role="radio"
                  aria-checked={isSelected}
                  disabled={revealed}
                  onClick={() => selectAnswer(idx)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 15,
                    width: "100%",
                    textAlign: "left",
                    padding: "17px 18px",
                    borderRadius: 16,
                    border: `1.5px solid ${border}`,
                    background: bg,
                    boxShadow: shadow,
                    opacity,
                    transition:
                      "border-color .18s, background .18s, box-shadow .18s, transform .18s, opacity .18s",
                  }}
                >
                  <span
                    className={showCorrect || isWrongSel ? "pop" : undefined}
                    style={{
                      width: 38,
                      height: 38,
                      flexShrink: 0,
                      borderRadius: 11,
                      background: letterBg,
                      color: letterC,
                      display: "grid",
                      placeItems: "center",
                      fontWeight: 800,
                      fontSize: 15,
                      transition: "all .18s",
                    }}
                  >
                    {showCorrect ? (
                      <svg
                        width="17"
                        height="17"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="3"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        viewBox="0 0 24 24"
                      >
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    ) : isWrongSel ? (
                      <svg
                        width="15"
                        height="15"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="3"
                        strokeLinecap="round"
                        viewBox="0 0 24 24"
                      >
                        <line x1="18" y1="6" x2="6" y2="18" />
                        <line x1="6" y1="6" x2="18" y2="18" />
                      </svg>
                    ) : (
                      String.fromCharCode(65 + idx)
                    )}
                  </span>
                  <span
                    style={{
                      flex: 1,
                      fontSize: 16,
                      fontWeight: 600,
                      lineHeight: 1.45,
                      color: textC,
                    }}
                  >
                    {opt}
                  </span>
                  {showCorrect && (
                    <span
                      style={{
                        flexShrink: 0,
                        fontSize: 12,
                        fontWeight: 800,
                        color: "#16a34a",
                        background: "#dcfce7",
                        padding: "4px 11px",
                        borderRadius: 999,
                      }}
                    >
                      To&apos;g&apos;ri
                    </span>
                  )}
                  {isWrongSel && (
                    <span
                      style={{
                        flexShrink: 0,
                        fontSize: 12,
                        fontWeight: 800,
                        color: "#dc2626",
                        background: "#fee2e2",
                        padding: "4px 11px",
                        borderRadius: 999,
                      }}
                    >
                      Sizning javob
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* ── Feedback (practice mode) ── */}
          {revealed && (
            <div
              className="fb-in"
              style={{
                marginTop: 16,
                borderRadius: 18,
                border: `1px solid ${answerCorrect ? "#bbf7d0" : "#fecdd3"}`,
                background: answerCorrect ? "#f0fdf4" : "#fff1f2",
                padding: "16px 18px",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span
                  style={{
                    width: 26,
                    height: 26,
                    borderRadius: "50%",
                    flexShrink: 0,
                    display: "grid",
                    placeItems: "center",
                    background: answerCorrect ? "#22c55e" : "#ef4444",
                    color: "#fff",
                  }}
                >
                  {answerCorrect ? (
                    <svg
                      width="13"
                      height="13"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="3.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      viewBox="0 0 24 24"
                    >
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  ) : (
                    <svg
                      width="11"
                      height="11"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="3.5"
                      strokeLinecap="round"
                      viewBox="0 0 24 24"
                    >
                      <line x1="18" y1="6" x2="6" y2="18" />
                      <line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                  )}
                </span>
                <span
                  style={{
                    fontWeight: 800,
                    fontSize: 15,
                    color: answerCorrect ? "#15803d" : "#be123c",
                  }}
                >
                  {answerCorrect ? "To'g'ri javob!" : "Noto'g'ri javob"}
                </span>
                {!answerCorrect && (
                  <span
                    style={{ fontSize: 13, fontWeight: 600, color: "#9f1239" }}
                  >
                    · To&apos;g&apos;ri: {String.fromCharCode(65 + q.answer)}
                  </span>
                )}
              </div>
              {q.explanation && (
                <div
                  style={{
                    display: "flex",
                    gap: 9,
                    marginTop: 12,
                    paddingTop: 12,
                    borderTop: `1px solid ${answerCorrect ? "#bbf7d0" : "#fecdd3"}`,
                  }}
                >
                  <span style={{ fontSize: 15, flexShrink: 0 }}>💡</span>
                  <p
                    style={{
                      margin: 0,
                      fontSize: 14,
                      lineHeight: 1.6,
                      color: "#334155",
                    }}
                  >
                    <strong style={{ color: "#0f172a" }}>Izoh:</strong>{" "}
                    {q.explanation}
                  </p>
                </div>
              )}
            </div>
          )}
          </div>
        </main>

        {/* ── BOTTOM ACTION BAR ── */}
        <div
          style={{
            position: "fixed",
            bottom: 0,
            left: 0,
            right: 0,
            zIndex: 35,
            background: "rgba(255,255,255,.88)",
            backdropFilter: "blur(20px)",
            WebkitBackdropFilter: "blur(20px)",
            borderTop: "1px solid #e9edf5",
            boxShadow: "0 -6px 24px rgba(15,23,42,.05)",
          }}
        >
          <div
            style={{
              maxWidth: 760,
              margin: "0 auto",
              padding: "14px 20px",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 12,
            }}
          >
            <button
              onClick={goPrev}
              disabled={current === 0}
              className="nav-btn nav-ghost"
            >
              <svg
                width="15"
                height="15"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                viewBox="0 0 24 24"
              >
                <polyline points="15 18 9 12 15 6" />
              </svg>
              <span className="hide-sm">Oldingi</span>
            </button>

            <span
              style={{
                fontSize: 13.5,
                fontWeight: 700,
                color: "#64748b",
                fontVariantNumeric: "tabular-nums",
              }}
            >
              Savol {current + 1} / {questions.length}
            </span>

            {isLast ? (
              <button
                onClick={() => finishTest()}
                className="nav-btn nav-finish"
              >
                Testni yakunlash
                <svg
                  width="15"
                  height="15"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  viewBox="0 0 24 24"
                >
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </button>
            ) : (
              <button onClick={goNext} className="nav-btn nav-primary">
                <span className="hide-sm">Keyingi</span>
                <svg
                  width="15"
                  height="15"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  viewBox="0 0 24 24"
                >
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </button>
            )}
          </div>
        </div>

        {/* ── REVIEW QUESTIONS DRAWER ── */}
        <div
          className={`rev-overlay ${reviewOpen ? "open" : ""}`}
          style={{
            opacity: reviewOpen ? 1 : 0,
            pointerEvents: reviewOpen ? "auto" : "none",
          }}
          onClick={() => setReviewOpen(false)}
        />
        <aside
          className={`rev-drawer ${reviewOpen ? "open" : ""}`}
          style={{ transform: reviewOpen ? "translateX(0)" : "translateX(100%)" }}
          role="dialog"
          aria-modal="true"
          aria-label="Savollarni ko'rish"
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "20px 22px 16px",
              borderBottom: "1px solid #eef1f6",
            }}
          >
            <div>
              <h3
                className="fs"
                style={{
                  margin: 0,
                  fontSize: 19,
                  color: "#0f172a",
                  letterSpacing: "-0.02em",
                }}
              >
                Savollar
              </h3>
              <p style={{ margin: "3px 0 0", fontSize: 13, color: "#94a3b8" }}>
                {answeredCount} / {questions.length} javob berilgan
              </p>
            </div>
            <button
              onClick={() => setReviewOpen(false)}
              className="exam-icon-btn"
              aria-label="Yopish"
            >
              <svg
                width="17"
                height="17"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.4"
                strokeLinecap="round"
                viewBox="0 0 24 24"
              >
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>

          {/* legend */}
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: "10px 16px",
              padding: "14px 22px",
              borderBottom: "1px solid #eef1f6",
            }}
          >
            {[
              { c: "#4f46e5", b: "#4f46e5", l: "Joriy" },
              { c: "#eef2ff", b: "#c7d2fe", l: "Javob berilgan" },
              { c: "#fff", b: "#e2e8f0", l: "Javobsiz" },
              { c: "#fffbeb", b: "#fbbf24", l: "Belgilangan" },
            ].map((x, i) => (
              <div
                key={i}
                style={{ display: "flex", alignItems: "center", gap: 7 }}
              >
                <span
                  style={{
                    width: 14,
                    height: 14,
                    borderRadius: 5,
                    background: x.c,
                    border: `1.5px solid ${x.b}`,
                  }}
                />
                <span
                  style={{ fontSize: 12, fontWeight: 600, color: "#64748b" }}
                >
                  {x.l}
                </span>
              </div>
            ))}
          </div>

          {/* grid */}
          <div style={{ flex: 1, overflowY: "auto", padding: 22 }}>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(5, 1fr)",
                gap: 10,
              }}
            >
              {questions.map((_, i) => {
                const ans = answers[i] !== null;
                const cur = i === current;
                const fl = flagged[i];
                let bg = "#fff";
                let bd = "#e2e8f0";
                let col = "#94a3b8";
                if (cur) {
                  bg = "#4f46e5";
                  bd = "#4f46e5";
                  col = "#fff";
                } else if (ans) {
                  bg = "#eef2ff";
                  bd = "#c7d2fe";
                  col = "#4338ca";
                }
                if (fl && !cur) bd = "#fbbf24";
                return (
                  <button
                    key={i}
                    className="rev-cell"
                    onClick={() => {
                      setCurrent(i);
                      setReviewOpen(false);
                    }}
                    style={{
                      background: bg,
                      border: `1.5px solid ${bd}`,
                      color: col,
                      boxShadow: cur ? "0 6px 16px rgba(79,70,229,.3)" : "none",
                    }}
                    aria-label={`Savol ${i + 1}${ans ? ", javob berilgan" : ""}${fl ? ", belgilangan" : ""}`}
                  >
                    {i + 1}
                    {fl && (
                      <span
                        style={{
                          position: "absolute",
                          top: -6,
                          right: -6,
                          width: 16,
                          height: 16,
                          borderRadius: "50%",
                          background: "#f59e0b",
                          border: "2px solid #fff",
                          display: "grid",
                          placeItems: "center",
                        }}
                      >
                        <svg
                          width="8"
                          height="8"
                          viewBox="0 0 24 24"
                          fill="#fff"
                          stroke="#fff"
                          strokeWidth="2"
                        >
                          <path d="M4 21V4h13l-2 4 2 4H4" />
                        </svg>
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          <div
            style={{
              padding: "16px 22px",
              borderTop: "1px solid #eef1f6",
              display: "flex",
              alignItems: "center",
              gap: 10,
            }}
          >
            <span
              style={{
                flex: 1,
                fontSize: 12.5,
                fontWeight: 700,
                color: "#94a3b8",
              }}
            >
              {flaggedCount > 0
                ? `${flaggedCount} ta belgilangan`
                : "Belgilangan savol yo'q"}
            </span>
            <button
              onClick={() => {
                setReviewOpen(false);
                finishTest();
              }}
              className="nav-btn nav-finish"
              style={{ padding: "11px 16px", fontSize: 13.5 }}
            >
              Yakunlash
            </button>
          </div>
        </aside>

        {modalOpen && modalImage && (
          <div
            onClick={() => setModalOpen(false)}
            style={{
              position: "fixed",
              inset: 0,
              background: "rgba(0,0,0,.7)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              zIndex: 100,
              padding: 16,
              backdropFilter: "blur(4px)",
            }}
          >
            <div
              onClick={(e) => e.stopPropagation()}
              style={{
                position: "relative",
                background: "white",
                borderRadius: 20,
                overflow: "hidden",
                maxWidth: "90vw",
                maxHeight: "90vh",
                display: "flex",
                flexDirection: "column",
                boxShadow: "0 20px 60px rgba(0,0,0,.3)",
              }}
            >
              <button
                onClick={() => setModalOpen(false)}
                style={{
                  position: "absolute",
                  top: 12,
                  right: 12,
                  width: 36,
                  height: 36,
                  borderRadius: "50%",
                  background: "rgba(255,255,255,.95)",
                  border: "none",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  zIndex: 10,
                  transition: "all .2s",
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLElement).style.background =
                    "rgba(255,255,255,1)";
                  (e.currentTarget as HTMLElement).style.transform = "scale(1.1)";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLElement).style.background =
                    "rgba(255,255,255,.95)";
                  (e.currentTarget as HTMLElement).style.transform = "scale(1)";
                }}
              >
                <svg
                  width="18"
                  height="18"
                  fill="none"
                  stroke="#0f172a"
                  strokeWidth="2.5"
                  viewBox="0 0 24 24"
                >
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>

              <div
                style={{
                  flex: 1,
                  overflow: "auto",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Image
                  src={modalImage}
                  alt="Kattalashtirilgan rasm"
                  width={1400}
                  height={1000}
                  style={{
                    width: "auto",
                    height: "auto",
                    maxWidth: "100%",
                    maxHeight: "100%",
                    objectFit: "contain",
                  }}
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
