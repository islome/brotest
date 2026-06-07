"use client";

/**
 * HeroIllustration
 * Premium, lightweight SaaS-style vector scene for the landing hero.
 * Composition: a sleek car gliding along a clean curved road (with subtle
 * motion), elegant road sign + lane markings, a floating driving-license card
 * and soft glassmorphism analytics panels (score ring + progress).
 *
 * Pure presentational / decorative — hidden from assistive tech.
 * Palette: navy #0B132B · purple #5B4BFF · soft gray · warm orange highlights.
 */
export default function HeroIllustration() {
  return (
    <div className="hi-wrap" aria-hidden="true">
      <style>{`
        .hi-wrap{
          position:relative;
          width:100%;
          max-width:560px;
          margin-inline:auto;
          aspect-ratio:520 / 540;
          --navy:#0B132B;
          --purple:#5B4BFF;
          --orange:#FF8A3D;
        }
        .hi-svg{position:absolute;inset:0;width:100%;height:100%;overflow:visible}

        /* soft ambient color blobs for depth */
        .hi-blob{position:absolute;border-radius:50%;filter:blur(46px);opacity:.5;z-index:0}
        .hi-blob-a{width:46%;height:46%;top:-6%;right:-4%;
          background:radial-gradient(circle,rgba(91,75,255,.55),transparent 70%)}
        .hi-blob-b{width:42%;height:42%;bottom:-2%;left:-6%;
          background:radial-gradient(circle,rgba(255,138,61,.42),transparent 70%)}

        /* floating glass cards */
        .hi-card{
          position:absolute;z-index:3;
          background:rgba(255,255,255,.72);
          backdrop-filter:blur(16px) saturate(160%);
          -webkit-backdrop-filter:blur(16px) saturate(160%);
          border:1px solid rgba(255,255,255,.7);
          box-shadow:0 18px 40px -18px rgba(11,19,43,.32),
                     0 2px 6px rgba(11,19,43,.05);
        }
        .hi-license{
          top:3%;left:-3%;width:60%;border-radius:18px;padding:14px 15px;
          animation:hiFloatA 7s ease-in-out infinite;
        }
        .hi-stats{
          bottom:1%;right:-6%;width:50%;border-radius:18px;padding:13px;
          animation:hiFloatB 8s ease-in-out infinite;
        }
        .hi-chip{
          z-index:4;top:30%;right:1%;display:flex;align-items:center;gap:6px;
          padding:8px 12px;border-radius:999px;font-size:12px;font-weight:700;
          color:var(--navy);letter-spacing:-.01em;
          background:rgba(255,255,255,.82);
          backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px);
          border:1px solid rgba(255,255,255,.75);
          box-shadow:0 12px 28px -14px rgba(11,19,43,.4);
          animation:hiFloatA 6.5s ease-in-out infinite .6s;
        }
        .hi-chip-dot{width:18px;height:18px;border-radius:6px;display:flex;
          align-items:center;justify-content:center;color:#fff;font-size:11px;
          background:linear-gradient(135deg,#22c55e,#16a34a)}

        /* license card internals */
        .hi-lic-head{display:flex;align-items:center;gap:10px}
        .hi-avatar{width:34px;height:34px;border-radius:10px;flex:0 0 auto;
          background:linear-gradient(135deg,#6E5BFF,#4536D6);
          box-shadow:0 4px 10px -3px rgba(91,75,255,.6)}
        .hi-lic-title{font-size:8px;font-weight:800;letter-spacing:.08em;
          color:#94a0b8;text-transform:uppercase;margin-bottom:5px}
        .hi-bar{height:6px;border-radius:4px;background:#dfe4f0}
        .hi-bar+.hi-bar{margin-top:5px}
        .hi-cat{margin-left:auto;flex:0 0 auto;width:24px;height:24px;
          border-radius:7px;display:flex;align-items:center;justify-content:center;
          font-size:12px;font-weight:800;color:#fff;
          background:linear-gradient(135deg,#243056,#0B132B)}
        .hi-lic-foot{display:flex;align-items:center;gap:8px;margin-top:12px}
        .hi-chip-gold{width:26px;height:20px;border-radius:5px;flex:0 0 auto;
          background:linear-gradient(135deg,#FFD27A,#FF8A3D)}
        .hi-dots{display:flex;gap:5px;flex:1}
        .hi-dots span{height:5px;border-radius:3px;background:#e4e8f2;flex:1}
        .hi-dots span:nth-child(1){flex:2}
        .hi-dots span:nth-child(3){flex:1.4}

        /* stats panel internals */
        .hi-stats-head{display:flex;align-items:center;gap:7px;
          font-size:11px;font-weight:700;color:#3a4358;margin-bottom:11px}
        .hi-live{width:7px;height:7px;border-radius:50%;background:var(--purple);
          box-shadow:0 0 0 3px rgba(91,75,255,.18);animation:hiPulse 2s infinite}
        .hi-stats-row{display:flex;align-items:center;gap:13px}
        .hi-ring-wrap{position:relative;width:62px;height:62px;flex:0 0 auto}
        .hi-ring-txt{position:absolute;inset:0;display:flex;flex-direction:column;
          align-items:center;justify-content:center}
        .hi-ring-pct{font-size:16px;font-weight:800;color:var(--navy);line-height:1}
        .hi-ring-sub{font-size:7px;font-weight:700;color:#9aa3b8;letter-spacing:.05em;
          text-transform:uppercase;margin-top:2px}
        .hi-prog{flex:1;display:flex;flex-direction:column;gap:9px}
        .hi-prog-item{display:flex;flex-direction:column;gap:4px}
        .hi-prog-lab{display:flex;justify-content:space-between;font-size:9px;
          font-weight:600;color:#7b859c}
        .hi-prog-track{height:5px;border-radius:3px;background:#e7eaf3;overflow:hidden}
        .hi-prog-fill{height:100%;border-radius:3px;
          background:linear-gradient(90deg,#6E5BFF,#9b8dff);
          transform-origin:left;animation:hiGrow 1.3s cubic-bezier(.22,1,.36,1) both}

        @keyframes hiFloatA{0%,100%{transform:translateY(0)}50%{transform:translateY(-9px)}}
        @keyframes hiFloatB{0%,100%{transform:translateY(0)}50%{transform:translateY(9px)}}
        @keyframes hiPulse{0%,100%{opacity:1}50%{opacity:.35}}
        @keyframes hiGrow{from{transform:scaleX(0)}to{transform:scaleX(1)}}
        @keyframes hiDash{to{stroke-dashoffset:-44}}
        @keyframes hiCarBob{0%,100%{transform:translateY(0)}50%{transform:translateY(-2.5px)}}
        @keyframes hiStreak{0%,100%{opacity:.18}50%{opacity:.5}}

        .hi-dash{animation:hiDash 1.1s linear infinite}
        .hi-car{animation:hiCarBob 3.2s ease-in-out infinite;transform-origin:center}
        .hi-streak{animation:hiStreak 1.6s ease-in-out infinite}

        @media (prefers-reduced-motion: reduce){
          .hi-license,.hi-stats,.hi-chip,.hi-car,.hi-dash,.hi-streak,.hi-live,
          .hi-prog-fill{animation:none}
          .hi-prog-fill{transform:none}
        }
      `}</style>

      <div className="hi-blob hi-blob-a" />
      <div className="hi-blob hi-blob-b" />

      <svg
        className="hi-svg"
        viewBox="0 0 520 540"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <linearGradient id="hiRoad" x1="260" y1="540" x2="320" y2="60" gradientUnits="userSpaceOnUse">
            <stop offset="0" stopColor="#141d3d" />
            <stop offset="1" stopColor="#0B132B" />
          </linearGradient>
          <linearGradient id="hiCarBody" x1="200" y1="330" x2="340" y2="440" gradientUnits="userSpaceOnUse">
            <stop offset="0" stopColor="#7766FF" />
            <stop offset="1" stopColor="#4836D8" />
          </linearGradient>
          <linearGradient id="hiCarRoof" x1="240" y1="320" x2="300" y2="370" gradientUnits="userSpaceOnUse">
            <stop offset="0" stopColor="#283364" />
            <stop offset="1" stopColor="#0e1733" />
          </linearGradient>
          <linearGradient id="hiGlass" x1="120" y1="60" x2="180" y2="120" gradientUnits="userSpaceOnUse">
            <stop offset="0" stopColor="#ffffff" stopOpacity=".9" />
            <stop offset="1" stopColor="#ffffff" stopOpacity=".55" />
          </linearGradient>
          <radialGradient id="hiStage" cx="50%" cy="42%" r="62%">
            <stop offset="0" stopColor="#ffffff" />
            <stop offset="1" stopColor="#eef1fa" />
          </radialGradient>
          <filter id="hiSoft" x="-40%" y="-40%" width="180%" height="180%">
            <feGaussianBlur stdDeviation="8" />
          </filter>
        </defs>

        {/* airy rounded stage */}
        <rect x="16" y="20" width="488" height="500" rx="40" fill="url(#hiStage)" />
        <rect x="16" y="20" width="488" height="500" rx="40" fill="none"
          stroke="#ffffff" strokeOpacity=".8" strokeWidth="1.5" />

        {/* faint guide grid (very subtle, premium) */}
        <g stroke="#5B4BFF" strokeOpacity=".05" strokeWidth="1">
          <path d="M16 180 H504" />
          <path d="M16 320 H504" />
          <path d="M160 20 V520" />
          <path d="M360 20 V520" />
        </g>

        {/* ── ROAD ── perspective curve, narrowing into distance */}
        <g>
          <path
            d="M150 520 C150 410 300 392 300 300 C300 210 320 150 332 92 L372 92 C360 150 348 214 348 300 C348 404 360 430 372 520 Z"
            fill="url(#hiRoad)"
          />
          {/* warm orange edge highlight (right) */}
          <path
            d="M348 300 C348 214 360 150 372 92"
            stroke="#FF8A3D" strokeOpacity=".75" strokeWidth="3" strokeLinecap="round"
          />
          {/* soft edge highlight (left) */}
          <path
            d="M300 300 C300 392 150 410 150 520"
            stroke="#5B4BFF" strokeOpacity=".35" strokeWidth="2.5" strokeLinecap="round"
          />
          {/* animated center lane dashes */}
          <path
            className="hi-dash"
            d="M261 520 C264 410 318 392 322 300 C326 214 342 150 352 92"
            stroke="#FFFFFF" strokeOpacity=".85" strokeWidth="5"
            strokeLinecap="round" strokeDasharray="2 20"
          />
        </g>

        {/* ── ROAD SIGN ── round speed-limit sign on a slim post */}
        <g>
          <rect x="116" y="262" width="5" height="86" rx="2.5" fill="#243056" />
          <circle cx="118" cy="256" r="27" fill="#ffffff" />
          <circle cx="118" cy="256" r="27" fill="none" stroke="#5B4BFF" strokeWidth="6" />
          <text x="118" y="256" textAnchor="middle" dominantBaseline="central"
            fontFamily="'DM Sans',sans-serif" fontSize="22" fontWeight="800" fill="#0B132B">
            50
          </text>
        </g>

        {/* ── directional curve sign (small, upper) ── */}
        <g transform="translate(398 150)">
          <rect x="-19" y="-19" width="38" height="38" rx="9" transform="rotate(45)"
            fill="#5B4BFF" />
          <path d="M-6 8 C-6 -2 6 -2 6 -10 M6 -10 L1 -7 M6 -10 L9 -5"
            stroke="#fff" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" fill="none" />
        </g>

        {/* ── CAR ── sleek rear 3/4 view, gliding away ── */}
        <g className="hi-car" transform="translate(-46 -10)">
          {/* motion streaks */}
          <g className="hi-streak" stroke="#5B4BFF" strokeLinecap="round">
            <path d="M150 392 H196" strokeWidth="4" strokeOpacity=".5" />
            <path d="M160 410 H200" strokeWidth="3" strokeOpacity=".35" />
            <path d="M344 392 H392" strokeWidth="4" strokeOpacity=".5" />
            <path d="M348 410 H388" strokeWidth="3" strokeOpacity=".35" />
          </g>

          {/* ground shadow */}
          <ellipse cx="271" cy="436" rx="80" ry="15" fill="#0B132B" opacity=".16" filter="url(#hiSoft)" />

          {/* wheels */}
          <rect x="201" y="406" width="20" height="30" rx="8" fill="#10162e" />
          <rect x="321" y="406" width="20" height="30" rx="8" fill="#10162e" />

          {/* body */}
          <path
            d="M214 428 C204 428 198 420 199 410 L205 360 C207 346 219 338 233 338 L309 338 C323 338 335 346 337 360 L343 410 C344 420 338 428 328 428 Z"
            fill="url(#hiCarBody)"
          />
          {/* roof + rear window glass */}
          <path
            d="M226 360 C228 350 236 344 246 344 L296 344 C306 344 314 350 316 360 L319 384 L223 384 Z"
            fill="url(#hiCarRoof)"
          />
          <path d="M232 360 C233 354 238 351 244 351 L298 351 C304 351 309 354 310 360 L312 378 L230 378 Z"
            fill="#46538a" opacity=".6" />

          {/* side mirrors */}
          <rect x="196" y="356" width="11" height="8" rx="4" fill="#4836D8" />
          <rect x="335" y="356" width="11" height="8" rx="4" fill="#4836D8" />

          {/* taillight bar (warm orange accent) */}
          <rect x="214" y="396" width="50" height="9" rx="4.5" fill="#FF8A3D" />
          <rect x="278" y="396" width="50" height="9" rx="4.5" fill="#FF8A3D" />
          <rect x="214" y="396" width="50" height="9" rx="4.5" fill="#FFB066" opacity=".5" />
          <rect x="278" y="396" width="50" height="9" rx="4.5" fill="#FFB066" opacity=".5" />

          {/* bumper + plate */}
          <rect x="234" y="412" width="74" height="13" rx="5" fill="#ffffff" opacity=".92" />
          <rect x="244" y="416" width="54" height="5" rx="2.5" fill="#c3cadb" />

          {/* roof highlight */}
          <path d="M236 348 C242 344 252 344 262 344" stroke="#fff" strokeOpacity=".4"
            strokeWidth="2" strokeLinecap="round" />
        </g>
      </svg>

      {/* ── floating driving-license card ── */}
      <div className="hi-card hi-license">
        <div className="hi-lic-head">
          <div className="hi-avatar" />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="hi-lic-title">Haydovchilik guvohnomasi</div>
            <div className="hi-bar" style={{ width: "78%" }} />
            <div className="hi-bar" style={{ width: "52%" }} />
          </div>
          <div className="hi-cat">B</div>
        </div>
        <div className="hi-lic-foot">
          <div className="hi-chip-gold" />
          <div className="hi-dots">
            <span /><span /><span /><span />
          </div>
        </div>
      </div>

      {/* ── floating analytics panel ── */}
      <div className="hi-card hi-stats">
        <div className="hi-stats-head">
          <span className="hi-live" /> Test natijasi
        </div>
        <div className="hi-stats-row">
          <div className="hi-ring-wrap">
            <svg width="62" height="62" viewBox="0 0 62 62">
              <defs>
                <linearGradient id="hiRing" x1="0" y1="0" x2="62" y2="62">
                  <stop offset="0" stopColor="#6E5BFF" />
                  <stop offset="1" stopColor="#9b8dff" />
                </linearGradient>
              </defs>
              <circle cx="31" cy="31" r="26" fill="none" stroke="#e7eaf3" strokeWidth="7" />
              <circle
                cx="31" cy="31" r="26" fill="none" stroke="url(#hiRing)" strokeWidth="7"
                strokeLinecap="round" strokeDasharray="163"
                strokeDashoffset="13" transform="rotate(-90 31 31)"
              />
            </svg>
            <div className="hi-ring-txt">
              <span className="hi-ring-pct">92%</span>
              <span className="hi-ring-sub">O&apos;tdi</span>
            </div>
          </div>
          <div className="hi-prog">
            {[
              { l: "To'g'ri javob", v: 92 },
              { l: "Yo'l belgilari", v: 85 },
              { l: "Tezlik", v: 74 },
            ].map((p, i) => (
              <div className="hi-prog-item" key={i}>
                <div className="hi-prog-lab">
                  <span>{p.l}</span>
                  <span>{p.v}%</span>
                </div>
                <div className="hi-prog-track">
                  <div
                    className="hi-prog-fill"
                    style={{ width: `${p.v}%`, animationDelay: `${0.25 + i * 0.15}s` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── floating success chip ── */}
      <div className="hi-card hi-chip">
        <span className="hi-chip-dot">✓</span>
        Imtihon o&apos;tdi
      </div>
    </div>
  );
}
