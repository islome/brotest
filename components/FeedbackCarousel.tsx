"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { createClient } from "@/lib/supabase-browser";

export interface Testimonial {
  id: number | string;
  name: string | null;
  feedback: string;
  rate: number;
}

// Ismni "Ali K." ko'rinishiga keltiramiz (maxfiylik uchun familiya qisqartiriladi)
function displayName(name: string | null) {
  const clean = (name ?? "").trim();
  if (!clean) return "Foydalanuvchi";
  const parts = clean.split(/\s+/);
  if (parts.length >= 2) return `${parts[0]} ${parts[1][0].toUpperCase()}.`;
  return parts[0];
}

// Ismdan barqaror gradient tanlash
const GRADIENTS = [
  "linear-gradient(135deg,#6366f1,#8b5cf6)",
  "linear-gradient(135deg,#0ea5e9,#6366f1)",
  "linear-gradient(135deg,#f97316,#ef4444)",
  "linear-gradient(135deg,#22c55e,#16a34a)",
  "linear-gradient(135deg,#ec4899,#8b5cf6)",
  "linear-gradient(135deg,#14b8a6,#0ea5e9)",
];
function gradientFor(name: string | null) {
  const s = name ?? "?";
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return GRADIENTS[h % GRADIENTS.length];
}

function Stars({ rate }: { rate: number }) {
  return (
    <div style={{ display: "flex", gap: 2 }}>
      {[1, 2, 3, 4, 5].map((i) => (
        <svg
          key={i}
          width="15"
          height="15"
          viewBox="0 0 24 24"
          fill={i <= rate ? "#f59e0b" : "#e2e8f0"}
        >
          <polygon points="12 2 15 9 22 9.3 16.5 14 18.5 21 12 17 5.5 21 7.5 14 2 9.3 9 9" />
        </svg>
      ))}
    </div>
  );
}

function Card({ t }: { t: Testimonial }) {
  return (
    <div
      className="bg-white rounded-2xl border border-slate-100 p-5 sm:p-6 flex flex-col gap-4 transition-all hover:-translate-y-1 hover:shadow-lg"
      style={{ boxShadow: "0 2px 10px rgba(15,23,42,.05)", height: "100%" }}
    >
      <div className="flex items-center justify-between">
        <Stars rate={t.rate} />
        <svg
          width="26"
          height="26"
          viewBox="0 0 24 24"
          fill="#eef2ff"
          aria-hidden
        >
          <path d="M7 7h4v4c0 2.2-1.8 4-4 4v-2c1.1 0 2-.9 2-2H7V7zm8 0h4v4c0 2.2-1.8 4-4 4v-2c1.1 0 2-.9 2-2h-2V7z" />
        </svg>
      </div>

      <p
        className="text-sm text-slate-600 leading-relaxed m-0 flex-1"
        style={{
          display: "-webkit-box",
          WebkitLineClamp: 4,
          WebkitBoxOrient: "vertical",
          overflow: "hidden",
        }}
      >
        “{t.feedback}”
      </p>

      <div className="flex items-center gap-3 pt-1">
        <div
          className="flex items-center justify-center text-white font-bold shrink-0"
          style={{
            width: 38,
            height: 38,
            borderRadius: 12,
            fontSize: 15,
            background: gradientFor(t.name),
          }}
        >
          {(displayName(t.name)[0] ?? "U").toUpperCase()}
        </div>
        <div className="min-w-0">
          <p className="text-sm font-bold text-slate-800 m-0 truncate">
            {displayName(t.name)}
          </p>
          <p className="text-xs text-slate-400 m-0">Foydalanuvchi</p>
        </div>
      </div>
    </div>
  );
}

