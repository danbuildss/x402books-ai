"use client";

export function AnimatedGlobe() {
  return (
    <div className="zg-wrap" aria-hidden="true">
      <svg viewBox="0 0 400 400" className="zg-svg">
        <defs>
          {/* Clip to sphere */}
          <clipPath id="zg-clip">
            <circle cx="200" cy="200" r="158" />
          </clipPath>

          {/* Vignette: darken edges to create spherical curvature illusion */}
          <radialGradient id="zg-vignette" cx="42%" cy="35%" r="65%">
            <stop offset="0%" stopColor="transparent" />
            <stop offset="58%" stopColor="transparent" />
            <stop offset="100%" stopColor="#010108" stopOpacity="0.85" />
          </radialGradient>

          {/* Top-left highlight for sphere light source */}
          <radialGradient id="zg-highlight" cx="35%" cy="28%" r="50%">
            <stop offset="0%" stopColor="rgba(200,220,255,0.07)" />
            <stop offset="100%" stopColor="transparent" />
          </radialGradient>

          {/* Subtle contrast boost on city lights */}
          <filter id="zg-lights" colorInterpolationFilters="sRGB">
            <feColorMatrix type="saturate" values="1.4" />
            <feComponentTransfer>
              <feFuncR type="gamma" amplitude="1" exponent="0.85" offset="0" />
              <feFuncG type="gamma" amplitude="1" exponent="0.85" offset="0" />
              <feFuncB type="gamma" amplitude="1" exponent="0.85" offset="0" />
            </feComponentTransfer>
          </filter>
        </defs>

        {/* Fallback background */}
        <circle cx="200" cy="200" r="158" fill="#010108" />

        {/* Earth night texture — equirectangular cropped to show Europe/Atlantic/India */}
        {/* Image: 2048×1024, displayed at 632×316, offset so lon≈20°E is centered */}
        <image
          href="/earth-night.png"
          x="-151"
          y="42"
          width="632"
          height="316"
          clipPath="url(#zg-clip)"
          filter="url(#zg-lights)"
          preserveAspectRatio="none"
        />

        {/* Vignette overlay — creates spherical depth */}
        <circle cx="200" cy="200" r="158" fill="url(#zg-vignette)" clipPath="url(#zg-clip)" />

        {/* Specular highlight */}
        <circle cx="200" cy="200" r="158" fill="url(#zg-highlight)" clipPath="url(#zg-clip)" />

        {/* Atmosphere rim — outer soft green glow */}
        <circle cx="200" cy="200" r="170" fill="none" stroke="#4AE8A0" strokeWidth="22" strokeOpacity="0.07" />
        <circle cx="200" cy="200" r="163" fill="none" stroke="#4AE8A0" strokeWidth="8"  strokeOpacity="0.09" />
        <circle cx="200" cy="200" r="158" fill="none" stroke="rgba(74,232,160,0.18)"  strokeWidth="1.2" />

        {/* Connection arcs — draw in on mount */}
        {/* AEON (183,112) → BANKR (139,191) */}
        <path d="M183,112 C165,140 148,168 139,191" fill="none" stroke="#8B7CF6" strokeWidth="1.2" opacity="0.65" strokeDasharray="200" strokeDashoffset="200">
          <animate attributeName="strokeDashoffset" from="200" to="0" dur="1.5s" fill="freeze" begin="0.3s" calcMode="spline" keySplines="0.4 0 0.2 1" keyTimes="0;1" />
        </path>
        {/* BANKR (139,191) → VIRTUALS (297,165) */}
        <path d="M139,191 C188,202 242,188 297,165" fill="none" stroke="#4AE8A0" strokeWidth="1.2" opacity="0.65" strokeDasharray="175" strokeDashoffset="175">
          <animate attributeName="strokeDashoffset" from="175" to="0" dur="1.6s" fill="freeze" begin="0.6s" calcMode="spline" keySplines="0.4 0 0.2 1" keyTimes="0;1" />
        </path>
        {/* AEON (183,112) → VIRTUALS (297,165) */}
        <path d="M183,112 C228,122 268,142 297,165" fill="none" stroke="#5B9EF4" strokeWidth="1.0" opacity="0.50" strokeDasharray="160" strokeDashoffset="160">
          <animate attributeName="strokeDashoffset" from="160" to="0" dur="1.8s" fill="freeze" begin="0.9s" calcMode="spline" keySplines="0.4 0 0.2 1" keyTimes="0;1" />
        </path>
        {/* Faint secondary arcs */}
        <path d="M183,112 C172,135 158,160 139,191" fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth="0.6" strokeDasharray="130" strokeDashoffset="130">
          <animate attributeName="strokeDashoffset" from="130" to="0" dur="1.2s" fill="freeze" begin="1.1s" />
        </path>

        {/* AEON node — Western Europe cluster */}
        <circle cx="183" cy="112" r="14" fill="#8B7CF6" opacity="0">
          <animate attributeName="r" values="6;18;6" dur="2.4s" repeatCount="indefinite" begin="0.5s" />
          <animate attributeName="opacity" values="0.3;0;0.3" dur="2.4s" repeatCount="indefinite" begin="0.5s" />
        </circle>
        <circle cx="183" cy="112" r="5.5" fill="#8B7CF6">
          <animate attributeName="r" values="5.5;6.5;5.5" dur="2.4s" repeatCount="indefinite" />
          <animate attributeName="opacity" values="0.9;1;0.9" dur="2.4s" repeatCount="indefinite" />
        </circle>

        {/* BANKR node — Atlantic / West Africa */}
        <circle cx="139" cy="191" r="14" fill="#4AE8A0" opacity="0">
          <animate attributeName="r" values="6;18;6" dur="2.9s" repeatCount="indefinite" begin="0.8s" />
          <animate attributeName="opacity" values="0.3;0;0.3" dur="2.9s" repeatCount="indefinite" begin="0.8s" />
        </circle>
        <circle cx="139" cy="191" r="5.5" fill="#4AE8A0">
          <animate attributeName="r" values="5.5;6.5;5.5" dur="2.9s" repeatCount="indefinite" begin="0.3s" />
          <animate attributeName="opacity" values="0.9;1;0.9" dur="2.9s" repeatCount="indefinite" begin="0.3s" />
        </circle>

        {/* VIRTUALS node — South Asia / India */}
        <circle cx="297" cy="165" r="14" fill="#5B9EF4" opacity="0">
          <animate attributeName="r" values="6;18;6" dur="2.6s" repeatCount="indefinite" begin="1.2s" />
          <animate attributeName="opacity" values="0.3;0;0.3" dur="2.6s" repeatCount="indefinite" begin="1.2s" />
        </circle>
        <circle cx="297" cy="165" r="5.5" fill="#5B9EF4">
          <animate attributeName="r" values="5.5;6.5;5.5" dur="2.6s" repeatCount="indefinite" begin="0.6s" />
          <animate attributeName="opacity" values="0.9;1;0.9" dur="2.6s" repeatCount="indefinite" begin="0.6s" />
        </circle>
      </svg>

      {/* Floating chips — slide in from sides */}
      <div className="zg-chip zg-chip-1">
        <span className="zg-chip-dot" style={{ background: "#8B7CF6" }} />
        <div className="zg-chip-body">
          <span className="zg-chip-name">AEON</span>
          <span className="zg-chip-rev" style={{ color: "#8B7CF6" }}>Attributed</span>
        </div>
      </div>
      <div className="zg-chip zg-chip-2">
        <span className="zg-chip-dot" style={{ background: "#4AE8A0" }} />
        <div className="zg-chip-body">
          <span className="zg-chip-name">BANKR</span>
          <span className="zg-chip-rev" style={{ color: "#4AE8A0" }}>Attributed</span>
        </div>
      </div>
      <div className="zg-chip zg-chip-3">
        <span className="zg-chip-dot" style={{ background: "#5B9EF4" }} />
        <div className="zg-chip-body">
          <span className="zg-chip-name">VIRTUALS</span>
          <span className="zg-chip-rev" style={{ color: "#5B9EF4" }}>Attributed</span>
        </div>
      </div>
    </div>
  );
}
