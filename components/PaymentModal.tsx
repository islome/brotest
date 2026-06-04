"use client";
import { useState } from "react";
import { createClient } from "@/lib/supabase-browser";

interface Props {
  plan: "plus" | "life";
  userId: string;
  userFirstname: string;
  userLastname: string;
  onClose: () => void;
  onSuccess: (plan: string) => void;
}

const PLAN_META = {
  plus: {
    name: "Plus",
    price: "$4.99",
    period: "/oy",
    color: "#4f46e5",
    bg: "#eef2ff",
    border: "#c7d2fe",
    icon: "⚡",
  },
  life: {
    name: "Life",
    price: "$49.99",
    period: " (bir marta)",
    color: "#7c3aed",
    bg: "#f5f3ff",
    border: "#ddd6fe",
    icon: "♾",
  },
};

const STEPS = ["info", "card", "confirm"] as const;
type Step = (typeof STEPS)[number];

function formatCardNumber(val: string) {
  return val
    .replace(/\D/g, "")
    .slice(0, 16)
    .replace(/(.{4})/g, "$1 ")
    .trim();
}

function formatExpiry(val: string) {
  const digits = val.replace(/\D/g, "").slice(0, 4);
  if (digits.length >= 3) return digits.slice(0, 2) + "/" + digits.slice(2);
  return digits;
}

