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

interface Props {
  onSwitch: () => void;
}

export function SignupForm({ onSwitch }: Props) {
  const router = useRouter();
  const supabase = createClient();

  const [firstname, setFirstname] = useState("");
  const [lastname, setLastname] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!firstname.trim()) {
      setError("Ism kiriting");
      return;
    }
    if (!lastname.trim()) {
      setError("Familiya kiriting");
      return;
    }
    if (!username.trim()) {
      setError("Username kiriting");
      return;
    }
    if (username.length < 3) {
      setError("Username kamida 3 ta belgi bo'lishi kerak");
      return;
    }
    if (password.length < 6) {
      setError("Parol kamida 6 ta belgi bo'lishi kerak");
      return;
    }

    setLoading(true);

    // Server-side signup (bcrypt hash shu yerda hisoblanadi)
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
      setError(data.error || "Xato yuz berdi. Qayta urinib ko'ring.");
      setLoading(false);
      return;
    }

    // Signup muvaffaqiyatli — avtomatik login
    const { error: loginErr } = await supabase.auth.signInWithPassword({
      email: `${username.trim().toLowerCase()}@autotest.uz`,
      password,
    });

    if (loginErr) {
      setError("Ro'yxatdan o'tildi! Endi kiring.");
      setLoading(false);
      onSwitch();
      return;
    }

    router.push("/profile");
    router.refresh();
  }

  // Parol kuchini hisoblash
  function passwordStrength(p: string): {
    level: number;
    label: string;
    color: string;
  } {
    if (p.length === 0) return { level: 0, label: "", color: "" };
    let score = 0;
    if (p.length >= 8) score++;
    if (/[A-Z]/.test(p)) score++;
    if (/[0-9]/.test(p)) score++;
    if (/[^a-zA-Z0-9]/.test(p)) score++;
    if (score <= 1) return { level: 1, label: "Zaif", color: "bg-red-400" };
    if (score === 2)
      return { level: 2, label: "O'rtacha", color: "bg-orange-400" };
    if (score === 3)
      return { level: 3, label: "Yaxshi", color: "bg-yellow-400" };
    return { level: 4, label: "Kuchli", color: "bg-green-500" };
  }

  const strength = passwordStrength(password);

  return (
    <Card className="border-0 shadow-none">
      <CardHeader className="pb-4 px-0 pt-0">
        <CardTitle className="text-lg text-slate-800">Hisob yaratish</CardTitle>
        <CardDescription>Ma'lumotlaringizni kiriting</CardDescription>
      </CardHeader>

      <CardContent className="px-0 pb-0">
        {/* Error */}
        {error && (
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

        <form onSubmit={handleSignup} className="space-y-3.5">
          {/* Ism + Familiya */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label
                htmlFor="signup-firstname"
                className="text-xs font-semibold text-slate-500 uppercase tracking-wide"
              >
                Ism
              </Label>
              <Input
                id="signup-firstname"
                placeholder="Ali"
                value={firstname}
                onChange={(e) => setFirstname(e.target.value)}
                disabled={loading}
                autoComplete="given-name"
                className="bg-slate-50 border-slate-200 focus:border-blue-400 focus:ring-blue-100 rounded-xl"
              />
            </div>
            <div className="space-y-1.5">
              <Label
                htmlFor="signup-lastname"
                className="text-xs font-semibold text-slate-500 uppercase tracking-wide"
              >
                Familiya
              </Label>
              <Input
                id="signup-lastname"
                placeholder="Karimov"
                value={lastname}
                onChange={(e) => setLastname(e.target.value)}
                disabled={loading}
                autoComplete="family-name"
                className="bg-slate-50 border-slate-200 focus:border-blue-400 focus:ring-blue-100 rounded-xl"
              />
            </div>
          </div>

          {/* Username */}
          <div className="space-y-1.5">
            <Label
              htmlFor="signup-username"
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
                id="signup-username"
                placeholder="ali_karimov"
                value={username}
                onChange={(e) =>
                  setUsername(
                    e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""),
                  )
                }
                disabled={loading}
                autoComplete="username"
                className="pl-9 bg-slate-50 border-slate-200 focus:border-blue-400 focus:ring-blue-100 rounded-xl"
              />
            </div>
            {username.length > 0 && username.length < 3 && (
              <p className="text-xs text-orange-500">Kamida 3 ta belgi kerak</p>
            )}
          </div>

          {/* Password */}
          <div className="space-y-1.5">
            <Label
              htmlFor="signup-password"
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
                id="signup-password"
                type={showPass ? "text" : "password"}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
                autoComplete="new-password"
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

            {/* Parol kuchi */}
            {password.length > 0 && (
              <div className="space-y-1">
                <div className="flex gap-1">
                  {[1, 2, 3, 4].map((i) => (
                    <div
                      key={i}
                      className={`flex-1 h-1 rounded-full transition-all duration-300 ${
                        i <= strength.level ? strength.color : "bg-slate-200"
                      }`}
                    />
                  ))}
                </div>
                <p className="text-xs text-slate-400">
                  Parol kuchi:{" "}
                  <span className="font-medium text-slate-600">
                    {strength.label}
                  </span>
                </p>
              </div>
            )}
          </div>

          <Button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white rounded-xl shadow-md shadow-blue-200 hover:shadow-lg hover:shadow-blue-300 transition-all mt-1"
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
                Saqlanmoqda...
              </span>
            ) : (
              "Ro'yxatdan o'tish →"
            )}
          </Button>
        </form>

        <p className="text-center text-sm text-slate-400 mt-4">
          Hisobingiz bormi?{" "}
          <button
            onClick={onSwitch}
            className="text-blue-500 font-medium hover:text-blue-700 transition"
          >
            Kiring
          </button>
        </p>
      </CardContent>
    </Card>
  );
}
