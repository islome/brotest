"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase-browser";

const PLUS_PRICE = 2.99;
const LIFE_PRICE = 39.99;

// ─── Types ───────────────────────────────────────────────────────────────────

interface UserRow {
  id: string;
  subscription: string;
  created_at: string;
}

interface DayData {
  day: string;
  label: string;
  newUsers: number;
  newPlus: number;
  newLife: number;
  cumulative: number;
}

interface Analytics {
  totalUsers: number;
  free: number;
  plus: number;
  life: number;
  totalRevenue: number;
  plusRevenue: number;
  lifeRevenue: number;
  newToday: number;
  newYesterday: number;
  days: DayData[];
}

// ─── Stat Card ────────────────────────────────────────────────────────────────

function StatCard({
  icon,
  title,
  value,
  sub,
  badge,
  badgeColor,
  accentColor,
}: {
  icon: string;
  title: string;
  value: string;
  sub: string;
  badge?: string;
  badgeColor?: "green" | "red" | "purple";
  accentColor: "blue" | "gray" | "purple" | "green";
}) {
  const accents = {
    blue: { border: "border-blue-100", bg: "bg-blue-50", label: "text-blue-600" },
    gray: { border: "border-gray-200", bg: "bg-gray-50", label: "text-gray-500" },
    purple: { border: "border-purple-100", bg: "bg-purple-50", label: "text-purple-600" },
    green: { border: "border-green-100", bg: "bg-green-50", label: "text-green-600" },
  };
  const badges = {
    green: "bg-green-50 text-green-600",
    red: "bg-red-50 text-red-500",
    purple: "bg-purple-50 text-purple-600",
  };
  const a = accents[accentColor];
  return (
    <div className={`rounded-xl border ${a.border} ${a.bg} p-4`}>
      <div className="flex items-center justify-between mb-2">
        <span className={`text-[11px] font-semibold uppercase tracking-wide ${a.label}`}>{title}</span>
        <span className="text-base">{icon}</span>
      </div>
      <div className="text-2xl font-bold text-gray-900 leading-none">{value}</div>
      <div className="text-[11px] text-gray-500 mt-1.5 leading-tight">{sub}</div>
      {badge && badgeColor && (
        <span className={`inline-block text-[10px] font-medium px-2 py-0.5 rounded-full mt-2 ${badges[badgeColor]}`}>
          {badge}
        </span>
      )}
    </div>
  );
}

// ─── Line Chart ───────────────────────────────────────────────────────────────

