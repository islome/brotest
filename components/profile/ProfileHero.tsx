"use client";
import { useState } from "react";
import { createClient } from "@/lib/supabase-browser";

// ── Types (mavjud profile page dan) ──────────────────
interface UserData {
  id: string;
  firstname: string;
  lastname: string;
  username: string;
  role: string;
  created_at: string;
  avatar_icon?: string;
}

interface RankObj {
  name: string;
  icon: string;
  color: string;
  bg: string;
  border: string;
}

interface Stats {
  xp: number;
}

interface NextRank {
  icon: string;
  name: string;
  minXP: number;
}

interface Props {
  user: UserData;
  stats: Stats;
  rankObj: RankObj;
  nextRank: NextRank | null;
  xpProgress: number;
  fmtJoined: (iso: string) => string;
  onUserUpdate: (updated: Partial<UserData>) => void;
}

// ── Avatar icons ──────────────────────────────────────
const AVATAR_ICONS = [
  "🚗",
  "🏎️",
  "🚕",
  "🚙",
  "🚌",
  "🏍️",
  "🛻",
  "🚓",
  "🚑",
  "🚒",
];

// ── Component ─────────────────────────────────────────
export default function ProfileHero({
  user,
  stats,
  rankObj,
  nextRank,
  xpProgress,
  fmtJoined,
  onUserUpdate,
}: Props) {
  const supabase = createClient();

  const [iconPickerOpen, setIconPickerOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [savingIcon, setSavingIcon] = useState(false);
  const [savingEdit, setSavingEdit] = useState(false);
  const [editError, setEditError] = useState("");

  // Edit form state
  const [firstname, setFirstname] = useState(user.firstname);
  const [lastname, setLastname] = useState(user.lastname);
  const [username, setUsername] = useState(user.username);

  const currentIcon = user.avatar_icon || "🚗";

  // ── Save avatar icon ──
  async function handleSelectIcon(icon: string) {
    setSavingIcon(true);
    const { error } = await supabase
      .from("users")
      .update({ avatar_icon: icon })
      .eq("id", user.id);

    if (!error) {
      onUserUpdate({ avatar_icon: icon });
      setIconPickerOpen(false);
    }
    setSavingIcon(false);
  }

  // ── Save profile edit ──
  async function handleSaveEdit() {
    setEditError("");
    if (!firstname.trim()) {
      setEditError("Ism kiriting");
      return;
    }
    if (!lastname.trim()) {
      setEditError("Familiya kiriting");
      return;
    }
    if (!username.trim()) {
      setEditError("Username kiriting");
      return;
    }
    if (username.length < 3) {
      setEditError("Username kamida 3 ta belgi");
      return;
    }

    setSavingEdit(true);

    // Username band emasmi (o'zi bundan tashqari)
    const { data: existing } = await supabase
      .from("users")
      .select("id")
      .eq("username", username.trim().toLowerCase())
      .neq("id", user.id)
      .maybeSingle();

    if (existing) {
      setEditError("Bu username band");
      setSavingEdit(false);
      return;
    }

    const { error } = await supabase
      .from("users")
      .update({
        firstname: firstname.trim(),
        lastname: lastname.trim(),
        username: username.trim().toLowerCase(),
      })
      .eq("id", user.id);

    if (error) {
      setEditError(error.message);
    } else {
      onUserUpdate({
        firstname: firstname.trim(),
        lastname: lastname.trim(),
        username: username.trim().toLowerCase(),
      });
      setEditOpen(false);
    }
    setSavingEdit(false);
  }

  function openEdit() {
    setFirstname(user.firstname);
    setLastname(user.lastname);
    setUsername(user.username);
    setEditError("");
    setEditOpen(true);
  }

  const inputStyle: React.CSSProperties = {
    width: "100%",
    boxSizing: "border-box",
    background: "#f8f9fc",
    border: "2px solid #e2e8f0",
    borderRadius: 12,
    padding: "10px 14px",
    fontSize: 14,
    color: "#0f172a",
    outline: "none",
    fontFamily: "inherit",
    transition: "border-color .2s",
  };
  const labelStyle: React.CSSProperties = {
    display: "block",
    fontSize: 11,
    fontWeight: 700,
    color: "#64748b",
    letterSpacing: "0.06em",
    textTransform: "uppercase",
    marginBottom: 6,
  };

  return (
    <>
      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
        {/* Banner */}
        <div className="h-24 bg-gradient-to-r from-blue-500 via-indigo-500 to-violet-500 relative overflow-hidden">
          <div
            className="absolute inset-0 opacity-10"
            style={{
              backgroundImage:
                "radial-gradient(circle, white 1.5px, transparent 1.5px)",
              backgroundSize: "28px 28px",
            }}
          />

          {/* Edit button — banner ustida */}
          <button
            onClick={openEdit}
            className="absolute top-3 right-3 flex items-center gap-1.5 bg-white/20 hover:bg-white/35 border border-white/30 text-white text-xs font-semibold px-3 py-1.5 rounded-xl transition-all backdrop-blur-sm"
          >
            <svg
              width="12"
              height="12"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              viewBox="0 0 24 24"
            >
              <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
              <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
            </svg>
            Tahrirlash
          </button>
        </div>

        <div className="px-6 pb-6">
          <div className="flex items-end justify-between -mt-9 mb-4">
            {/* Avatar — bosish mumkin */}
            <div className="relative">
              <button
                onClick={() => setIconPickerOpen((v) => !v)}
                className="w-20 h-20 rounded-2xl bg-gradient-to-br from-blue-400 to-indigo-600 border-4 border-white shadow-lg flex items-center justify-center group relative overflow-hidden cursor-pointer transition-transform hover:scale-105"
                title="Avatar o'zgartirish"
              >
                <span className="text-4xl select-none">{currentIcon}</span>
                {/* Hover overlay */}
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-2xl">
                  <svg
                    width="18"
                    height="18"
                    fill="none"
                    stroke="white"
                    strokeWidth="2.5"
                    viewBox="0 0 24 24"
                  >
                    <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
                    <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
                  </svg>
                </div>
              </button>

              {/* Rank badge */}
              <div
                className={`absolute -bottom-1 -right-1 w-7 h-7 rounded-lg ${rankObj.bg} border-2 border-white flex items-center justify-center text-sm shadow-sm`}
              >
                {rankObj.icon}
              </div>

              {/* Icon picker dropdown */}
              {iconPickerOpen && (
                <div
                  className="absolute top-full left-0 mt-2 z-30 bg-white rounded-2xl border border-slate-200 shadow-xl p-3"
                  style={{ width: 220 }}
                >
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2.5 px-1">
                    Avatar tanlang
                  </p>
                  <div className="grid grid-cols-5 gap-2">
                    {AVATAR_ICONS.map((icon) => (
                      <button
                        key={icon}
                        onClick={() => handleSelectIcon(icon)}
                        disabled={savingIcon}
                        className={`w-full aspect-square rounded-xl text-2xl flex items-center justify-center transition-all hover:scale-110 hover:bg-indigo-50 ${
                          currentIcon === icon
                            ? "bg-indigo-100 ring-2 ring-indigo-400 scale-105"
                            : "bg-slate-50 hover:bg-indigo-50"
                        }`}
                      >
                        {icon}
                      </button>
                    ))}
                  </div>
                  <button
                    onClick={() => setIconPickerOpen(false)}
                    className="w-full mt-2.5 text-xs font-medium text-slate-400 hover:text-slate-600 py-1.5 rounded-lg hover:bg-slate-50 transition-colors"
                  >
                    Yopish
                  </button>
                </div>
              )}
            </div>

            {/* XP chip */}
            <div className="flex items-center gap-1.5 bg-amber-50 border border-amber-200 rounded-xl px-3 py-1.5">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="#f59e0b">
                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
              </svg>
              <span className="text-sm font-bold text-amber-700">
                {stats.xp} XP
              </span>
            </div>
          </div>

          {/* Ism + info */}
          <div className="mb-4">
            <h1 className="text-xl font-bold text-slate-800">
              {user.firstname && user.lastname
                ? `${user.firstname} ${user.lastname}`
                : user.username}
            </h1>
            <div className="flex flex-wrap items-center gap-2 mt-1">
              <span className="text-sm text-slate-400">@{user.username}</span>
              <span className="text-slate-200">·</span>
              <span
                className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${rankObj.color} ${rankObj.bg} ${rankObj.border}`}
              >
                {rankObj.icon} {rankObj.name}
              </span>
              {user.role === "admin" && (
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full border text-violet-600 bg-violet-50 border-violet-200">
                  👤 Admin
                </span>
              )}
            </div>
            <p className="text-xs text-slate-400 mt-1">
              {fmtJoined(user.created_at)} dan beri
            </p>
          </div>

          {/* XP progress */}
          {nextRank ? (
            <div>
              <div className="flex justify-between items-center mb-1.5">
                <span className="text-xs text-slate-500">
                  Keyingi:{" "}
                  <span className="font-semibold text-slate-700">
                    {nextRank.icon} {nextRank.name}
                  </span>
                </span>
                <span className="text-xs font-medium text-slate-400">
                  {stats.xp} / {nextRank.minXP} XP
                </span>
              </div>
              <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-blue-400 to-indigo-500 rounded-full transition-all duration-1000"
                  style={{ width: `${xpProgress}%` }}
                />
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2 bg-purple-50 border border-purple-200 rounded-xl px-3 py-2">
              <span>👑</span>
              <span className="text-xs font-medium text-purple-700">
                Eng yuqori darajaga erishdingiz!
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Click outside — icon picker yopish */}
      {iconPickerOpen && (
        <div
          className="fixed inset-0 z-20"
          onClick={() => setIconPickerOpen(false)}
        />
      )}

      {/* ══ EDIT MODAL ══ */}
      {editOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{
            background: "rgba(15,23,42,.5)",
            backdropFilter: "blur(6px)",
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setEditOpen(false);
          }}
        >
          <div
            className="bg-white rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden"
            style={{ animation: "modalIn .25s cubic-bezier(.22,1,.36,1)" }}
          >
            {/* Modal header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <h3 className="font-bold text-slate-800 text-base">
                Profilni tahrirlash
              </h3>
              <button
                onClick={() => setEditOpen(false)}
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

            <div className="px-6 py-5 flex flex-col gap-4">
              {editError && (
                <div className="flex items-center gap-2 bg-red-50 border border-red-100 text-red-600 rounded-xl px-3 py-2.5 text-sm">
                  <svg
                    width="13"
                    height="13"
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
                  {editError}
                </div>
              )}

              {/* Ism + familiya */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label style={labelStyle}>Ism</label>
                  <input
                    type="text"
                    value={firstname}
                    onChange={(e) => setFirstname(e.target.value)}
                    style={inputStyle}
                    onFocus={(e) =>
                      (e.currentTarget.style.borderColor = "#6366f1")
                    }
                    onBlur={(e) =>
                      (e.currentTarget.style.borderColor = "#e2e8f0")
                    }
                    placeholder="Ali"
                  />
                </div>
                <div>
                  <label style={labelStyle}>Familiya</label>
                  <input
                    type="text"
                    value={lastname}
                    onChange={(e) => setLastname(e.target.value)}
                    style={inputStyle}
                    onFocus={(e) =>
                      (e.currentTarget.style.borderColor = "#6366f1")
                    }
                    onBlur={(e) =>
                      (e.currentTarget.style.borderColor = "#e2e8f0")
                    }
                    placeholder="Karimov"
                  />
                </div>
              </div>

              {/* Username */}
              <div>
                <label style={labelStyle}>Username</label>
                <div style={{ position: "relative" }}>
                  <span
                    style={{
                      position: "absolute",
                      left: 12,
                      top: "50%",
                      transform: "translateY(-50%)",
                      color: "#94a3b8",
                      fontSize: 14,
                    }}
                  >
                    @
                  </span>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) =>
                      setUsername(
                        e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""),
                      )
                    }
                    style={{ ...inputStyle, paddingLeft: 28 }}
                    onFocus={(e) =>
                      (e.currentTarget.style.borderColor = "#6366f1")
                    }
                    onBlur={(e) =>
                      (e.currentTarget.style.borderColor = "#e2e8f0")
                    }
                    placeholder="ali_karimov"
                  />
                </div>
              </div>

              {/* Buttons */}
              <div className="flex gap-3 pt-1">
                <button
                  onClick={() => setEditOpen(false)}
                  className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-600 font-semibold text-sm py-2.5 rounded-xl transition-colors cursor-pointer border-none"
                >
                  Bekor qilish
                </button>
                <button
                  onClick={handleSaveEdit}
                  disabled={savingEdit}
                  className="flex-1 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-semibold text-sm py-2.5 rounded-xl transition-colors cursor-pointer border-none flex items-center justify-center gap-2"
                >
                  {savingEdit ? (
                    <>
                      <svg
                        className="animate-spin w-3.5 h-3.5"
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
                    </>
                  ) : (
                    "Saqlash"
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <style>{`@keyframes modalIn{from{opacity:0;transform:scale(.96) translateY(8px)}to{opacity:1;transform:scale(1) translateY(0)}}`}</style>
    </>
  );
}
