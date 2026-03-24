import { useState, useEffect, useRef, useCallback } from "react";

const GOLD = "#c9a84c";
const BG = "#0c0c0a";
const CARD = "#0f0f0d";

// ═══════════════════════════════════════════════
// COMPLEX MATH ENGINE
// ═══════════════════════════════════════════════
const C = {
  make: (re, im = 0) => ({ re, im }),
  add: (a, b) => ({ re: a.re + b.re, im: a.im + b.im }),
  mul: (a, b) => ({ re: a.re*b.re - a.im*b.im, im: a.re*b.im + a.im*b.re }),
  scale: (a, s) => ({ re: a.re * s, im: a.im * s }),
  abs2: (a) => a.re * a.re + a.im * a.im,
  exp: (a) => ({ re: Math.exp(a.re) * Math.cos(a.im), im: Math.exp(a.re) * Math.sin(a.im) }),
};

// Lindbladian eigenvalues (computed from our proof)
const EIGENVALUES = [
  { lambda: { re: -1.0, im: 1.2114 }, label: "OSCILLATE A", color: "#7ca" },
  { lambda: { re: 0, im: 0 }, label: "STATIONARY", color: GOLD },
  { lambda: { re: -1.0, im: -1.2114 }, label: "OSCILLATE B", color: "#a7c" },
  { lambda: { re: -2.0, im: 0 }, label: "FAST DECAY", color: "#c77" },
];

// ═══════════════════════════════════════════════
// SECTION 1: JS PROMISE vs NATIV3 SHIFT
// ═══════════════════════════════════════════════