function LineChart({
  values,
  labels,
  color = "#3b82f6",
}: {
  values: number[];
  labels: string[];
  color?: string;
}) {
  const [hovered, setHovered] = useState<number | null>(null);

  if (!values.length) return null;

  const W = 580;
  const H = 175;
  const PAD = { t: 16, r: 16, b: 26, l: 40 };
  const cW = W - PAD.l - PAD.r;
  const cH = H - PAD.t - PAD.b;
  const max = Math.max(...values, 1);

  const pts = values.map((v, i) => ({
    x: PAD.l + (values.length > 1 ? i / (values.length - 1) : 0.5) * cW,
    y: PAD.t + cH - (v / max) * cH,
    v,
  }));

  const linePath = pts.map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");
  const areaPath =
    `${linePath} L${pts[pts.length - 1].x.toFixed(1)},${(PAD.t + cH).toFixed(1)} ` +
    `L${pts[0].x.toFixed(1)},${(PAD.t + cH).toFixed(1)}Z`;

  const yTicks = [0, Math.round(max / 2), max];
  const gradId = `g${color.replace("#", "")}`;
  const labelStep = Math.max(1, Math.ceil(labels.length / 7));

  return (
    <div className="relative w-full select-none">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full">
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.18} />
            <stop offset="100%" stopColor={color} stopOpacity={0.01} />
          </linearGradient>
        </defs>

        {/* Grid + Y labels */}
        {yTicks.map((t, ti) => {
          const y = PAD.t + cH - (t / max) * cH;
          return (
            <g key={ti}>
              <line x1={PAD.l} y1={y} x2={W - PAD.r} y2={y} stroke="#f3f4f6" strokeWidth={1} />
              <text x={PAD.l - 6} y={y + 4} fontSize={9} fill="#9ca3af" textAnchor="end">
                {t}
              </text>
            </g>
          );
        })}

        {/* Hover guideline */}
        {hovered !== null && (
          <line
            x1={pts[hovered].x}
            y1={PAD.t}
            x2={pts[hovered].x}
            y2={PAD.t + cH}
            stroke={color}
            strokeWidth={1}
            strokeDasharray="3,3"
            opacity={0.4}
          />
        )}

        {/* Area fill */}
        <path d={areaPath} fill={`url(#${gradId})`} />

        {/* Line */}
        <path
          d={linePath}
          fill="none"
          stroke={color}
          strokeWidth={2.5}
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* X labels */}
        {labels.map((label, i) =>
          i % labelStep === 0 ? (
            <text key={i} x={pts[i].x} y={H - 4} fontSize={9} fill="#9ca3af" textAnchor="middle">
              {label}
            </text>
          ) : null
        )}

        {/* Hover zones + dots + tooltips */}
        {pts.map((p, i) => {
          const slotW = cW / values.length;
          const isH = hovered === i;
          const tipX = Math.max(PAD.l + 30, Math.min(p.x, W - PAD.r - 30));
          return (
            <g key={i} onMouseEnter={() => setHovered(i)} onMouseLeave={() => setHovered(null)}>
              <rect
                x={p.x - slotW / 2}
                y={PAD.t}
                width={slotW}
                height={cH}
                fill="transparent"
                style={{ cursor: "crosshair" }}
              />
              <circle cx={p.x} cy={p.y} r={isH ? 5 : 3} fill="white" stroke={color} strokeWidth={2} />
              {isH && (
                <>
                  <rect x={tipX - 26} y={p.y - 30} width={52} height={22} rx={5} fill="#1e293b" />
                  <text
                    x={tipX}
                    y={p.y - 15}
                    fontSize={11}
                    fill="white"
                    textAnchor="middle"
                    fontWeight={600}
                  >
                    {p.v}
                  </text>
                </>
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
}

// ─── Bar Chart ────────────────────────────────────────────────────────────────

function BarChart({
  items,
}: {
  items: { label: string; value: number; color: string; display?: string; sub?: string }[];
}) {
  const max = Math.max(...items.map((d) => d.value), 0.01);
  const W = 380;
  const H = 185;
  const PAD = { t: 32, r: 16, b: 46, l: 16 };
  const cW = W - PAD.l - PAD.r;
  const cH = H - PAD.t - PAD.b;
  const slot = cW / items.length;
  const barW = Math.min(64, slot * 0.55);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full">
      {[0.5, 1].map((t) => (
        <line
          key={t}
          x1={PAD.l}
          y1={PAD.t + cH * (1 - t)}
          x2={W - PAD.r}
          y2={PAD.t + cH * (1 - t)}
          stroke="#f3f4f6"
          strokeWidth={1}
        />
      ))}
      {items.map((d, i) => {
        const barH = d.value > 0 ? Math.max((d.value / max) * cH, 4) : 0;
        const x = PAD.l + i * slot + (slot - barW) / 2;
        const barY = PAD.t + cH - barH;
        const disp = d.display ?? String(d.value);
        const textY = barH > 0 ? barY - 6 : PAD.t + cH - 6;
        return (
          <g key={d.label}>
            {barH > 0 && (
              <rect x={x} y={barY} width={barW} height={barH} fill={d.color} rx={5} />
            )}
            <text x={x + barW / 2} y={textY} fontSize={11} fill={d.color} textAnchor="middle" fontWeight={700}>
              {disp}
            </text>
            <text
              x={x + barW / 2}
              y={H - PAD.b + 16}
              fontSize={12}
              fill="#374151"
              textAnchor="middle"
              fontWeight={500}
            >
              {d.label}
            </text>
            {d.sub && (
              <text
                x={x + barW / 2}
                y={H - PAD.b + 30}
                fontSize={9}
                fill="#9ca3af"
                textAnchor="middle"
              >
                {d.sub}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}

// ─── Donut Chart ──────────────────────────────────────────────────────────────

function DonutChart({ items }: { items: { label: string; value: number; color: string }[] }) {
  const total = items.reduce((s, d) => s + d.value, 0) || 1;
  const cx = 70;
  const cy = 70;
  const R = 54;
  const r = 34;

  let offset = 0;
  const segs = items.map((d) => {
    const pct = d.value / total;
    const s = { ...d, pct, offset };
    offset += pct;
    return s;
  });

  function polar(pct: number, radius: number) {
    const a = pct * 2 * Math.PI - Math.PI / 2;
    return { x: cx + radius * Math.cos(a), y: cy + radius * Math.sin(a) };
  }

  function arc(startPct: number, span: number, oR: number, iR: number) {
    const endPct = startPct + Math.min(span, 0.9999);
    if (span < 0.001) return "";
    const s1 = polar(startPct, oR);
    const e1 = polar(endPct, oR);
    const s2 = polar(endPct, iR);
    const e2 = polar(startPct, iR);
    const large = span > 0.5 ? 1 : 0;
    return (
      `M${s1.x.toFixed(2)},${s1.y.toFixed(2)} ` +
      `A${oR},${oR} 0 ${large},1 ${e1.x.toFixed(2)},${e1.y.toFixed(2)} ` +
      `L${s2.x.toFixed(2)},${s2.y.toFixed(2)} ` +
      `A${iR},${iR} 0 ${large},0 ${e2.x.toFixed(2)},${e2.y.toFixed(2)}Z`
    );
  }

  return (
    <div className="flex items-center gap-6">
      <svg viewBox="0 0 140 140" className="w-32 shrink-0">
        {segs.map((s) => (
          <path key={s.label} d={arc(s.offset, s.pct, R, r)} fill={s.color} />
        ))}
        <text x={cx} y={cy - 2} fontSize={15} fill="#111827" textAnchor="middle" fontWeight={700}>
          {total.toLocaleString()}
        </text>
        <text x={cx} y={cy + 14} fontSize={9} fill="#9ca3af" textAnchor="middle">
          total users
        </text>
      </svg>
      <div className="space-y-3">
        {items.map((d) => (
          <div key={d.label} className="flex items-center gap-2.5">
            <div className="w-3 h-3 rounded-sm shrink-0" style={{ background: d.color }} />
            <div>
              <div className="flex items-baseline gap-1.5">
                <span className="text-sm font-semibold text-gray-800">{d.label}</span>
                <span className="text-sm text-gray-500">{d.value.toLocaleString()}</span>
              </div>
              <div className="text-[11px] text-gray-400">
                {Math.round((d.value / total) * 100)}% of users
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Data Processing ──────────────────────────────────────────────────────────

function processData(users: UserRow[]): Analytics {
  const totalUsers = users.length;
  const free = users.filter((u) => u.subscription === "free").length;
  const plus = users.filter((u) => u.subscription === "plus").length;
  const life = users.filter((u) => u.subscription === "life").length;
  const plusRevenue = plus * PLUS_PRICE;
  const lifeRevenue = life * LIFE_PRICE;
  const totalRevenue = plusRevenue + lifeRevenue;

  const todayStr = new Date().toISOString().split("T")[0];
  const yesterdayStr = new Date(Date.now() - 86400000).toISOString().split("T")[0];
  const newToday = users.filter((u) => u.created_at.startsWith(todayStr)).length;
  const newYesterday = users.filter((u) => u.created_at.startsWith(yesterdayStr)).length;

  const dayList: string[] = [];
  for (let i = 29; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    dayList.push(d.toISOString().split("T")[0]);
  }

  let cumulative = users.filter((u) => u.created_at < dayList[0] + "T").length;
  const days: DayData[] = dayList.map((day) => {
    const dayUsers = users.filter((u) => u.created_at.startsWith(day));
    cumulative += dayUsers.length;
    return {
      day,
      label: day.slice(5),
      newUsers: dayUsers.length,
      newPlus: dayUsers.filter((u) => u.subscription === "plus").length,
      newLife: dayUsers.filter((u) => u.subscription === "life").length,
      cumulative,
    };
  });

  return {
    totalUsers,
    free,
    plus,
    life,
    totalRevenue,
    plusRevenue,
    lifeRevenue,
    newToday,
    newYesterday,
    days,
  };
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AnalyticsPage() {
  const router = useRouter();
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Analytics | null>(null);

  useEffect(() => {
    async function load() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        router.push("/auth");
        return;
      }

      const { data: profile } = await supabase
        .from("users")
        .select("role")
        .eq("id", user.id)
        .single();
      if (profile?.role !== "admin") {
        router.push("/");
        return;
      }

      const { data: users } = await supabase
        .from("users")
        .select("id, subscription, created_at")
        .order("created_at", { ascending: true });

      if (!users) {
        setLoading(false);
        return;
      }
      setData(processData(users));
      setLoading(false);
    }
    load();
  }, []);

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto px-6 py-10 space-y-5">
        <div className="h-7 w-44 bg-gray-200 rounded-lg animate-pulse" />
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-24 bg-gray-200 rounded-xl animate-pulse" />
          ))}
        </div>
        <div className="h-56 bg-gray-200 rounded-xl animate-pulse" />
        <div className="h-56 bg-gray-200 rounded-xl animate-pulse" />
        <div className="grid grid-cols-2 gap-4">
          <div className="h-64 bg-gray-200 rounded-xl animate-pulse" />
          <div className="h-64 bg-gray-200 rounded-xl animate-pulse" />
        </div>
      </div>
    );
  }

  if (!data) return null;

  const {
    totalUsers,
    free,
    plus,
    life,
    totalRevenue,
    plusRevenue,
    lifeRevenue,
    newToday,
    newYesterday,
    days,
  } = data;

  const growthNum = newYesterday > 0 ? Math.round(((newToday - newYesterday) / newYesterday) * 100) : null;

  return (
    <div className="max-w-5xl mx-auto px-6 py-8 space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">User Analytics</h1>
          <p className="text-sm text-gray-400 mt-0.5">
            Real-time overview · {totalUsers.toLocaleString()} registered users
          </p>
        </div>
        <div className="flex gap-2 mt-1">
          <a
            href="/admin/addQuestion"
            className="text-xs px-3 py-1.5 rounded-lg bg-white border border-gray-200 text-gray-600 hover:bg-gray-50 transition"
          >
            Questions
          </a>
          <a
            href="/admin/signs"
            className="text-xs px-3 py-1.5 rounded-lg bg-white border border-gray-200 text-gray-600 hover:bg-gray-50 transition"
          >
            Signs
          </a>
        </div>
      </div>

      {/* ── Stat Cards ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard
          icon="👥"
          title="Total Users"
          value={totalUsers.toLocaleString()}
          sub={`${newToday > 0 ? "+" + newToday : "0"} today · ${newYesterday > 0 ? "+" + newYesterday : "0"} yesterday`}
          badge={
            growthNum !== null
              ? `${growthNum >= 0 ? "+" : ""}${growthNum}% vs yesterday`
              : undefined
          }
          badgeColor={growthNum !== null && growthNum >= 0 ? "green" : "red"}
          accentColor="blue"
        />
        <StatCard
          icon="🆓"
          title="Free Users"
          value={free.toLocaleString()}
          sub={`${totalUsers > 0 ? Math.round((free / totalUsers) * 100) : 0}% of all users`}
          accentColor="gray"
        />
        <StatCard
          icon="⭐"
          title="Subscribers"
          value={(plus + life).toLocaleString()}
          sub={`Plus: ${plus} · Life: ${life}`}
          badge={
            totalUsers > 0
              ? `${Math.round(((plus + life) / totalUsers) * 100)}% paid`
              : undefined
          }
          badgeColor="purple"
          accentColor="purple"
        />
        <StatCard
          icon="💰"
          title="Total Revenue"
          value={`$${totalRevenue.toFixed(2)}`}
          sub={`Plus $${plusRevenue.toFixed(0)} · Life $${lifeRevenue.toFixed(0)}`}
          accentColor="green"
        />
      </div>

      {/* ── Daily New Registrations ── */}
      <div className="bg-white rounded-xl border border-gray-100 p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-sm font-semibold text-gray-800">Daily New Registrations</h2>
            <p className="text-xs text-gray-400 mt-0.5">New user sign-ups per day · last 30 days</p>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="inline-block w-2.5 h-2.5 rounded-full bg-blue-500" />
            <span className="text-xs text-gray-500">New users</span>
          </div>
        </div>
        <LineChart
          values={days.map((d) => d.newUsers)}
          labels={days.map((d) => d.label)}
          color="#3b82f6"
        />
      </div>

      {/* ── Cumulative Growth ── */}
      <div className="bg-white rounded-xl border border-gray-100 p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-sm font-semibold text-gray-800">Cumulative User Growth</h2>
            <p className="text-xs text-gray-400 mt-0.5">
              Total registered users over time · last 30 days
            </p>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="inline-block w-2.5 h-2.5 rounded-full bg-indigo-500" />
            <span className="text-xs text-gray-500">Total users</span>
          </div>
        </div>
        <LineChart
          values={days.map((d) => d.cumulative)}
          labels={days.map((d) => d.label)}
          color="#6366f1"
        />
      </div>

      {/* ── Subscription + Revenue ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        {/* Donut */}
        <div className="bg-white rounded-xl border border-gray-100 p-5">
          <h2 className="text-sm font-semibold text-gray-800 mb-1">Subscription Distribution</h2>
          <p className="text-xs text-gray-400 mb-4">Breakdown of users by plan</p>
          <DonutChart
            items={[
              { label: "Free", value: free, color: "#94a3b8" },
              { label: "Plus ($2.99/mo)", value: plus, color: "#8b5cf6" },
              { label: "Life ($39.99)", value: life, color: "#f59e0b" },
            ]}
          />
        </div>

        {/* Revenue bars */}
        <div className="bg-white rounded-xl border border-gray-100 p-5">
          <h2 className="text-sm font-semibold text-gray-800 mb-1">Revenue by Plan</h2>
          <p className="text-xs text-gray-400 mb-4">
            Estimated from current subscriber counts
          </p>
          <BarChart
            items={[
              {
                label: "Plus",
                value: plusRevenue,
                color: "#8b5cf6",
                display: `$${plusRevenue.toFixed(0)}`,
                sub: `${plus} users × $${PLUS_PRICE}`,
              },
              {
                label: "Life",
                value: lifeRevenue,
                color: "#f59e0b",
                display: `$${lifeRevenue.toFixed(0)}`,
                sub: `${life} users × $${LIFE_PRICE}`,
              },
            ]}
          />
          <div className="mt-3 pt-3 border-t border-gray-50 flex items-center justify-between">
            <span className="text-xs text-gray-500">Total estimated revenue</span>
            <span className="text-base font-bold text-gray-900">${totalRevenue.toFixed(2)}</span>
          </div>
        </div>
      </div>

      {/* ── Daily Breakdown Table ── */}
      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-50">
          <h2 className="text-sm font-semibold text-gray-800">Daily Breakdown</h2>
          <p className="text-xs text-gray-400 mt-0.5">Last 14 days — most recent first</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50/70">
                {["Date", "New Users", "New Plus", "New Life", "Total Users", "Daily Rev."].map(
                  (h, i) => (
                    <th
                      key={h}
                      className={`text-[11px] font-semibold text-gray-400 uppercase tracking-wide py-3 ${
                        i === 0 ? "text-left px-5" : "text-right px-4"
                      } ${i === 5 ? "pr-5" : ""}`}
                    >
                      {h}
                    </th>
                  )
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {[...days]
                .reverse()
                .slice(0, 14)
                .map((d) => {
                  const dayRev = d.newPlus * PLUS_PRICE + d.newLife * LIFE_PRICE;
                  return (
                    <tr key={d.day} className="hover:bg-gray-50/50 transition">
                      <td className="px-5 py-3 text-xs font-medium text-gray-600">{d.day}</td>
                      <td className="px-4 py-3 text-right">
                        {d.newUsers > 0 ? (
                          <span className="text-xs font-semibold text-blue-600">+{d.newUsers}</span>
                        ) : (
                          <span className="text-xs text-gray-300">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {d.newPlus > 0 ? (
                          <span className="text-xs font-semibold text-purple-600">+{d.newPlus}</span>
                        ) : (
                          <span className="text-xs text-gray-300">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {d.newLife > 0 ? (
                          <span className="text-xs font-semibold text-amber-600">+{d.newLife}</span>
                        ) : (
                          <span className="text-xs text-gray-300">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right text-xs text-gray-500">
                        {d.cumulative.toLocaleString()}
                      </td>
                      <td className="px-5 py-3 text-right">
                        {dayRev > 0 ? (
                          <span className="text-xs font-semibold text-green-600">
                            +${dayRev.toFixed(2)}
                          </span>
                        ) : (
                          <span className="text-xs text-gray-300">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>
        <div className="px-5 py-3 bg-gray-50/40 border-t border-gray-50">
          <p className="text-[10px] text-gray-400">
            Revenue is estimated from new subscriber registrations per day (Plus: ${PLUS_PRICE}/mo ·
            Life: ${LIFE_PRICE} one-time). Reflects sign-up day estimates, not actual payment dates.
          </p>
        </div>
      </div>
    </div>
  );
}