export default function PaymentModal({
  plan,
  userId,
  userFirstname,
  userLastname,
  onClose,
  onSuccess,
}: Props) {
  const meta = PLAN_META[plan];
  const supabase = createClient();

  const [step, setStep] = useState<Step>("info");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [fullName, setFullName] = useState(
    `${userFirstname} ${userLastname}`.trim()
  );
  const [address, setAddress] = useState("");
  const [cardNumber, setCardNumber] = useState("");
  const [expiry, setExpiry] = useState("");
  const [cvv, setCvv] = useState("");
  const [cardName, setCardName] = useState(
    `${userFirstname} ${userLastname}`.trim().toUpperCase()
  );

  async function handleConfirm() {
    setLoading(true);
    setError("");
    const { error: dbErr } = await supabase
      .from("users")
      .update({ subscription: plan })
      .eq("id", userId);
    if (dbErr) {
      setError("Xatolik yuz berdi. Qaytadan urinib ko'ring.");
      setLoading(false);
      return;
    }
    setLoading(false);
    onSuccess(plan);
  }

  const inp: React.CSSProperties = {
    width: "100%",
    boxSizing: "border-box",
    background: "#f8f9fc",
    border: "2px solid #e2e8f0",
    borderRadius: 12,
    padding: "11px 14px",
    fontSize: 14,
    color: "#0f172a",
    outline: "none",
    fontFamily: "inherit",
    transition: "border-color .2s",
  };
  const lbl: React.CSSProperties = {
    display: "block",
    fontSize: 11,
    fontWeight: 700,
    color: "#64748b",
    letterSpacing: "0.06em",
    textTransform: "uppercase",
    marginBottom: 6,
  };

  const stepIndex = STEPS.indexOf(step);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(15,23,42,.6)", backdropFilter: "blur(8px)" }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="bg-white rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden"
        style={{ animation: "pmIn .25s cubic-bezier(.22,1,.36,1)" }}
      >
        {/* Header */}
        <div
          className="px-6 py-4 flex items-center justify-between"
          style={{ borderBottom: "1px solid #f1f5f9" }}
        >
          <div className="flex items-center gap-3">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center text-white font-bold text-base"
              style={{ background: meta.color }}
            >
              {meta.icon}
            </div>
            <div>
              <h3 className="font-bold text-slate-800 text-base leading-tight">
                {meta.name} obunasi
              </h3>
              <p className="text-xs text-slate-400">
                {meta.price}
                {meta.period}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 flex items-center justify-center text-slate-500 transition-colors cursor-pointer"
          >
            <svg
              width="13"
              height="13"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              viewBox="0 0 24 24"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Step dots */}
        <div className="px-6 pt-4 flex items-center gap-0">
          {STEPS.map((s, i) => (
            <div key={s} className="flex items-center" style={{ flex: i < 2 ? 1 : "none" }}>
              <div
                className="w-6 h-6 rounded-full text-xs font-bold flex items-center justify-center shrink-0 transition-all"
                style={{
                  background:
                    stepIndex > i
                      ? meta.color
                      : stepIndex === i
                      ? meta.color
                      : "#e2e8f0",
                  color: stepIndex >= i ? "white" : "#94a3b8",
                }}
              >
                {stepIndex > i ? "✓" : i + 1}
              </div>
              {i < 2 && (
                <div
                  className="flex-1 h-px mx-1"
                  style={{
                    background: stepIndex > i ? meta.color : "#e2e8f0",
                    transition: "background .3s",
                  }}
                />
              )}
            </div>
          ))}
        </div>

        <div className="px-6 py-5 flex flex-col gap-4">
          {error && (
            <div className="flex items-center gap-2 bg-red-50 border border-red-100 text-red-600 rounded-xl px-3 py-2.5 text-sm">
              <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" className="shrink-0">
                <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              {error}
            </div>
          )}

          {/* ── STEP 1: Personal info ── */}
          {step === "info" && (
            <>
              <div>
                <label style={lbl}>To'liq ism</label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  style={inp}
                  onFocus={(e) => (e.currentTarget.style.borderColor = meta.color)}
                  onBlur={(e) => (e.currentTarget.style.borderColor = "#e2e8f0")}
                  placeholder="Ali Karimov"
                />
              </div>
              <div>
                <label style={lbl}>Manzil</label>
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  style={inp}
                  onFocus={(e) => (e.currentTarget.style.borderColor = meta.color)}
                  onBlur={(e) => (e.currentTarget.style.borderColor = "#e2e8f0")}
                  placeholder="Toshkent, Yunusobod tumani"
                />
              </div>
              <button
                onClick={() => {
                  if (!fullName.trim()) { setError("Ism kiriting"); return; }
                  if (!address.trim()) { setError("Manzil kiriting"); return; }
                  setError("");
                  setStep("card");
                }}
                className="w-full font-bold py-3 rounded-xl text-white transition-all hover:-translate-y-0.5 cursor-pointer border-none text-sm"
                style={{ background: meta.color }}
              >
                Davom etish →
              </button>
            </>
          )}

          {/* ── STEP 2: Card info ── */}
          {step === "card" && (
            <>
              <div>
                <label style={lbl}>Karta raqami</label>
                <input
                  type="text"
                  value={cardNumber}
                  onChange={(e) => setCardNumber(formatCardNumber(e.target.value))}
                  style={inp}
                  onFocus={(e) => (e.currentTarget.style.borderColor = meta.color)}
                  onBlur={(e) => (e.currentTarget.style.borderColor = "#e2e8f0")}
                  placeholder="0000 0000 0000 0000"
                  maxLength={19}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label style={lbl}>Muddati</label>
                  <input
                    type="text"
                    value={expiry}
                    onChange={(e) => setExpiry(formatExpiry(e.target.value))}
                    style={inp}
                    onFocus={(e) => (e.currentTarget.style.borderColor = meta.color)}
                    onBlur={(e) => (e.currentTarget.style.borderColor = "#e2e8f0")}
                    placeholder="MM/YY"
                    maxLength={5}
                  />
                </div>
                <div>
                  <label style={lbl}>CVV</label>
                  <input
                    type="password"
                    value={cvv}
                    onChange={(e) =>
                      setCvv(e.target.value.replace(/\D/g, "").slice(0, 3))
                    }
                    style={inp}
                    onFocus={(e) => (e.currentTarget.style.borderColor = meta.color)}
                    onBlur={(e) => (e.currentTarget.style.borderColor = "#e2e8f0")}
                    placeholder="•••"
                    maxLength={3}
                  />
                </div>
              </div>
              <div>
                <label style={lbl}>Karta egasi</label>
                <input
                  type="text"
                  value={cardName}
                  onChange={(e) => setCardName(e.target.value.toUpperCase())}
                  style={inp}
                  onFocus={(e) => (e.currentTarget.style.borderColor = meta.color)}
                  onBlur={(e) => (e.currentTarget.style.borderColor = "#e2e8f0")}
                  placeholder="ALI KARIMOV"
                />
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => { setError(""); setStep("info"); }}
                  className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-600 font-semibold text-sm py-2.5 rounded-xl transition-colors cursor-pointer border-none"
                >
                  Orqaga
                </button>
                <button
                  onClick={() => {
                    if (cardNumber.replace(/\s/g, "").length < 16) { setError("Karta raqamini to'liq kiriting"); return; }
                    if (expiry.length < 5) { setError("Muddatni kiriting (MM/YY)"); return; }
                    if (cvv.length < 3) { setError("CVV ni kiriting"); return; }
                    if (!cardName.trim()) { setError("Karta egasi ismini kiriting"); return; }
                    setError("");
                    setStep("confirm");
                  }}
                  className="flex-1 font-bold py-2.5 rounded-xl text-white transition-all cursor-pointer border-none text-sm"
                  style={{ background: meta.color }}
                >
                  Davom etish →
                </button>
              </div>
            </>
          )}

          {/* ── STEP 3: Confirm ── */}
          {step === "confirm" && (
            <>
              <div
                className="rounded-2xl p-4 flex flex-col gap-3"
                style={{ background: meta.bg, border: `1.5px solid ${meta.border}` }}
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold" style={{ color: meta.color }}>
                    {meta.icon} {meta.name} Obunasi
                  </span>
                  <span className="text-sm font-bold text-slate-800">
                    {meta.price}
                    <span className="text-xs font-normal text-slate-500">{meta.period}</span>
                  </span>
                </div>
                <div
                  className="flex flex-col gap-2 pt-2"
                  style={{ borderTop: `1px solid ${meta.border}` }}
                >
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-500">Ism:</span>
                    <span className="font-medium text-slate-700">{fullName}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-500">Manzil:</span>
                    <span className="font-medium text-slate-700 text-right max-w-[60%]">{address}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-500">Karta:</span>
                    <span className="font-medium text-slate-700">
                      **** **** **** {cardNumber.replace(/\s/g, "").slice(-4)}
                    </span>
                  </div>
                </div>
              </div>

              <p className="text-xs text-slate-400 text-center leading-relaxed">
                Tasdiqlash orqali obuna shartlariga roziligingizni bildirасиз.
              </p>

              <div className="flex gap-3">
                <button
                  onClick={() => { setError(""); setStep("card"); }}
                  className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-600 font-semibold text-sm py-2.5 rounded-xl transition-colors cursor-pointer border-none"
                >
                  Orqaga
                </button>
                <button
                  onClick={handleConfirm}
                  disabled={loading}
                  className="flex-1 font-bold py-2.5 rounded-xl text-white transition-all cursor-pointer border-none text-sm flex items-center justify-center gap-2 disabled:opacity-60"
                  style={{ background: meta.color }}
                >
                  {loading ? (
                    <>
                      <div
                        style={{
                          width: 14,
                          height: 14,
                          borderRadius: "50%",
                          border: "2px solid rgba(255,255,255,.3)",
                          borderTopColor: "white",
                          animation: "pmSpin .7s linear infinite",
                        }}
                      />
                      Jarayonda...
                    </>
                  ) : (
                    "Tasdiqlash ✓"
                  )}
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      <style>{`
        @keyframes pmIn { from{opacity:0;transform:scale(.96) translateY(10px)} to{opacity:1;transform:scale(1) translateY(0)} }
        @keyframes pmSpin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