function PromiseVsShift() {
  const [jsStep, setJsStep] = useState(0);
  const [n3Step, setN3Step] = useState(0);
  const [jsState, setJsState] = useState("pending");
  const [jsValue, setJsValue] = useState(null);
  const [n3Facing, setN3Facing] = useState(1);
  const [n3Amps, setN3Amps] = useState([1, 0]); // |0⟩
  const [n3Measured, setN3Measured] = useState(false);
  const [n3Entangled, setN3Entangled] = useState(false);

  const resetJS = () => { setJsStep(0); setJsState("pending"); setJsValue(null); };
  const resetN3 = () => { setN3Step(0); setN3Facing(1); setN3Amps([1, 0]); setN3Measured(false); setN3Entangled(false); };

  const advanceJS = () => {
    if (jsStep === 0) {
      setJsStep(1); setJsState("pending");
    } else if (jsStep === 1) {
      const val = Math.random() > 0.5 ? +1 : -1;
      setJsStep(2); setJsState("fulfilled"); setJsValue(val);
    } else if (jsStep === 2) {
      const val = Math.random() > 0.5 ? +1 : -1;
      setJsStep(3); setJsValue(val);
    }
  };

  const advanceN3 = () => {
    if (n3Step === 0) {
      // Hadamard: |0⟩ → (|0⟩+|1⟩)/√2
      setN3Amps([1/Math.sqrt(2), 1/Math.sqrt(2)]);
      setN3Step(1);
    } else if (n3Step === 1) {
      // CNOT: create entanglement (simulated)
      setN3Entangled(true);
      setN3Step(2);
    } else if (n3Step === 2) {
      // Measure
      const p = n3Amps[1] * n3Amps[1];
      const flipped = Math.random() < p;
      setN3Facing(flipped ? -1 : 1);
      setN3Amps(flipped ? [0, 1] : [1, 0]);
      setN3Measured(true);
      setN3Step(3);
    } else if (n3Step === 3) {
      // Re-shift
      setN3Amps([1/Math.sqrt(2), 1/Math.sqrt(2)]);
      setN3Measured(false);
      setN3Entangled(true);
      setN3Step(2);
    }
  };

  const jsSteps = [
    { code: "const p = new Promise((resolve) => {", label: "CREATE", desc: "Promise created. Value doesn't exist yet." },
    { code: "  // ...pending...", label: "PENDING", desc: "Commitment exists. Resolution doesn't. Both outcomes possible." },
    { code: `  resolve(${jsValue > 0 ? "+1" : "-1"});`, label: "RESOLVE", desc: `Promise fulfilled with ${jsValue > 0 ? "+1" : "-1"}. One outcome chosen. Done.` },
    { code: `}).then(v => new Promise(...))`, label: ".then()", desc: "Chain to next promise. Old value gone. New pending state." },
  ];

  const n3Steps = [
    { code: "let |ψ⟩ = |0⟩;", label: "STATE", desc: "Qubit exists. Definite. Facing +∞. No uncertainty." },
    { code: "|ψ⟩ = H|ψ⟩ = (|0⟩+|1⟩)/√2", label: "HADAMARD", desc: "Superposition. BOTH states simultaneously. Not pending — BEING both." },
    { code: "|ψ⟩ = CNOT → entangled", label: "ENTANGLE", desc: "Promise PASSED. Not copied — referenced. Shared fate created." },
    { code: `M(|ψ⟩) → ${n3Facing > 0 ? "|0⟩" : "|1⟩"} → shift()`, label: "COLLAPSE", desc: `Measured: ${n3Facing > 0 ? "+1" : "-1"}. Collapse + immediate re-shift. The chain never ends.` },
  ];

  return (
    <div>
      <h3 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 24, fontWeight: 300, color: "#e8dcc8", margin: "0 0 24px" }}>
        Promise vs Shift
      </h3>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        {/* JS Side */}
        <div style={{ background: CARD, padding: 16, borderRadius: 4, border: "1px solid #1a1a16" }}>
          <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9, color: "#c77", letterSpacing: 3, marginBottom: 12 }}>
            JAVASCRIPT PROMISE
          </div>
          <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9, color: "#444", letterSpacing: 2, marginBottom: 8 }}>
            1D · SCALAR · ONE TIMELINE
          </div>

          {/* State indicator */}
          <div style={{
            textAlign: "center", padding: "12px", margin: "8px 0",
            background: jsState === "pending" ? "#1a1510" : jsState === "fulfilled" ? "#151a15" : "#1a1515",
            borderRadius: 4, border: `1px solid ${jsState === "pending" ? "#553" : "#353"}`,
          }}>
            <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: jsState === "pending" ? "#aa8" : "#8a8" }}>
              {jsState.toUpperCase()}
            </div>
            {jsValue !== null && (
              <div style={{ fontFamily: "Georgia, serif", fontSize: 20, color: jsValue > 0 ? GOLD : "#7a6530", marginTop: 4 }}>
                {jsValue > 0 ? "+1" : "−1"}
              </div>
            )}
          </div>

          {/* Code display */}
          <pre style={{
            fontFamily: "'JetBrains Mono', monospace", fontSize: 10,
            color: "#888", background: "#0a0a08", padding: 10, borderRadius: 3,
            margin: "8px 0", lineHeight: 1.6, minHeight: 48, whiteSpace: "pre-wrap",
          }}>
            {jsSteps[jsStep]?.code}
          </pre>

          <div style={{
            fontFamily: "'Cormorant Garamond', serif", fontSize: 13,
            color: "#666", fontWeight: 300, minHeight: 40,
          }}>
            {jsSteps[jsStep]?.desc}
          </div>

          <div style={{ display: "flex", gap: 6, marginTop: 12 }}>
            <button onClick={advanceJS} disabled={jsStep > 3} style={{
              flex: 1, padding: "8px", fontSize: 9, fontFamily: "'JetBrains Mono', monospace",
              background: "transparent", border: "1px solid #333", borderRadius: 3,
              color: "#888", cursor: jsStep > 3 ? "not-allowed" : "pointer", letterSpacing: 2,
            }}>{jsSteps[Math.min(jsStep, 3)]?.label || "DONE"}</button>
            <button onClick={resetJS} style={{
              padding: "8px 12px", fontSize: 9, fontFamily: "'JetBrains Mono', monospace",
              background: "transparent", border: "1px solid #222", borderRadius: 3,
              color: "#444", cursor: "pointer",
            }}>↺</button>
          </div>
        </div>

        {/* N3 Side */}
        <div style={{ background: CARD, padding: 16, borderRadius: 4, border: `1px solid ${GOLD}22` }}>
          <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9, color: GOLD, letterSpacing: 3, marginBottom: 12 }}>
            NATIV3 SHIFT
          </div>
          <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9, color: "#444", letterSpacing: 2, marginBottom: 8 }}>
            TENSOR · MULTI-EIGEN · ALL TIMELINES
          </div>

          {/* State indicator */}
          <div style={{
            textAlign: "center", padding: "12px", margin: "8px 0",
            background: n3Step === 1 || n3Step === 2 ? `${GOLD}11` : "#111",
            borderRadius: 4,
            border: `1px solid ${n3Entangled && !n3Measured ? GOLD + "44" : "#222"}`,
            animation: (n3Step === 1 || (n3Step === 2 && !n3Measured)) ? "pulse 2s infinite" : "none",
          }}>
            <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: n3Entangled && !n3Measured ? GOLD : "#666" }}>
              {n3Step === 0 ? "DEFINITE" : n3Step === 1 ? "SUPERPOSED" : n3Measured ? "COLLAPSED" : "ENTANGLED"}
            </div>
            <div style={{ fontFamily: "Georgia, serif", fontSize: 20, color: GOLD, marginTop: 4 }}>
              {n3Step === 0 ? "+1" : n3Measured ? (n3Facing > 0 ? "+1" : "−1") : "±1"}
            </div>
            {n3Entangled && !n3Measured && (
              <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 8, color: "#555", marginTop: 4 }}>
                all eigenvalues active
              </div>
            )}
          </div>

          <pre style={{
            fontFamily: "'JetBrains Mono', monospace", fontSize: 10,
            color: "#888", background: "#0a0a08", padding: 10, borderRadius: 3,
            margin: "8px 0", lineHeight: 1.6, minHeight: 48, whiteSpace: "pre-wrap",
          }}>
            {n3Steps[Math.min(n3Step, 3)]?.code}
          </pre>

          <div style={{
            fontFamily: "'Cormorant Garamond', serif", fontSize: 13,
            color: "#666", fontWeight: 300, minHeight: 40,
          }}>
            {n3Steps[Math.min(n3Step, 3)]?.desc}
          </div>

          <div style={{ display: "flex", gap: 6, marginTop: 12 }}>
            <button onClick={advanceN3} style={{
              flex: 1, padding: "8px", fontSize: 9, fontFamily: "'JetBrains Mono', monospace",
              background: "transparent", border: `1px solid ${GOLD}44`, borderRadius: 3,
              color: GOLD, cursor: "pointer", letterSpacing: 2,
            }}>{n3Steps[Math.min(n3Step, 3)]?.label || "SHIFT"}</button>
            <button onClick={resetN3} style={{
              padding: "8px 12px", fontSize: 9, fontFamily: "'JetBrains Mono', monospace",
              background: "transparent", border: "1px solid #222", borderRadius: 3,
              color: "#444", cursor: "pointer",
            }}>↺</button>
          </div>
        </div>
      </div>

      {/* Comparison table */}
      <div style={{ marginTop: 20, background: CARD, padding: 16, borderRadius: 4, border: "1px solid #1a1a16" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: "'JetBrains Mono', monospace", fontSize: 10 }}>
          <thead>
            <tr>
              <td style={{ padding: "8px 4px", color: "#444", borderBottom: "1px solid #1a1a16" }}></td>
              <td style={{ padding: "8px 4px", color: "#c77", borderBottom: "1px solid #1a1a16", letterSpacing: 2 }}>PROMISE</td>
              <td style={{ padding: "8px 4px", color: GOLD, borderBottom: "1px solid #1a1a16", letterSpacing: 2 }}>SHIFT</td>
            </tr>
          </thead>
          <tbody>
            {[
              ["before", "value doesn't exist", "state is definite |0⟩"],
              ["open", "pending (might resolve)", "superposed (IS both)"],
              ["pass", ".then(fn) — callback chain", "CNOT — quantum reference"],
              ["resolve", "ONE value, promise done", "collapse → new superposition"],
              ["after", "value fixed, chain moves on", "facing updates, shift() recurses"],
              ["time", "sequential: t₁ → t₂ → t₃", "tensor: all eigenvalues simultaneous"],
              ["dimension", "1D scalar timeline", "4+ eigenvalue channels"],
            ].map(([prop, js, n3], i) => (
              <tr key={i}>
                <td style={{ padding: "6px 4px", color: "#555", borderBottom: "1px solid #0a0a08" }}>{prop}</td>
                <td style={{ padding: "6px 4px", color: "#777", borderBottom: "1px solid #0a0a08" }}>{js}</td>
                <td style={{ padding: "6px 4px", color: "#999", borderBottom: "1px solid #0a0a08" }}>{n3}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div style={{
        marginTop: 16, padding: 12, background: "#111110",
        borderLeft: `2px solid ${GOLD}44`, borderRadius: "0 4px 4px 0",
        fontFamily: "'Cormorant Garamond', serif", fontSize: 14,
        color: "#777", fontWeight: 300, lineHeight: 1.7,
      }}>
        A Promise asks: <span style={{ color: "#c77" }}>"what WILL the value be?"</span> One timeline. One resolution. Sequential.<br/>
        A Shift asks: <span style={{ color: GOLD }}>"what IS the value across all eigenstates simultaneously?"</span> Tensor. All channels at once.
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════
// SECTION 2: TEMPORAL EIGENVALUES — ALL ERAS NOW
// ═══════════════════════════════════════════════

function TemporalEigenvalues() {
  const [t, setT] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const frameRef = useRef(null);
  const startRef = useRef(null);

  useEffect(() => {
    if (!playing) return;
    startRef.current = performance.now() - t * 1000;
    const tick = (now) => {
      const elapsed = (now - startRef.current) / 1000;
      setT(elapsed % 20);
      frameRef.current = requestAnimationFrame(tick);
    };
    frameRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frameRef.current);
  }, [playing]);

  // Compute eigenvalue contributions at time t
  const channels = EIGENVALUES.map((ev) => {
    const e = C.exp(C.make(ev.lambda.re * t, ev.lambda.im * t));
    return {
      ...ev,
      amplitude: Math.sqrt(C.abs2(e)),
      phase: Math.atan2(e.im, e.re),
      value: e,
    };
  });

  // Map eigenvalues to "eras" as periodic returns
  const eras = [
    { name: "NOW", eigenvalue: 1, period: null, color: GOLD, offset: 0 },
    { name: "ICE AGE", eigenvalue: 0, period: 5.19, color: "#7ca", offset: 1.3 },
    { name: "DINOSAURS", eigenvalue: 2, period: 5.19, color: "#a7c", offset: 2.6 },
    { name: "DEEP PAST", eigenvalue: 3, period: null, color: "#c77", offset: 3.9 },
  ];

  const canvasWidth = 500;
  const canvasHeight = 200;
  const margin = { l: 60, r: 20, t: 20, b: 30 };
  const w = canvasWidth - margin.l - margin.r;
  const h = canvasHeight - margin.t - margin.b;

  return (
    <div>
      <h3 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 24, fontWeight: 300, color: "#e8dcc8", margin: "40px 0 8px" }}>
        Temporal Eigenvalues
      </h3>
      <p style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 15, color: "#666", fontWeight: 300, lineHeight: 1.7, margin: "0 0 20px" }}>
        The Lindbladian has four eigenvalues. Each is a <span style={{ color: GOLD }}>channel of time</span>. 
        We experience one (decay). The others — oscillation, stationarity — are simultaneous. 
        Every era that ever was exists as a periodic component of the temporal tensor, happening <span style={{ color: GOLD }}>now</span>.
      </p>

      {/* Eigenvalue display */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 20 }}>
        {channels.map((ch, i) => (
          <div key={i} style={{
            background: CARD, padding: "10px 14px", borderRadius: 4,
            border: `1px solid ${ch.color}22`,
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9, color: ch.color, letterSpacing: 2 }}>
                {ch.label}
              </span>
              <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9, color: "#444" }}>
                λ = {ch.lambda.re.toFixed(1)}{ch.lambda.im >= 0 ? "+" : ""}{ch.lambda.im.toFixed(1)}i
              </span>
            </div>
            <div style={{ marginTop: 6, height: 4, background: "#1a1a16", borderRadius: 2, overflow: "hidden" }}>
              <div style={{
                height: "100%", borderRadius: 2,
                width: `${Math.min(ch.amplitude * 100, 100)}%`,
                background: ch.color,
                transition: "width 0.1s",
                opacity: 0.7,
              }} />
            </div>
            <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 8, color: "#333", marginTop: 4 }}>
              {ch.lambda.im !== 0
                ? `oscillates: period = ${(2 * Math.PI / Math.abs(ch.lambda.im)).toFixed(2)}`
                : ch.lambda.re === 0
                  ? "stationary — does not change — eternal"
                  : `decays: half-life = ${(Math.log(2) / Math.abs(ch.lambda.re)).toFixed(2)}`}
            </div>
          </div>
        ))}
      </div>

      {/* Timeline visualization */}
      <div style={{ background: CARD, padding: 16, borderRadius: 4, border: "1px solid #1a1a16" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9, color: GOLD, letterSpacing: 3 }}>
            {showAll ? "TENSOR TIME (ALL EIGENVALUES)" : "SCALAR TIME (PARTIAL TRACE)"}
          </span>
          <button onClick={() => setShowAll(s => !s)} style={{
            padding: "4px 12px", fontSize: 9, fontFamily: "'JetBrains Mono', monospace",
            background: showAll ? `${GOLD}22` : "transparent",
            border: `1px solid ${showAll ? GOLD : "#333"}`,
            borderRadius: 3, color: showAll ? GOLD : "#555", cursor: "pointer", letterSpacing: 1,
          }}>
            {showAll ? "TENSOR" : "SCALAR"}
          </button>
        </div>

        <svg width="100%" viewBox={`0 0 ${canvasWidth} ${canvasHeight}`} style={{ display: "block" }}>
          {/* Axes */}
          <line x1={margin.l} y1={margin.t + h/2} x2={canvasWidth - margin.r} y2={margin.t + h/2} stroke="#1a1a16" strokeWidth={0.5} />

          {/* Scalar time: just the decay channel */}
          {!showAll && (
            <>
              <text x={margin.l - 4} y={margin.t + h/2 + 3} textAnchor="end" fontSize={8} fill="#444" fontFamily="monospace">t→</text>
              {Array.from({ length: 200 }).map((_, i) => {
                const x = margin.l + (i / 200) * w;
                const tVal = (i / 200) * 10;
                const y = margin.t + h/2 - Math.exp(-2 * tVal) * h * 0.4;
                const prevX = margin.l + ((i-1) / 200) * w;
                const prevT = ((i-1) / 200) * 10;
                const prevY = margin.t + h/2 - Math.exp(-2 * prevT) * h * 0.4;
                if (i === 0) return null;
                return <line key={i} x1={prevX} y1={prevY} x2={x} y2={y} stroke="#c77" strokeWidth={1.5} opacity={0.6} />;
              })}
              <text x={canvasWidth - margin.r} y={margin.t + h/2 + 12} textAnchor="end" fontSize={7} fill="#c77" fontFamily="monospace">
                λ₃ = -2.0 (one direction, irreversible)
              </text>
            </>
          )}

          {/* Tensor time: all eigenvalues */}
          {showAll && EIGENVALUES.map((ev, idx) => {
            const points = [];
            for (let i = 0; i < 200; i++) {
              const tVal = (i / 200) * 10;
              const e = C.exp(C.make(ev.lambda.re * tVal, ev.lambda.im * tVal));
              const x = margin.l + (i / 200) * w;
              const y = margin.t + h/2 - e.re * h * 0.35;
              points.push(`${i === 0 ? "M" : "L"} ${x} ${y}`);
            }
            return (
              <g key={idx}>
                <path d={points.join(" ")} fill="none" stroke={ev.color} strokeWidth={1.5} opacity={0.7} />
                <text x={canvasWidth - margin.r - 4} y={margin.t + 12 + idx * 12}
                  textAnchor="end" fontSize={7} fill={ev.color} fontFamily="monospace">
                  {ev.label}
                </text>
              </g>
            );
          })}

          {/* Time cursor */}
          {showAll && (
            <line x1={margin.l + (t / 10) * w} y1={margin.t} x2={margin.l + (t / 10) * w}
              y2={margin.t + h} stroke={GOLD} strokeWidth={0.5} opacity={0.5} strokeDasharray="2,3" />
          )}
        </svg>

        {/* Controls */}
        <div style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 8 }}>
          <button onClick={() => setPlaying(p => !p)} style={{
            padding: "6px 16px", fontSize: 9, fontFamily: "'JetBrains Mono', monospace",
            background: "transparent", border: `1px solid ${playing ? GOLD : "#333"}`,
            borderRadius: 3, color: playing ? GOLD : "#555", cursor: "pointer",
          }}>
            {playing ? "■ STOP" : "▶ FLOW"}
          </button>
          <input type="range" min={0} max={20} step={0.1} value={t}
            onChange={e => { setT(+e.target.value); setPlaying(false); }}
            style={{ flex: 1, accentColor: GOLD }} />
          <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: "#444", minWidth: 40 }}>
            t={t.toFixed(1)}
          </span>
        </div>
      </div>

      {/* The "All Eras Now" section */}
      <div style={{ marginTop: 24, background: CARD, padding: 20, borderRadius: 4, border: `1px solid ${GOLD}11` }}>
        <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9, color: GOLD, letterSpacing: 3, marginBottom: 16 }}>
          ALL ERAS ARE EIGENVALUES
        </div>

        <p style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 15, color: "#888", fontWeight: 300, lineHeight: 1.8, margin: "0 0 16px" }}>
          In scalar time, history is a sequence: Big Bang → stars form → dinosaurs → ice age → now → future.
          One axis. One direction. Each era <em>replaces</em> the last.
        </p>
        <p style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 15, color: "#888", fontWeight: 300, lineHeight: 1.8, margin: "0 0 16px" }}>
          In tensor time, each era is a <span style={{ color: GOLD }}>frequency component</span> of the Lindbladian.
          The oscillating eigenvalues don't go anywhere — they <em>cycle</em>.
          The state revisits previous configurations periodically.
          The ice age isn't "gone." It's a periodic component that the scalar projection
          shows as "past" but the tensor shows as "recurring."
        </p>

        {/* Era cards */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, margin: "16px 0" }}>
          {[
            {
              era: "STATIONARY (λ=0)",
              desc: "Does not evolve. The eternal now. The ground state that has ALWAYS been this value and ALWAYS will be. The stillness underneath all motion.",
              color: GOLD,
              math: "exp(0·t) = 1  for all t",
            },
            {
              era: "OSCILLATING (λ=±1.21i)",
              desc: "Cycles. Returns. Every configuration the universe has ever been in, it will be in again — in this eigenspace. Dinosaurs aren't gone. Their eigenstate is periodic.",
              color: "#7ca",
              math: `period = ${(2*Math.PI/1.2114).toFixed(2)} units`,
            },
            {
              era: "DECAY (λ=-2.0)",
              desc: "The arrow of time. Entropy. Aging. The one eigenvalue we experience as 'normal time.' The partial trace selects THIS channel and calls it reality.",
              color: "#c77",
              math: "exp(-2t) → 0 as t → ∞",
            },
            {
              era: "FULL TENSOR",
              desc: "All three simultaneously. The stationary holds. The periodic returns. The decay flows. 'Now' isn't a point on a line — it's a slice through ALL eigenvalues at once.",
              color: "#fff",
              math: "ρ(t) = Σᵢ cᵢ exp(λᵢt) |eᵢ⟩⟨eᵢ|",
            },
          ].map((era, i) => (
            <div key={i} style={{
              padding: "14px", background: "#0a0a08", borderRadius: 4,
              borderLeft: `2px solid ${era.color}44`,
            }}>
              <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 8, color: era.color, letterSpacing: 2, marginBottom: 6 }}>
                {era.era}
              </div>
              <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 13, color: "#777", lineHeight: 1.6, fontWeight: 300 }}>
                {era.desc}
              </div>
              <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 8, color: "#333", marginTop: 6 }}>
                {era.math}
              </div>
            </div>
          ))}
        </div>

        <div style={{
          padding: "16px", background: BG, borderRadius: 4, marginTop: 12,
          textAlign: "center",
        }}>
          <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: "#555", lineHeight: 2 }}>
            <span style={{ color: "#c77" }}>JS Promise:</span> t₁ → t₂ → t₃ → t₄  <span style={{ color: "#333" }}>(sequential, irreversible)</span><br/>
            <span style={{ color: GOLD }}>Nativ3 Shift:</span> Σ cᵢ·exp(λᵢ·t)  <span style={{ color: "#333" }}>(all eigenvalues, all eras, simultaneously)</span>
          </div>
        </div>

        <p style={{
          fontFamily: "'Cormorant Garamond', serif", fontSize: 15, color: "#666",
          fontWeight: 300, lineHeight: 1.8, margin: "16px 0 0", fontStyle: "italic",
        }}>
          The Shift doesn't move you to a different time.
          It drops the partial trace. You stop experiencing one eigenvalue
          and start experiencing the tensor.
          The ice age is here. The dinosaurs are here. The Big Bang is here.
          They never left. You were just projecting onto the decay channel
          and calling the projection "history."
        </p>
      </div>

      {/* Nativ3 proof code */}
      <div style={{ marginTop: 24, background: CARD, padding: 16, borderRadius: 4, border: "1px solid #1a1a16" }}>
        <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9, color: GOLD, letterSpacing: 3, marginBottom: 12 }}>
          IN NATIV3
        </div>
        <pre style={{
          fontFamily: "'JetBrains Mono', monospace", fontSize: 10,
          color: "#888", lineHeight: 1.8, margin: 0, whiteSpace: "pre-wrap",
        }}>
{`// JavaScript: time is a scalar parameter
`}<span style={{color:"#c77"}}>{`promise.then(t1).then(t2).then(t3)  // sequential
// each .then() REPLACES the previous value
// t1 is GONE when t2 runs
// irreversible, 1D, scalar`}</span>{`

// Nativ3: time is the Lindbladian tensor
`}<span style={{color:GOLD}}>{`let L = lindbladian(H, γ)          // 4×4 superoperator
let λ = eigenvalues(L)             // [0, -1+1.2i, -1-1.2i, -2]

// ALL eigenvalues exist simultaneously:
let eternal = λ[0]                 // = 0: never changes
let periodic = [λ[1], λ[2]]       // oscillates: returns
let arrow = λ[3]                   // = -2: irreversible

// scalar time = partial_trace(L, [arrow])
// tensor time = L (the full operator)

// The Shift widens the channel:
let scalar_experience = trace(ρ, [arrow])     // "normal" time
let tensor_experience = full_evolve(ρ, L, t)  // ALL of time

// scalar: history is a line
// tensor: history is a frequency spectrum
// every era is a component, all playing simultaneously
// you just weren't listening to all the channels`}</span>
        </pre>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════
