"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase-browser";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";

const MAX_ATTEMPTS = 5;
const BLOCK_MINUTES = 15;

interface Props {
  onSwitch: () => void;
}

export function LoginForm({ onSwitch }: Props) {
  const router = useRouter();
  const supabase = createClient();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [attempts, setAttempts] = useState(0);
  const [isBlocked, setIsBlocked] = useState(false);
  const [blockSecs, setBlockSecs] = useState(0);

  // Block countdown
  function startBlockTimer() {
    setIsBlocked(true);
    let secs = BLOCK_MINUTES * 60;
    setBlockSecs(secs);
    const iv = setInterval(() => {
      secs--;
      setBlockSecs(secs);
      if (secs <= 0) {
        clearInterval(iv);
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
    return d.attempts;
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    if (!username.trim()) {
      setError("Username kiriting");
      return;
    }
    setError("");
    setLoading(true);

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
      const newAttempts = await recordFail();
      const left = Math.max(0, MAX_ATTEMPTS - newAttempts);
      setError(
        left > 0
          ? `Username yoki parol noto'g'ri. Yana ${left} ta urinish.`
          : `${BLOCK_MINUTES} daqiqa kuting.`,
      );
      setLoading(false);
      return;
    }

    // Muvaffaqiyatli — urinishlarni tozalash
    await fetch("/api/auth-attempts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "clear",
        email: `${username}@autotest.uz`,
      }),
    });

    router.push("/profile");
    router.refresh();
  }

  return (
    <Card className="border-0 shadow-none">
      <CardHeader className="pb-4 px-0 pt-0">
        <CardTitle className="text-lg text-slate-800">Xush kelibsiz</CardTitle>
        <CardDescription>Hisobingizga kiring</CardDescription>
      </CardHeader>

      <CardContent className="px-0 pb-0">
        {/* Blocked */}
        {isBlocked && (
          <div className="bg-orange-50 border border-orange-200 rounded-xl p-3.5 mb-4 text-center">
            <p className="text-xs font-medium text-orange-600 mb-1">
              Hisob vaqtincha bloklandi
            </p>
            <p className="text-2xl font-mono font-bold text-orange-500">
              {fmt(blockSecs)}
            </p>
            <p className="text-xs text-orange-400 mt-1">
              5 ta noto'g'ri urinish
            </p>
          </div>
        )}

        {/* Error */}
        {error && !isBlocked && (
          <div className="flex items-center gap-2 bg-red-50 border border-red-100 text-red-600 rounded-xl px-3 py-2.5 mb-4 text-sm">
            <svg
              width="14"
              height="14"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              viewBox="0 0 24 24"
              className="shrink-0"
            >
              <circle cx="12" cy="12" r="10" />
              <line x1="15" y1="9" x2="9" y2="15" />
              <line x1="9" y1="9" x2="15" y2="15" />
            </svg>
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          {/* Username */}
          <div className="space-y-1.5">
            <Label
              htmlFor="login-username"
              className="text-xs font-semibold text-slate-500 uppercase tracking-wide"
            >
              Username
            </Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
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
              <Input
                id="login-username"
                placeholder="ali_karimov"
                value={username}
                onChange={(e) =>
                  setUsername(
                    e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""),
                  )
                }
                disabled={loading || isBlocked}
                className="pl-9 bg-slate-50 border-slate-200 focus:border-blue-400 focus:ring-blue-100 rounded-xl"
              />
            </div>
          </div>

          {/* Password */}
          <div className="space-y-1.5">
            <Label
              htmlFor="login-password"
              className="text-xs font-semibold text-slate-500 uppercase tracking-wide"
            >
              Parol
            </Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
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
              <Input
                id="login-password"
                type={showPass ? "text" : "password"}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading || isBlocked}
                className="pl-9 pr-10 bg-slate-50 border-slate-200 focus:border-blue-400 focus:ring-blue-100 rounded-xl"
              />
              <button
                type="button"
                tabIndex={-1}
                onClick={() => setShowPass((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition"
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

            {/* Attempt dots */}
            {attempts > 0 && !isBlocked && (
              <div className="flex gap-1 pt-1">
                {[...Array(MAX_ATTEMPTS)].map((_, i) => (
                  <div
                    key={i}
                    className={`flex-1 h-1 rounded-full transition-all ${i < attempts ? "bg-red-400" : "bg-slate-200"}`}
                  />
                ))}
              </div>
            )}
          </div>

          <Button
            type="submit"
            disabled={loading || isBlocked}
            className="w-full bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white rounded-xl shadow-md shadow-blue-200 hover:shadow-lg hover:shadow-blue-300 transition-all"
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <svg
                  className="animate-spin w-4 h-4"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8v8H4z"
                  />
                </svg>
                Kirilmoqda...
              </span>
            ) : (
              "Kirish →"
            )}
          </Button>
        </form>

        <p className="text-center text-sm text-slate-400 mt-4">
          Hisobingiz yo'qmi?{" "}
          <button
            onClick={onSwitch}
            className="text-blue-500 font-medium hover:text-blue-700 transition"
          >
            Ro'yxatdan o'ting
          </button>
        </p>
      </CardContent>
    </Card>
  );
}
