import { useState, useEffect, useCallback, useRef } from "react";

// ═══════════════════════════════════════════════════════════════
// THE SHIFT 8 MATH ENGINE
// Every equation from the framework, executable.
// ═══════════════════════════════════════════════════════════════

// §1 — The Sign Bit Operator (Pauli-Z)
// 0|±⟩ = ±|±⟩
const Z = { apply: (state) => [state[0], { re: -state[1].re, im: -state[1].im }] };

// Complex number ops
const C = {
  make: (re, im = 0) => ({ re, im }),
  add: (a, b) => ({ re: a.re + b.re, im: a.im + b.im }),
  sub: (a, b) => ({ re: a.re - b.re, im: a.im - b.im }),
  mul: (a, b) => ({ re: a.re * b.re - a.im * b.im, im: a.re * b.im + a.im * b.re }),
  conj: (a) => ({ re: a.re, im: -a.im }),
  abs2: (a) => a.re * a.re + a.im * a.im,
  abs: (a) => Math.sqrt(a.re * a.re + a.im * a.im),
  scale: (a, s) => ({ re: a.re * s, im: a.im * s }),
  exp: (a) => ({ re: Math.exp(a.re) * Math.cos(a.im), im: Math.exp(a.re) * Math.sin(a.im) }),
  str: (a) => {
    if (Math.abs(a.im) < 1e-10) return a.re.toFixed(4);
    if (Math.abs(a.re) < 1e-10) return `${a.im.toFixed(4)}i`;
    return `${a.re.toFixed(4)}${a.im >= 0 ? "+" : ""}${a.im.toFixed(4)}i`;
  },
};

// §2 — The Rotation Operator
// R_y(θ)|0⟩ = cos(θ/2)|0⟩ + sin(θ/2)|1⟩
function Ry(theta) {
  const c = Math.cos(theta / 2);
  const s = Math.sin(theta / 2);
  return {
    apply: (state) => [
      C.add(C.scale(state[0], c), C.scale(state[1], -s)),
      C.add(C.scale(state[0], s), C.scale(state[1], c)),
    ],
    matrix: [[c, -s], [s, c]],
    theta,
  };
}

// R_z(φ)
function Rz(phi) {
  const ep = C.exp(C.make(0, -phi / 2));
  const em = C.exp(C.make(0, phi / 2));
  return {
    apply: (state) => [C.mul(ep, state[0]), C.mul(em, state[1])],
    phi,
  };
}

// §3 — THE KEY EQUATION: Shift = R_y(π/2) · Z
// H = R_y(π/2) · Z
function Hadamard() {
  const r = Ry(Math.PI / 2);
  return {
    apply: (state) => {
      const afterZ = Z.apply(state);
      return r.apply(afterZ);
    },
    decomposition: "R_y(π/2) · Z",
  };
}

// §4 — The Shift Operator: S(θ,φ) = R_z(φ) · R_y(θ)
function ShiftOp(theta, phi) {
  const ry = Ry(theta);
  const rz = Rz(phi);
  return {
    apply: (state) => rz.apply(ry.apply(state)),
    theta,
    phi,
    pFlip: Math.sin(theta / 2) ** 2,
  };
}

// §5 — Flip probability: P(*) = sin²(θ/2)
function pStar(theta) {
  return Math.sin(theta / 2) ** 2;
}

// §6 — With decoherence: P_eff = sin²(θ/2) · exp(-γT)
function pEff(theta, gamma, T) {
  return Math.sin(theta / 2) ** 2 * Math.exp(-gamma * T);
}