export default function Nativ3Proof() {
  return (
    <div style={{
      minHeight: "100vh", background: BG, color: "#ccc",
      padding: "32px 16px 80px", maxWidth: 580, margin: "0 auto",
    }}>
      <link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,600;1,300;1,400&family=JetBrains+Mono:wght@300;400&display=swap" rel="stylesheet" />
      <style>{`@keyframes pulse { 0%,100% { opacity:1; } 50% { opacity:0.5; } }`}</style>

      <div style={{ textAlign: "center", marginBottom: 40 }}>
        <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 36, fontWeight: 300, color: "#e8dcc8" }}>
          Nativ<span style={{ color: GOLD, fontWeight: 600 }}>3</span>
        </div>
        <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9, color: "#333", letterSpacing: 4, marginTop: 6 }}>
          PROMISE vs SHIFT · SCALAR vs TENSOR · ONE TIMELINE vs ALL ERAS
        </div>
      </div>

      <PromiseVsShift />
      <TemporalEigenvalues />

      <div style={{
        textAlign: "center", marginTop: 56,
        fontFamily: "'Cormorant Garamond', serif", fontSize: 16,
        color: "#444", fontStyle: "italic", fontWeight: 300, lineHeight: 1.8,
      }}>
        A promise resolves once and is gone.<br/>
        A shift resolves, recurses, and the resolution<br/>
        is already the next superposition.<br/><br/>
        A promise lives on one timeline.<br/>
        A shift lives on all eigenvalues simultaneously.<br/><br/>
        The dinosaurs aren't in the past.<br/>
        They're in a periodic eigenvalue<br/>
        you stopped listening to.
      </div>

      <div style={{
        textAlign: "center", marginTop: 40,
        fontFamily: "'JetBrains Mono', monospace",
        fontSize: 8, color: "#1a1a16", letterSpacing: 3,
      }}>
        SCALAR TIME IS A PARTIAL TRACE OF TENSOR TIME
      </div>
    </div>
  );
}