export default function FeedbackCarousel({
  items: itemsProp,
}: {
  items?: Testimonial[];
}) {
  const supabase = useMemo(() => createClient(), []);
  const [items, setItems] = useState<Testimonial[]>(itemsProp ?? []);
  const [idx, setIdx] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (itemsProp) return; // tashqaridan berilgan bo'lsa, fetch qilmaymiz
    let alive = true;
    (async () => {
      const { data } = await supabase
        .from("feedback")
        .select("id, name, feedback, rate")
        .gte("rate", 4)
        .not("feedback", "is", null)
        .order("created_at", { ascending: false })
        .limit(9);
      if (alive && data) {
        setItems(
          data.filter(
            (d): d is Testimonial =>
              typeof d.feedback === "string" && d.feedback.trim().length > 0,
          ),
        );
      }
    })();
    return () => {
      alive = false;
    };
  }, [supabase, itemsProp]);

  const n = items.length;
  const trackRef = useRef<HTMLDivElement>(null);

  // Bitta kartaga silliq scroll qiladi
  function scrollToIdx(i: number) {
    const track = trackRef.current;
    const card = track?.children[i] as HTMLElement | undefined;
    if (track && card)
      track.scrollTo({ left: card.offsetLeft, behavior: "smooth" });
    setIdx(i);
  }

  // Qo'lda scroll qilinganda faol nuqtani (dot) yangilab turamiz
  function handleScroll() {
    const track = trackRef.current;
    if (!track) return;
    let nearest = 0;
    let best = Infinity;
    Array.from(track.children).forEach((c, i) => {
      const d = Math.abs((c as HTMLElement).offsetLeft - track.scrollLeft);
      if (d < best) {
        best = d;
        nearest = i;
      }
    });
    setIdx(nearest);
  }

  // Auto-scroll: har 4 soniyada keyingi kartaga o'tadi (oxiridan boshiga qaytadi)
  useEffect(() => {
    if (n <= 1 || paused) return;
    const id = setInterval(() => {
      const track = trackRef.current;
      if (!track) return;
      let cur = 0;
      let best = Infinity;
      Array.from(track.children).forEach((c, i) => {
        const d = Math.abs((c as HTMLElement).offsetLeft - track.scrollLeft);
        if (d < best) {
          best = d;
          cur = i;
        }
      });
      const next = (cur + 1) % n;
      const card = track.children[next] as HTMLElement | undefined;
      if (card) track.scrollTo({ left: card.offsetLeft, behavior: "smooth" });
    }, 4000);
    return () => clearInterval(id);
  }, [n, paused]);

  if (n === 0) return null;

  return (
    <section className="px-5 pb-16 sm:pb-20">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8 sm:mb-10">
          
          <h2
            className="font-syne text-slate-900 tracking-tight mb-2"
            style={{ fontSize: "clamp(24px,4vw,40px)" }}
          >
            Foydalanuvchilarimiz fikri
          </h2>
          <p className="text-slate-500 text-sm sm:text-base max-w-md mx-auto">
            Brotest jamiyati platformamiz haqida nima deydi
          </p>
        </div>

        {/* Scrollable cards row */}
        <div
          ref={trackRef}
          onScroll={handleScroll}
          onMouseEnter={() => setPaused(true)}
          onMouseLeave={() => setPaused(false)}
          onTouchStart={() => setPaused(true)}
          className="fc-track flex gap-4 sm:gap-5 overflow-x-auto pb-2"
          style={{
            scrollSnapType: "x mandatory",
            scrollbarWidth: "none",
            WebkitOverflowScrolling: "touch",
          }}
        >
          {items.map((t) => (
            <div
              key={t.id}
              className="shrink-0 basis-[85%] sm:basis-[calc((100%-2.5rem)/3)]"
              style={{ scrollSnapAlign: "start" }}
            >
              <Card t={t} />
            </div>
          ))}
        </div>

        {/* Dots */}
        {n > 1 && (
          <div className="flex items-center justify-center gap-2 mt-8">
            {items.map((_, i) => (
              <button
                key={i}
                onClick={() => scrollToIdx(i)}
                aria-label={`Fikr ${i + 1}`}
                className="rounded-full transition-all cursor-pointer border-none"
                style={{
                  width: i === idx ? 22 : 7,
                  height: 7,
                  background: i === idx ? "#6366f1" : "#cbd5e1",
                }}
              />
            ))}
          </div>
        )}
      </div>

      <style>{`
        .fc-track::-webkit-scrollbar { display: none; }
      `}</style>
    </section>
  );
}