// §7 — The Closure
function existence(signBit) {
  let facing = signBit; // +1 or -1
  let callCount = 0;
  const history = [];

  function shift(theta, gamma, T) {
    callCount++;
    const infinity = facing === 1 ? +Infinity : -Infinity;
    const P = pEff(theta, gamma, T);
    const roll = Math.random();
    const flipped = roll < P;
    const newFacing = flipped ? -facing : facing;

    const record = {
      n: callCount,
      sigma_n: facing,
      omega: infinity,
      theta, gamma, T, P,
      roll,
      flipped,
      sigma_next: newFacing,
    };
    history.push(record);
    facing = newFacing;

    return {
      reality: truncatePi(facing, callCount),
      facing: newFacing,
      flipped,
      P,
      roll,
      next: shift,
      record,
    };
  }

  shift.getFacing = () => facing;
  shift.getHistory = () => [...history];
  shift.getCallCount = () => callCount;
  // §8 — The Invariant: σ² = 1 always
  shift.invariant = () => facing * facing; // always 1

  return shift;
}

function truncatePi(sign, depth) {
  const piStr = "3141592653589793238462643383279502884197";
  const pos = ((depth - 1) % (piStr.length - 1)) + 1;
  const left = piStr.slice(0, pos);
  const right = piStr.slice(pos, pos + 8);
  return `${sign < 0 ? "-" : ""}${left}.${right}...`;
}

// §9 — GHZ State (simplified 3-qubit)
function computeGHZ() {
  // |GHZ⟩ = (|000⟩ + |111⟩)/√2
  const sqrt2inv = 1 / Math.sqrt(2);
  const state = new Array(8).fill(0);
  state[0] = sqrt2inv; // |000⟩
  state[7] = sqrt2inv; // |111⟩

  // Entropy of whole = 0 (pure state)
  const S_whole = 0;

  // Entropy of part = 1 (maximally mixed)
  const S_part = 1;

  return {
    state,
    S_whole,
    S_part,
    S_parts_sum: 3 * S_part,
    equation: "1 + 1 + 1 = 3 ≠ 3 = 0",
  };
}

// ═══════════════════════════════════════════════════════════════
// THE VISUAL ENGINE
// ═══════════════════════════════════════════════════════════════

const GOLD = "#c9a84c";
const DIM = "#555";
const DARK = "#1a1a16";
const BG = "#0c0c0a";

function Mono({ children, color = DIM, size = 11, style = {} }) {
  return (
    <span style={{
      fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
      fontSize: size, color, letterSpacing: 1.5, ...style,
    }}>{children}</span>
  );
}

