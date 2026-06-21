"use client";

export function AnimatedGlobe() {
  return (
    <div className="zg-wrap" aria-hidden="true">
      <svg viewBox="0 0 400 400" className="zg-svg">
        <defs>
          <radialGradient id="zg-sphere" cx="38%" cy="32%" r="65%">
            <stop offset="0%" stopColor="#1c1c2e" />
            <stop offset="55%" stopColor="#0d0d18" />
            <stop offset="100%" stopColor="#060609" />
          </radialGradient>
          <radialGradient id="zg-glow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#6DB874" stopOpacity="0.12" />
            <stop offset="100%" stopColor="#6DB874" stopOpacity="0" />
          </radialGradient>
          <clipPath id="zg-clip">
            <circle cx="200" cy="200" r="158" />
          </clipPath>
        </defs>

        {/* Sphere base */}
        <circle cx="200" cy="200" r="158" fill="url(#zg-sphere)" />
        {/* Outer glow ring */}
        <circle cx="200" cy="200" r="172" fill="url(#zg-glow)" />

        {/* Rotating grid layer */}
        <g clipPath="url(#zg-clip)" className="zg-grid">
          <ellipse cx="200" cy="148" rx="122" ry="36" fill="none" stroke="rgba(255,255,255,0.055)" strokeWidth="0.6" />
          <ellipse cx="200" cy="200" rx="158" ry="47" fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth="0.6" />
          <ellipse cx="200" cy="252" rx="122" ry="36" fill="none" stroke="rgba(255,255,255,0.055)" strokeWidth="0.6" />
          <ellipse cx="200" cy="108" rx="72" ry="21" fill="none" stroke="rgba(255,255,255,0.03)" strokeWidth="0.5" />
          <ellipse cx="200" cy="292" rx="72" ry="21" fill="none" stroke="rgba(255,255,255,0.03)" strokeWidth="0.5" />
          <ellipse cx="200" cy="200" rx="48" ry="158" fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth="0.6" />
          <ellipse cx="200" cy="200" rx="108" ry="158" fill="none" stroke="rgba(255,255,255,0.035)" strokeWidth="0.5" />
          <ellipse cx="200" cy="200" rx="152" ry="158" fill="none" stroke="rgba(255,255,255,0.03)" strokeWidth="0.5" />
        </g>

        {/* Connection arcs — draw in on mount */}
        <path d="M268,112 C238,125 165,148 112,196" fill="none" stroke="#8B5CF6" strokeWidth="1" opacity="0.55" strokeDasharray="220" strokeDashoffset="220">
          <animate attributeName="strokeDashoffset" from="220" to="0" dur="1.6s" fill="freeze" begin="0.2s" calcMode="spline" keySplines="0.4 0 0.2 1" keyTimes="0;1" />
        </path>
        <path d="M112,196 C155,225 192,258 242,276" fill="none" stroke="#6DB874" strokeWidth="1" opacity="0.55" strokeDasharray="180" strokeDashoffset="180">
          <animate attributeName="strokeDashoffset" from="180" to="0" dur="1.5s" fill="freeze" begin="0.5s" calcMode="spline" keySplines="0.4 0 0.2 1" keyTimes="0;1" />
        </path>
        <path d="M268,112 C298,162 290,232 242,276" fill="none" stroke="#5B8FA8" strokeWidth="1" opacity="0.45" strokeDasharray="205" strokeDashoffset="205">
          <animate attributeName="strokeDashoffset" from="205" to="0" dur="1.8s" fill="freeze" begin="0.8s" calcMode="spline" keySplines="0.4 0 0.2 1" keyTimes="0;1" />
        </path>
        <path d="M183,152 C222,132 248,118 268,112" fill="none" stroke="rgba(255,255,255,0.18)" strokeWidth="0.7" strokeDasharray="110" strokeDashoffset="110">
          <animate attributeName="strokeDashoffset" from="110" to="0" dur="1.2s" fill="freeze" begin="1s" />
        </path>
        <path d="M152,268 C135,265 122,234 112,196" fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="0.7" strokeDasharray="105" strokeDashoffset="105">
          <animate attributeName="strokeDashoffset" from="105" to="0" dur="1.2s" fill="freeze" begin="1.2s" />
        </path>

        {/* Secondary nodes */}
        <circle cx="183" cy="152" r="2.5" fill="rgba(255,255,255,0.5)" />
        <circle cx="152" cy="268" r="2.5" fill="rgba(255,255,255,0.4)" />
        <circle cx="312" cy="218" r="2" fill="rgba(255,255,255,0.3)" />
        <circle cx="108" cy="132" r="2" fill="rgba(255,255,255,0.28)" />

        {/* AEON node — pulse */}
        <circle cx="268" cy="112" r="14" fill="#8B5CF6" opacity="0">
          <animate attributeName="r" values="6;18;6" dur="2.4s" repeatCount="indefinite" begin="0.4s" />
          <animate attributeName="opacity" values="0.35;0;0.35" dur="2.4s" repeatCount="indefinite" begin="0.4s" />
        </circle>
        <circle cx="268" cy="112" r="5.5" fill="#8B5CF6">
          <animate attributeName="r" values="5.5;6.5;5.5" dur="2.4s" repeatCount="indefinite" />
          <animate attributeName="opacity" values="0.9;1;0.9" dur="2.4s" repeatCount="indefinite" />
        </circle>

        {/* BANKR node — pulse */}
        <circle cx="112" cy="196" r="14" fill="#6DB874" opacity="0">
          <animate attributeName="r" values="6;18;6" dur="2.9s" repeatCount="indefinite" begin="0.7s" />
          <animate attributeName="opacity" values="0.35;0;0.35" dur="2.9s" repeatCount="indefinite" begin="0.7s" />
        </circle>
        <circle cx="112" cy="196" r="5.5" fill="#6DB874">
          <animate attributeName="r" values="5.5;6.5;5.5" dur="2.9s" repeatCount="indefinite" begin="0.3s" />
          <animate attributeName="opacity" values="0.9;1;0.9" dur="2.9s" repeatCount="indefinite" begin="0.3s" />
        </circle>

        {/* VIRTUALS node — pulse */}
        <circle cx="242" cy="276" r="14" fill="#5B8FA8" opacity="0">
          <animate attributeName="r" values="6;18;6" dur="2.6s" repeatCount="indefinite" begin="1.1s" />
          <animate attributeName="opacity" values="0.35;0;0.35" dur="2.6s" repeatCount="indefinite" begin="1.1s" />
        </circle>
        <circle cx="242" cy="276" r="5.5" fill="#5B8FA8">
          <animate attributeName="r" values="5.5;6.5;5.5" dur="2.6s" repeatCount="indefinite" begin="0.6s" />
          <animate attributeName="opacity" values="0.9;1;0.9" dur="2.6s" repeatCount="indefinite" begin="0.6s" />
        </circle>

        {/* Sphere edge + highlight */}
        <circle cx="200" cy="200" r="158" fill="none" stroke="rgba(109,184,116,0.09)" strokeWidth="1.5" />
        <path d="M98,135 Q200,62 302,135" fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth="1" />
      </svg>

      {/* Floating chips */}
      <div className="zg-chip zg-chip-1">
        <span className="zg-chip-dot" style={{ background: "#8B5CF6" }} />
        <div className="zg-chip-body">
          <span className="zg-chip-name">AEON</span>
          <span className="zg-chip-rev" style={{ color: "#8B5CF6" }}>Attributed</span>
        </div>
      </div>
      <div className="zg-chip zg-chip-2">
        <span className="zg-chip-dot" style={{ background: "#6DB874" }} />
        <div className="zg-chip-body">
          <span className="zg-chip-name">BANKR</span>
          <span className="zg-chip-rev" style={{ color: "#6DB874" }}>Attributed</span>
        </div>
      </div>
      <div className="zg-chip zg-chip-3">
        <span className="zg-chip-dot" style={{ background: "#5B8FA8" }} />
        <div className="zg-chip-body">
          <span className="zg-chip-name">VIRTUALS</span>
          <span className="zg-chip-rev" style={{ color: "#5B8FA8" }}>Attributed</span>
        </div>
      </div>
    </div>
  );
}
