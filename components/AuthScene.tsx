"use client";
import Image from "next/image";

/**
 * AuthScene
 * Decorative animated scene for the auth page's showcase panel.
 * A BMW M5 (user-supplied photo) gliding toward the viewer on a road, with a
 * floating Uzbek national driving licence (flag + category B highlighted)
 * above it — sparkles, ambient blobs and glass info chips in the landing
 * page's premium style.
 *
 * Purely presentational — hidden from assistive tech.
 */
export default function AuthScene() {
  return (
    <div className="as-wrap" aria-hidden="true">
      <style>{`
        .as-wrap{
          position:relative;width:100%;max-width:480px;margin-inline:auto;
          aspect-ratio:460 / 470;
          --orange:#FF8A3D;--gold:#FFC64D;--lilac:#B7AEFF;--ink:#0B1230;
        }
        .as-svg{position:absolute;inset:0;width:100%;height:100%;overflow:visible;z-index:1}

        /* ambient blobs */
        .as-blob{position:absolute;border-radius:50%;filter:blur(48px);z-index:0}
        .as-blob-a{width:52%;height:52%;top:-8%;left:-10%;opacity:.55;
          background:radial-gradient(circle,rgba(255,138,61,.55),transparent 70%)}
        .as-blob-b{width:48%;height:48%;bottom:-6%;right:-8%;opacity:.5;
          background:radial-gradient(circle,rgba(183,174,255,.6),transparent 70%)}

        /* the car photo */
        .as-car{position:absolute;left:8%;right:8%;top:30%;bottom:8%;z-index:3;
          animation:asCarBob 4s ease-in-out infinite}

        /* floating glass chips */
        .as-chip{position:absolute;z-index:4;display:flex;align-items:center;gap:8px;
          padding:9px 13px;border-radius:14px;font-size:12.5px;font-weight:700;
          color:#fff;letter-spacing:-.01em;white-space:nowrap;
          background:rgba(255,255,255,.13);
          backdrop-filter:blur(12px) saturate(150%);
          -webkit-backdrop-filter:blur(12px) saturate(150%);
          border:1px solid rgba(255,255,255,.28);
          box-shadow:0 16px 34px -16px rgba(8,10,40,.6)}
        .as-chip-a{top:4%;right:-1%;animation:asFloatA 6.4s ease-in-out infinite}
        .as-chip-b{bottom:10%;left:-4%;animation:asFloatB 7.2s ease-in-out infinite .5s}
        .as-chip-ico{width:22px;height:22px;border-radius:8px;flex:0 0 auto;
          display:flex;align-items:center;justify-content:center;font-size:12px;color:#fff}
        .as-ico-grad{background:linear-gradient(135deg,#34d399,#10b981)}
        .as-ico-gold{background:linear-gradient(135deg,var(--gold),var(--orange));color:#3a2406}

        /* animations */
        @keyframes asFloatA{0%,100%{transform:translateY(0)}50%{transform:translateY(-10px)}}
        @keyframes asFloatB{0%,100%{transform:translateY(0)}50%{transform:translateY(10px)}}
        @keyframes asCarBob{0%,100%{transform:translateY(0)}50%{transform:translateY(-6px)}}
        @keyframes asLicFloat{0%,100%{transform:translateY(0)}50%{transform:translateY(-9px)}}
        @keyframes asDash{to{stroke-dashoffset:-40}}
        @keyframes asTwinkle{0%,100%{opacity:.25;transform:scale(.7)}50%{opacity:1;transform:scale(1)}}

        .as-license{animation:asLicFloat 6s ease-in-out infinite}
        .as-dash{animation:asDash 1.1s linear infinite}
        .as-tw{animation:asTwinkle 2.6s ease-in-out infinite;transform-box:fill-box;transform-origin:center}
        .as-tw2{animation:asTwinkle 3.2s ease-in-out infinite .8s;transform-box:fill-box;transform-origin:center}
        .as-tw3{animation:asTwinkle 2.2s ease-in-out infinite 1.3s;transform-box:fill-box;transform-origin:center}

        @media (prefers-reduced-motion: reduce){
          .as-chip-a,.as-chip-b,.as-car,.as-license,.as-dash,.as-tw,.as-tw2,.as-tw3{animation:none}
        }
      `}</style>

      <div className="as-blob as-blob-a" />
      <div className="as-blob as-blob-b" />

      <svg className="as-svg" viewBox="0 0 460 470" fill="none" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="asBowtie" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#FFDB7A" />
            <stop offset="1" stopColor="#F59E1B" />
          </linearGradient>
          <linearGradient id="asRoad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#222d54" />
            <stop offset="1" stopColor="#0c1430" />
          </linearGradient>
        </defs>

        {/* faint guide grid */}
        <g stroke="#ffffff" strokeOpacity=".07" strokeWidth="1">
          <path d="M0 150 H460" /><path d="M0 300 H460" />
          <path d="M150 0 V470" /><path d="M310 0 V470" />
        </g>

        {/* ── ROAD (car glides toward viewer) ── */}
        <path d="M130 384 L330 384 L404 466 L56 466 Z" fill="url(#asRoad)" />
        <path d="M132 384 L58 464" stroke="var(--orange)" strokeOpacity=".5" strokeWidth="2.5" strokeLinecap="round" />
        <path d="M328 384 L402 464" stroke="#7c8cff" strokeOpacity=".4" strokeWidth="2.5" strokeLinecap="round" />
        <path className="as-dash" d="M230 388 L230 466" stroke="#ffffff" strokeOpacity=".8" strokeWidth="5" strokeLinecap="round" strokeDasharray="2 18" />

        {/* ground shadow under the car */}
        <ellipse cx="230" cy="420" rx="124" ry="18" fill="#05071c" opacity=".36" />

        {/* ── twinkling sparkles ── */}
        <g>
          <path className="as-tw" d="M392 120 l3 8 8 3 -8 3 -3 8 -3 -8 -8 -3 8 -3 z" fill="#FFE3CC" />
          <path className="as-tw2" d="M410 256 l2.4 6 6 2.4 -6 2.4 -2.4 6 -2.4 -6 -6 -2.4 6 -2.4 z" fill="#B7AEFF" />
          <path className="as-tw3" d="M58 320 l2.2 5.5 5.5 2.2 -5.5 2.2 -2.2 5.5 -2.2 -5.5 -5.5 -2.2 5.5 -2.2 z" fill="#FFE3CC" />
        </g>

        {/* ── UZBEK DRIVING LICENCE (floating) ── */}
        <g transform="translate(104 124) rotate(-8)">
          <g className="as-license">
            <ellipse cx="0" cy="46" rx="58" ry="8" fill="#05071c" opacity=".22" />
            <rect x="-62" y="-43" width="124" height="86" rx="13" fill="#ffffff" />
            <rect x="-62" y="-43" width="124" height="86" rx="13" fill="none" stroke="#f0d7e0" strokeWidth="1.5" />
            <rect x="-62" y="-43" width="124" height="13" rx="13" fill="#fbeef2" />
            <rect x="-62" y="-36" width="124" height="6" fill="#fbeef2" />

            {/* flag */}
            <g>
              <rect x="-54" y="-38" width="27" height="15" rx="1.5" fill="#1FA8DC" />
              <rect x="-54" y="-33.4" width="27" height="6.2" fill="#ffffff" />
              <rect x="-54" y="-33.6" width="27" height="0.9" fill="#CE1126" />
              <rect x="-54" y="-27.4" width="27" height="0.9" fill="#CE1126" />
              <rect x="-54" y="-26.6" width="27" height="3.6" fill="#1EB53A" />
              <circle cx="-48.5" cy="-34.6" r="2" fill="#ffffff" />
              <circle cx="-47.4" cy="-34.6" r="1.7" fill="#1FA8DC" />
              <circle cx="-44.6" cy="-35.4" r="0.5" fill="#fff" />
              <circle cx="-44.2" cy="-33.6" r="0.5" fill="#fff" />
            </g>
            {/* title lines */}
            <rect x="-22" y="-37" width="72" height="3" rx="1.5" fill="#b9243f" />
            <rect x="-22" y="-32" width="52" height="2.2" rx="1.1" fill="#aab0c6" />

            {/* photo */}
            <rect x="-54" y="-19" width="30" height="40" rx="4" fill="#eef1f8" />
            <circle cx="-39" cy="-5" r="7" fill="#c2c9dd" />
            <path d="M-51 21 C-51 9 -27 9 -27 21 Z" fill="#c2c9dd" />

            {/* fields */}
            <g fill="#d6dbe9">
              <rect x="-18" y="-16" width="66" height="3" rx="1.5" />
              <rect x="-18" y="-8" width="54" height="3" rx="1.5" />
              <rect x="-18" y="0" width="60" height="3" rx="1.5" />
              <rect x="-18" y="8" width="42" height="3" rx="1.5" />
            </g>

            {/* category badges (B highlighted) */}
            <g>
              {[
                { x: -54, c: "#eef1f8", t: "#8a93ad", l: "A" },
                { x: -37, c: "url(#asBowtie)", t: "#5a3a06", l: "B" },
                { x: -20, c: "#eef1f8", t: "#8a93ad", l: "C" },
                { x: -3, c: "#eef1f8", t: "#8a93ad", l: "D" },
                { x: 14, c: "#eef1f8", t: "#8a93ad", l: "E" },
              ].map((b) => (
                <g key={b.l}>
                  <rect x={b.x} y="26" width="14" height="13" rx="3" fill={b.c} />
                  <text
                    x={b.x + 7}
                    y="35.5"
                    textAnchor="middle"
                    fontFamily="'DM Sans',sans-serif"
                    fontSize="8"
                    fontWeight="800"
                    fill={b.t}
                  >
                    {b.l}
                  </text>
                </g>
              ))}
              <rect x="33" y="32" width="28" height="3" rx="1.5" fill="#d6dbe9" />
              <rect x="40" y="38" width="21" height="2.4" rx="1.2" fill="#e2e6f0" />
            </g>
          </g>
        </g>
      </svg>

      {/* ── BMW M5 photo ── */}
      <div className="as-car">
        <Image
          src="/m5.webp"
          alt=""
          fill
          priority
          sizes="(max-width: 1024px) 70vw, 420px"
          style={{ objectFit: "contain", objectPosition: "center bottom" }}
        />
      </div>

      {/* ── glass info chips ── */}
      <div className="as-chip as-chip-a">
        <span className="as-chip-ico as-ico-grad">✓</span>
        Imtihondan o&apos;ting
      </div>
      <div className="as-chip as-chip-b">
        <span className="as-chip-ico as-ico-gold">B</span>
        Guvohnomaga tayyor
      </div>
    </div>
  );
}