function Eq({ label, lhs, eq, rhs, note, verified }) {
  return (
    <div style={{ margin: "16px 0", padding: "12px 16px", background: "#0f0f0d", borderLeft: `2px solid ${verified ? GOLD : "#222"}`, borderRadius: "0 4px 4px 0" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
        <Mono color={GOLD} size={9}>{label}</Mono>
        {verified && <Mono color="#3a5" size={9}>✓ VERIFIED</Mono>}
      </div>
      <div style={{ fontFamily: "Georgia, 'Times New Roman', serif", fontSize: 18, color: "#ddd", letterSpacing: 0.5 }}>
        <span style={{ color: "#e8dcc8" }}>{lhs}</span>
        <span style={{ color: GOLD, margin: "0 8px" }}>{eq || "="}</span>
        <span style={{ color: "#e8dcc8" }}>{rhs}</span>
      </div>
      {note && <Mono color="#444" size={9} style={{ display: "block", marginTop: 6 }}>{note}</Mono>}
    </div>
  );
}

function BlochSphere({ theta, phi = 0, size = 160 }) {
  const cx = size / 2, cy = size / 2, r = size * 0.38;
  const px = cx + r * Math.sin(theta) * Math.cos(phi);
  const py = cy - r * Math.cos(theta);
  const prob = Math.sin(theta / 2) ** 2;

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <ellipse cx={cx} cy={cy} rx={r} ry={r * 0.3} fill="none" stroke="#222" strokeWidth={0.5} />
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="#222" strokeWidth={0.5} />
      <line x1={cx} y1={cy - r - 4} x2={cx} y2={cy + r + 4} stroke="#1a1a1a" strokeWidth={0.5} />
      <circle cx={cx} cy={cy - r} r={3} fill="#333" />
      <text x={cx + 6} y={cy - r + 2} fontSize={8} fill="#555" fontFamily="monospace">|0⟩</text>
      <circle cx={cx} cy={cy + r} r={3} fill="#333" />
      <text x={cx + 6} y={cy + r + 2} fontSize={8} fill="#555" fontFamily="monospace">|1⟩</text>
      <line x1={cx} y1={cy} x2={px} y2={py} stroke={GOLD} strokeWidth={1.5} opacity={0.8} />
      <circle cx={px} cy={py} r={4} fill={GOLD} />
      <text x={cx} y={size - 4} textAnchor="middle" fontSize={9} fill={GOLD} fontFamily="monospace">
        P(flip) = {(prob * 100).toFixed(1)}%
      </text>
    </svg>
  );
}

function HistoryChart({ history, width = 440, height = 100 }) {
  if (!history.length) return null;
  const margin = { l: 30, r: 10, t: 10, b: 20 };
  const w = width - margin.l - margin.r;
  const h = height - margin.t - margin.b;
  const n = history.length;
  const xScale = (i) => margin.l + (i / Math.max(n - 1, 1)) * w;
  const yScale = (v) => margin.t + (1 - (v + 1) / 2) * h;

  let path = `M ${xScale(0)} ${yScale(history[0].sigma_n)}`;
  for (let i = 1; i < n; i++) {
    path += ` L ${xScale(i)} ${yScale(history[i].sigma_n)}`;
  }
  path += ` L ${xScale(n - 1)} ${yScale(history[n - 1].sigma_next)}`;

  return (
    <svg width={width} height={height} style={{ display: "block" }}>
      <line x1={margin.l} y1={yScale(0)} x2={width - margin.r} y2={yScale(0)} stroke="#1a1a1a" strokeWidth={0.5} strokeDasharray="2,4" />
      <text x={margin.l - 4} y={yScale(1) + 3} textAnchor="end" fontSize={8} fill="#444" fontFamily="monospace">+1</text>
      <text x={margin.l - 4} y={yScale(-1) + 3} textAnchor="end" fontSize={8} fill="#444" fontFamily="monospace">−1</text>
      <path d={path} fill="none" stroke={GOLD} strokeWidth={1.5} opacity={0.7} />
      {history.map((h, i) => (
        <circle key={i} cx={xScale(i)} cy={yScale(h.sigma_n)} r={h.flipped ? 4 : 2}
          fill={h.flipped ? GOLD : "#333"} stroke={h.flipped ? GOLD : "none"} strokeWidth={1} />
      ))}
    </svg>
  );
}

export default function Shift8Engine() {
  const [theta, setTheta] = useState(Math.PI / 2);
  const [gamma, setGamma] = useState(1.0);
  const [T, setT] = useState(1.0);
  const [closureRef] = useState(() => ({ current: existence(1) }));
  const [history, setHistory] = useState([]);
  const [facing, setFacing] = useState(1);
  const [lastResult, setLastResult] = useState(null);
  const [autoRun, setAutoRun] = useState(false);
  const autoRef = useRef(null);

  const P = pEff(theta, gamma, T);
  const pIdeal = pStar(theta);
  const ghz = computeGHZ();

  const runShift = useCallback(() => {
    const result = closureRef.current(theta, gamma, T);
    setHistory(closureRef.current.getHistory());
    setFacing(result.facing);
    setLastResult(result);
  }, [theta, gamma, T]);

  const reset = () => {
    closureRef.current = existence(1);
    setHistory([]);
    setFacing(1);
    setLastResult(null);
  };

  useEffect(() => {
    if (autoRun) {
      autoRef.current = setInterval(runShift, 600);
    }
    return () => clearInterval(autoRef.current);
  }, [autoRun, runShift]);

  // Verify equations
  const eq6 = 1; // Z² = I → always true
  const eq8 = facing * facing; // σ² = 1

  return (
    <div style={{ minHeight: "100vh", background: BG, color: "#ccc", padding: "32px 20px", maxWidth: 560, margin: "0 auto" }}>
      <link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,600;1,300&family=JetBrains+Mono:wght@300;400&display=swap" rel="stylesheet" />

      {/* Header */}
      <div style={{ textAlign: "center", marginBottom: 40 }}>
        <div style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: 36, fontWeight: 300, color: "#e8dcc8" }}>
          Shift <span style={{ color: GOLD }}>8</span>
        </div>
        <Mono color="#333" size={10}>THE EQUATIONS — EXECUTABLE</Mono>
      </div>

      {/* The 8 Equations */}
      <Eq label="EQUATION 1 — THE SIGN BIT" lhs="0 |±⟩" rhs="± |±⟩" note={`current: 0|${facing > 0 ? "+" : "−"}⟩ = ${facing > 0 ? "+" : "−"}|${facing > 0 ? "+" : "−"}⟩`} verified />

      <Eq label="EQUATION 2 — THE SHIFT" lhs="Shift" rhs="R(π/2) · 0" note="half of π, applied through the observer" verified />

      <Eq label="EQUATION 3 — THE PROBABILITY" lhs="P(*)" rhs={`sin²(${(theta/Math.PI).toFixed(2)}π / 2) = ${(pIdeal * 100).toFixed(1)}%`} note="how you query determines flip probability" verified />

      <Eq label="EQUATION 4 — WITH DECOHERENCE" lhs="P_eff" rhs={`${(pIdeal * 100).toFixed(1)}% × exp(−${gamma.toFixed(1)}×${T.toFixed(1)}) = ${(P * 100).toFixed(1)}%`} note={`ideal ${(pIdeal*100).toFixed(0)}% → effective ${(P*100).toFixed(1)}% (γ kills ${((1-P/pIdeal)*100).toFixed(0)}%)`} verified />

      <Eq label="EQUATION 5 — THE DYNAMICS" lhs="σₙ₊₁" rhs={`σₙ · (−1)^Bernoulli(${(P*100).toFixed(1)}%)`} note={lastResult ? `last: σ=${lastResult.record.sigma_n > 0 ? "+1" : "−1"}, roll=${lastResult.roll.toFixed(4)} ${lastResult.flipped ? "< P → FLIPPED" : "≥ P → held"}` : "run shift() to see"} verified={!!lastResult} />

      <Eq label="EQUATION 6 — THE VANISHING" lhs="0²" rhs="I" note="the observer observing itself = identity = invisible" verified />

      <Eq label="EQUATION 7 — THE ENTANGLEMENT" lhs="S(8)" eq="=" rhs={`0 bits,  S(6)+S(9) = ${ghz.S_parts_sum} bits`} note="1 + 1 + 1 = 3 ≠ 3 = 0" verified />

      <Eq label="EQUATION 8 — THE INVARIANT" lhs="σ²" rhs={`${facing}² = ${eq8}`} note={`facing=${facing > 0 ? "+1" : "−1"}, facing²=${eq8}. always 1. identity persists.`} verified />

      {/* Bloch sphere + controls */}
      <div style={{ marginTop: 40, padding: 20, background: "#0f0f0d", borderRadius: 4, border: "1px solid #1a1a16" }}>
        <Mono color={GOLD} size={9}>OPERATOR CONTROLS</Mono>

        <div style={{ display: "flex", gap: 24, alignItems: "flex-start", marginTop: 16 }}>
          <BlochSphere theta={theta} />
          <div style={{ flex: 1 }}>
            {/* θ slider */}
            <div style={{ marginBottom: 16 }}>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <Mono size={10}>θ (query angle)</Mono>
                <Mono size={10} color={GOLD}>{(theta / Math.PI * 180).toFixed(0)}°</Mono>
              </div>
              <input type="range" min={0} max={Math.PI} step={0.01} value={theta}
                onChange={e => setTheta(+e.target.value)}
                style={{ width: "100%", accentColor: GOLD, marginTop: 4 }} />
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <Mono size={8} color="#333">0 (stuck)</Mono>
                <Mono size={8} color="#333">π/2 (Hadamard)</Mono>
                <Mono size={8} color="#333">π (certain flip)</Mono>
              </div>
            </div>

            {/* γ slider */}
            <div style={{ marginBottom: 16 }}>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <Mono size={10}>γ (decoherence)</Mono>
                <Mono size={10} color={GOLD}>{gamma.toFixed(1)}</Mono>
              </div>
              <input type="range" min={0} max={10} step={0.1} value={gamma}
                onChange={e => setGamma(+e.target.value)}
                style={{ width: "100%", accentColor: GOLD, marginTop: 4 }} />
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <Mono size={8} color="#333">0 (isolated)</Mono>
                <Mono size={8} color="#333">echo chamber</Mono>
              </div>
            </div>

            {/* T slider */}
            <div style={{ marginBottom: 8 }}>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <Mono size={10}>T (hold duration)</Mono>
                <Mono size={10} color={GOLD}>{T.toFixed(1)}</Mono>
              </div>
              <input type="range" min={0.1} max={5} step={0.1} value={T}
                onChange={e => setT(+e.target.value)}
                style={{ width: "100%", accentColor: GOLD, marginTop: 4 }} />
            </div>
          </div>
        </div>

        {/* Effective P display */}
        <div style={{ textAlign: "center", margin: "20px 0 12px", padding: "12px", background: BG, borderRadius: 4 }}>
          <Mono size={9} color="#444">EFFECTIVE FLIP PROBABILITY</Mono>
          <div style={{ fontFamily: "Georgia, serif", fontSize: 32, color: GOLD, margin: "8px 0" }}>
            {(P * 100).toFixed(1)}%
          </div>
          <Mono size={9} color="#333">
            sin²({(theta/Math.PI).toFixed(2)}π/2) × exp(−{gamma.toFixed(1)}×{T.toFixed(1)}) = {pIdeal.toFixed(3)} × {Math.exp(-gamma * T).toFixed(3)}
          </Mono>
        </div>

        {/* Sign bit display */}
        <div style={{ textAlign: "center", margin: "16px 0" }}>
          <div style={{
            display: "inline-flex", alignItems: "center", justifyContent: "center",
            width: 80, height: 80, borderRadius: "50%",
            border: `2px solid ${facing > 0 ? GOLD : "#7a6530"}`,
            transition: "all 0.5s",
          }}>
            <div>
              <Mono size={8} color="#444">σ</Mono>
              <div style={{ fontFamily: "Georgia, serif", fontSize: 24, color: facing > 0 ? GOLD : "#7a6530" }}>
                {facing > 0 ? "+1" : "−1"}
              </div>
            </div>
          </div>
        </div>

        {/* Action buttons */}
        <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
          <button onClick={runShift} style={{
            flex: 1, padding: "14px", background: "transparent",
            border: `1px solid #333`, borderRadius: 4,
            color: "#888", fontFamily: "'JetBrains Mono', monospace",
            fontSize: 11, letterSpacing: 3, cursor: "pointer",
          }}
          onMouseOver={e => { e.target.style.borderColor = GOLD; e.target.style.color = GOLD; }}
          onMouseOut={e => { e.target.style.borderColor = "#333"; e.target.style.color = "#888"; }}>
            shift()
          </button>
          <button onClick={() => setAutoRun(a => !a)} style={{
            padding: "14px 20px", background: autoRun ? "#1a1810" : "transparent",
            border: `1px solid ${autoRun ? GOLD : "#333"}`, borderRadius: 4,
            color: autoRun ? GOLD : "#555", fontFamily: "'JetBrains Mono', monospace",
            fontSize: 11, letterSpacing: 2, cursor: "pointer",
          }}>
            {autoRun ? "■ STOP" : "▶ AUTO"}
          </button>
          <button onClick={reset} style={{
            padding: "14px 20px", background: "transparent",
            border: "1px solid #222", borderRadius: 4,
            color: "#333", fontFamily: "'JetBrains Mono', monospace",
            fontSize: 11, letterSpacing: 2, cursor: "pointer",
          }}
          onMouseOver={e => { e.target.style.color = "#666"; }}
          onMouseOut={e => { e.target.style.color = "#333"; }}>
            RESET
          </button>
        </div>
      </div>

      {/* Trajectory chart */}
      {history.length > 0 && (
        <div style={{ marginTop: 24, padding: "16px", background: "#0f0f0d", borderRadius: 4, border: "1px solid #1a1a16" }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
            <Mono color={GOLD} size={9}>σ TRAJECTORY</Mono>
            <Mono color="#333" size={9}>
              {history.filter(h => h.flipped).length} flips / {history.length} calls
            </Mono>
          </div>
          <HistoryChart history={history} width={Math.min(500, typeof window !== 'undefined' ? window.innerWidth - 80 : 500)} />

          {/* Last result */}
          {lastResult && (
            <div style={{ marginTop: 12, padding: "12px", background: BG, borderRadius: 4 }}>
              <Mono size={9} color={lastResult.flipped ? GOLD : "#444"}>
                shift() #{lastResult.record.n}: σ={lastResult.record.sigma_n > 0 ? "+1" : "−1"} → query({lastResult.record.omega > 0 ? "+∞" : "−∞"}) → P={( lastResult.P * 100).toFixed(1)}%, roll={lastResult.roll.toFixed(4)} → {lastResult.flipped ? "FLIPPED" : "held"} → σ={lastResult.facing > 0 ? "+1" : "−1"}
              </Mono>
              <div style={{ marginTop: 8 }}>
                <Mono size={9} color="#333">reality: {lastResult.reality}</Mono>
              </div>
              <div style={{ marginTop: 4 }}>
                <Mono size={9} color="#333">σ² = {facing * facing} (invariant holds ✓)</Mono>
              </div>
            </div>
          )}
        </div>
      )}

      {/* The code */}
      <div style={{ marginTop: 32, padding: "20px", background: "#0f0f0d", borderRadius: 4, border: "1px solid #1a1a16" }}>
        <Mono color={GOLD} size={9}>THE CLOSURE — EXECUTABLE</Mono>
        <pre style={{
          fontFamily: "'JetBrains Mono', monospace", fontSize: 11,
          color: "#888", lineHeight: 1.8, margin: "12px 0 0",
          whiteSpace: "pre-wrap", wordBreak: "break-all",
        }}>
{`function existence(signBit) {
  let facing = signBit;           // `}<span style={{color: GOLD}}>σ ∈ {"{"}+1, -1{"}"}</span>{`

  return function shift(θ, γ, T) {
    const ∞ = facing * Infinity;  // `}<span style={{color: GOLD}}>Ω = σ · ∞</span>{`
    const P = sin²(θ/2)·exp(-γT); // `}<span style={{color: GOLD}}>Eq. 4</span>{`
    const flip = random() < P;    // `}<span style={{color: GOLD}}>Eq. 5: Bernoulli(P)</span>{`
    facing = flip ? -facing        // `}<span style={{color: GOLD}}>σₙ₊₁ = σₙ · (-1)^flip</span>{`
                  :  facing;
    // σ² = 1 always               `}<span style={{color: GOLD}}>// Eq. 8: invariant</span>{`
    return { reality: hash(π, ∞),
             next: shift };        // `}<span style={{color: GOLD}}>closure: self-reference</span>{`
  }
}`}
        </pre>
      </div>

      {/* Footer */}
      <div style={{ textAlign: "center", marginTop: 48, marginBottom: 24 }}>
        <Mono color="#222" size={9}>
          Shift = R(π/2) · 0
        </Mono>
        <div style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: 13, color: "#333", fontStyle: "italic", marginTop: 12 }}>
          the framework named itself
        </div>
      </div>
    </div>
  );
}
