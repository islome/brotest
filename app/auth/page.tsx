"use client";
import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase-browser";

type Mode = "login" | "signup";
const MAX_ATTEMPTS = 5;
const BLOCK_MINUTES = 15;

export default function AuthPage() {
  const router = useRouter();
  const supabase = createClient();
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

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

  useEffect(() => {
    setTimeout(() => setVis(true), 60);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  function anim(delay: number): React.CSSProperties {
    return {
      opacity: vis ? 1 : 0,
      transform: vis ? "translateY(0)" : "translateY(20px)",
      transition: `opacity 0.55s ease ${delay}ms, transform 0.55s cubic-bezier(0.22,1,0.36,1) ${delay}ms`,
    };
  }

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
    }, 160);
  }

  async function checkBlocked(): Promise<boolean> {
    const res = await fetch("/api/auth-attempts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "check",
        email: `${username}@autotest.uz`,
      }),
    });
    const d = await res.json();
    if (d.isBlocked) {
      startBlockTimer();
      setAttempts(d.attempts);
    }
    return d.isBlocked;
  }

  async function recordFail() {
    const res = await fetch("/api/auth-attempts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "record",
        email: `${username}@autotest.uz`,
      }),
    });
    const d = await res.json();
    setAttempts(d.attempts);
    if (d.isBlocked) startBlockTimer();
    return d.attempts as number;
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
      const data = await res.json();

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

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,600&display=swap');
        .fs { font-family: 'Syne', sans-serif; font-weight: 800; }
        .fb { font-family: 'DM Sans', sans-serif; }
        input:-webkit-autofill { -webkit-box-shadow: 0 0 0px 1000px #f8f9fc inset !important; }
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
        <div style={{ width: "100%", maxWidth: 440 }}>
          {/* Logo */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              marginBottom: 32,
              ...anim(0),
            }}
          >
            <a
              href="/"
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 12,
                textDecoration: "none",
              }}
            >
              <div
                style={{
                  width: 52,
                  height: 52,
                  background: "#4f46e5",
                  borderRadius: 18,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  boxShadow: "0 8px 24px rgba(79,70,229,.4)",
                }}
              >
                <svg
                  width="22"
                  height="22"
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
                  fontSize: 24,
                  color: "#0f172a",
                  letterSpacing: "-0.025em",
                }}
              >
                Autotest
              </span>
            </a>
            <p
              style={{
                fontSize: 13,
                color: "#94a3b8",
                marginTop: 4,
                letterSpacing: "0.06em",
                textTransform: "uppercase",
              }}
            >
              Haydovchilik testlari
            </p>
          </div>

          {/* Card */}
          <div
            style={{
              background: "white",
              borderRadius: 28,
              border: "1px solid #e2e8f0",
              boxShadow: "0 4px 24px rgba(0,0,0,.06)",
              overflow: "hidden",
              ...anim(80),
            }}
          >
            {/* Tab header */}
            <div
              style={{
                display: "flex",
                borderBottom: "1px solid #f1f5f9",
                position: "relative",
              }}
            >
              {(["login", "signup"] as Mode[]).map((m) => (
                <button
                  key={m}
                  onClick={() => switchMode(m)}
                  style={{
                    flex: 1,
                    padding: "16px",
                    border: "none",
                    background: "transparent",
                    fontSize: 14,
                    fontWeight: 600,
                    color: mode === m ? "#4f46e5" : "#94a3b8",
                    cursor: "pointer",
                    transition: "color .2s",
                    position: "relative",
                  }}
                >
                  {m === "login" ? "Kirish" : "Ro'yxatdan o'tish"}
                  {mode === m && (
                    <span
                      style={{
                        position: "absolute",
                        bottom: 0,
                        left: 20,
                        right: 20,
                        height: 2,
                        background: "linear-gradient(90deg,#6366f1,#4f46e5)",
                        borderRadius: "2px 2px 0 0",
                      }}
                    />
                  )}
                </button>
              ))}
            </div>

            <div style={{ padding: "28px 32px 32px" }}>
              {/* Blocked */}
              {isBlocked && (
                <div
                  style={{
                    background: "#fff7ed",
                    border: "1px solid #fed7aa",
                    borderRadius: 16,
                    padding: "20px",
                    marginBottom: 20,
                    textAlign: "center",
                  }}
                >
                  <div
                    style={{
                      width: 36,
                      height: 36,
                      background: "#ffedd5",
                      borderRadius: "50%",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      margin: "0 auto 10px",
                    }}
                  >
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
                  <p
                    style={{
                      fontSize: 13,
                      fontWeight: 600,
                      color: "#c2410c",
                      marginBottom: 6,
                    }}
                  >
                    Hisob vaqtincha bloklandi
                  </p>
                  <p
                    className="fs"
                    style={{
                      fontSize: 36,
                      color: "#ea580c",
                      letterSpacing: "0.04em",
                      lineHeight: 1,
                      marginBottom: 6,
                    }}
                  >
                    {fmt(blockSecs)}
                  </p>
                  <p style={{ fontSize: 12, color: "#fb923c" }}>
                    5 ta noto'g'ri urinishdan keyin blok
                  </p>
                </div>
              )}

              {/* Error */}
              {error && !isBlocked && (
                <div
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: 10,
                    background: "#fff1f2",
                    border: "1px solid #fecdd3",
                    borderRadius: 14,
                    padding: "12px 16px",
                    marginBottom: 18,
                  }}
                >
                  <svg
                    width="15"
                    height="15"
                    fill="none"
                    stroke="#ef4444"
                    strokeWidth="2"
                    viewBox="0 0 24 24"
                    style={{ flexShrink: 0, marginTop: 1 }}
                  >
                    <circle cx="12" cy="12" r="10" />
                    <line x1="15" y1="9" x2="9" y2="15" />
                    <line x1="9" y1="9" x2="15" y2="15" />
                  </svg>
                  <span
                    style={{ fontSize: 13, color: "#be123c", lineHeight: 1.5 }}
                  >
                    {error}
                  </span>
                </div>
              )}

              {/* Success */}
              {success && (
                <div
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: 10,
                    background: "#f0fdf4",
                    border: "1px solid #bbf7d0",
                    borderRadius: 14,
                    padding: "12px 16px",
                    marginBottom: 18,
                  }}
                >
                  <svg
                    width="15"
                    height="15"
                    fill="none"
                    stroke="#22c55e"
                    strokeWidth="2"
                    viewBox="0 0 24 24"
                    style={{ flexShrink: 0, marginTop: 1 }}
                  >
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  <span
                    style={{ fontSize: 13, color: "#15803d", lineHeight: 1.5 }}
                  >
                    {success}
                  </span>
                </div>
              )}

              {/* Form */}
              <form onSubmit={handleSubmit}>
                <div
                  style={{
                    opacity: fading ? 0 : 1,
                    transform: fading ? "translateY(6px)" : "translateY(0)",
                    transition: "opacity .16s, transform .16s",
                    display: "flex",
                    flexDirection: "column",
                    gap: 14,
                  }}
                >
                  {/* Signup fields */}
                  {mode === "signup" && (
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "1fr 1fr",
                        gap: 12,
                      }}
                    >
                      {[
                        {
                          label: "Ism",
                          val: firstname,
                          set: setFirstname,
                          ph: "Ali",
                          ac: "given-name",
                        },
                        {
                          label: "Familiya",
                          val: lastname,
                          set: setLastname,
                          ph: "Karimov",
                          ac: "family-name",
                        },
                      ].map((f) => (
                        <div key={f.label}>
                          <label
                            style={{
                              display: "block",
                              fontSize: 11,
                              fontWeight: 700,
                              color: "#64748b",
                              letterSpacing: "0.06em",
                              textTransform: "uppercase",
                              marginBottom: 7,
                            }}
                          >
                            {f.label}
                          </label>
                          <input
                            type="text"
                            placeholder={f.ph}
                            value={f.val}
                            onChange={(e) => f.set(e.target.value)}
                            autoComplete={f.ac}
                            disabled={loading}
                            style={inputStyle()}
                            onFocus={(e) =>
                              (e.currentTarget.style.borderColor = "#6366f1")
                            }
                            onBlur={(e) =>
                              (e.currentTarget.style.borderColor = "#e2e8f0")
                            }
                          />
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Username */}
                  <div>
                    <label style={labelStyle}>Username</label>
                    <div style={{ position: "relative" }}>
                      <span
                        style={{
                          position: "absolute",
                          left: 14,
                          top: "50%",
                          transform: "translateY(-50%)",
                          color: "#94a3b8",
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
                        style={{ ...inputStyle(), paddingLeft: 40 }}
                        onFocus={(e) =>
                          (e.currentTarget.style.borderColor = "#6366f1")
                        }
                        onBlur={(e) =>
                          (e.currentTarget.style.borderColor = "#e2e8f0")
                        }
                      />
                    </div>
                    {mode === "signup" &&
                      username.length > 0 &&
                      username.length < 3 && (
                        <p
                          style={{
                            fontSize: 12,
                            color: "#f59e0b",
                            marginTop: 5,
                          }}
                        >
                          Kamida 3 ta belgi kerak
                        </p>
                      )}
                  </div>

                  {/* Password */}
                  <div>
                    <label style={labelStyle}>Parol</label>
                    <div style={{ position: "relative" }}>
                      <span
                        style={{
                          position: "absolute",
                          left: 14,
                          top: "50%",
                          transform: "translateY(-50%)",
                          color: "#94a3b8",
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
                          mode === "login" ? "current-password" : "new-password"
                        }
                        disabled={loading || isBlocked}
                        required
                        minLength={6}
                        style={{
                          ...inputStyle(),
                          paddingLeft: 40,
                          paddingRight: 44,
                        }}
                        onFocus={(e) =>
                          (e.currentTarget.style.borderColor = "#6366f1")
                        }
                        onBlur={(e) =>
                          (e.currentTarget.style.borderColor = "#e2e8f0")
                        }
                      />
                      <button
                        type="button"
                        tabIndex={-1}
                        onClick={() => setShowPass((v) => !v)}
                        style={{
                          position: "absolute",
                          right: 12,
                          top: "50%",
                          transform: "translateY(-50%)",
                          background: "none",
                          border: "none",
                          cursor: "pointer",
                          color: "#94a3b8",
                          display: "flex",
                          alignItems: "center",
                          padding: 4,
                          borderRadius: 6,
                          transition: "color .15s",
                        }}
                        onMouseEnter={(e) =>
                          ((e.currentTarget as HTMLElement).style.color =
                            "#4f46e5")
                        }
                        onMouseLeave={(e) =>
                          ((e.currentTarget as HTMLElement).style.color =
                            "#94a3b8")
                        }
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
                    {mode === "login" && attempts > 0 && !isBlocked && (
                      <div style={{ display: "flex", gap: 5, marginTop: 8 }}>
                        {[...Array(MAX_ATTEMPTS)].map((_, i) => (
                          <div
                            key={i}
                            style={{
                              flex: 1,
                              height: 3,
                              borderRadius: 999,
                              background: i < attempts ? "#ef4444" : "#e2e8f0",
                              transition: "background .3s",
                            }}
                          />
                        ))}
                      </div>
                    )}

                    {/* Signup: password strength */}
                    {mode === "signup" && password.length > 0 && (
                      <div style={{ marginTop: 8 }}>
                        <div style={{ display: "flex", gap: 4 }}>
                          {[1, 2, 3, 4].map((i) => (
                            <div
                              key={i}
                              style={{
                                flex: 1,
                                height: 3,
                                borderRadius: 999,
                                background:
                                  i <= strength.level
                                    ? strength.color
                                    : "#e2e8f0",
                                transition: "background .3s",
                              }}
                            />
                          ))}
                        </div>
                        <p
                          style={{
                            fontSize: 12,
                            color: "#64748b",
                            marginTop: 5,
                          }}
                        >
                          Parol kuchi:{" "}
                          <span
                            style={{ fontWeight: 600, color: strength.color }}
                          >
                            {strength.label}
                          </span>
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Submit */}
                  <button
                    type="submit"
                    disabled={loading || isBlocked}
                    style={{
                      width: "100%",
                      background: loading || isBlocked ? "#a5b4fc" : "#4f46e5",
                      color: "white",
                      border: "none",
                      borderRadius: 14,
                      padding: "14px",
                      fontSize: 15,
                      fontWeight: 700,
                      cursor: loading || isBlocked ? "not-allowed" : "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 8,
                      boxShadow:
                        loading || isBlocked
                          ? "none"
                          : "0 6px 20px rgba(79,70,229,.35)",
                      transition: "all .2s",
                      marginTop: 4,
                    }}
                    onMouseEnter={(e) => {
                      if (!loading && !isBlocked) {
                        (e.currentTarget as HTMLElement).style.background =
                          "#4338ca";
                        (e.currentTarget as HTMLElement).style.transform =
                          "translateY(-1px)";
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!loading && !isBlocked) {
                        (e.currentTarget as HTMLElement).style.background =
                          "#4f46e5";
                        (e.currentTarget as HTMLElement).style.transform =
                          "translateY(0)";
                      }
                    }}
                  >
                    {loading ? (
                      <>
                        <svg
                          style={{ animation: "spin .7s linear infinite" }}
                          width="16"
                          height="16"
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
                        {mode === "login"
                          ? "Kirilmoqda..."
                          : "Ro'yxatdan o'tilmoqda..."}
                      </>
                    ) : mode === "login" ? (
                      "Kirish →"
                    ) : (
                      "Ro'yxatdan o'tish →"
                    )}
                  </button>
                </div>
              </form>

              {/* Switch mode */}
              <p
                style={{
                  textAlign: "center",
                  fontSize: 13,
                  color: "#94a3b8",
                  marginTop: 20,
                }}
              >
                {mode === "login" ? "Hisobingiz yo'qmi?" : "Hisobingiz bormi?"}{" "}
                <button
                  onClick={() =>
                    switchMode(mode === "login" ? "signup" : "login")
                  }
                  style={{
                    background: "none",
                    border: "none",
                    color: "#4f46e5",
                    fontWeight: 600,
                    fontSize: 13,
                    cursor: "pointer",
                    padding: 0,
                    transition: "color .15s",
                  }}
                  onMouseEnter={(e) =>
                    ((e.currentTarget as HTMLElement).style.color = "#4338ca")
                  }
                  onMouseLeave={(e) =>
                    ((e.currentTarget as HTMLElement).style.color = "#4f46e5")
                  }
                >
                  {mode === "login" ? "Ro'yxatdan o'ting" : "Kiring"}
                </button>
              </p>
            </div>
          </div>

          {/* Back link */}
          <p
            style={{
              textAlign: "center",
              marginTop: 20,
              fontSize: 13,
              ...anim(160),
            }}
          >
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

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </>
  );
}

// ── Style helpers ──────────────────────────────
const labelStyle: React.CSSProperties = {
  display: "block",
  fontSize: 11,
  fontWeight: 700,
  color: "#64748b",
  letterSpacing: "0.06em",
  textTransform: "uppercase",
  marginBottom: 7,
};

function inputStyle(): React.CSSProperties {
  return {
    width: "100%",
    boxSizing: "border-box",
    background: "#f8f9fc",
    border: "2px solid #e2e8f0",
    borderRadius: 12,
    padding: "11px 14px",
    fontSize: 14,
    color: "#0f172a",
    outline: "none",
    transition: "border-color .2s, background .2s",
    fontFamily: "inherit",
  };
}
