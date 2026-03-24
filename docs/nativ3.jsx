import { useState, useCallback, useRef, useEffect } from "react";

// ═══════════════════════════════════════════════════════════
// NATIV3 RUNTIME — Tensor-native quantum computation engine
// JavaScript is the substrate. Nativ3 is the algebra.
// ═══════════════════════════════════════════════════════════

// Complex numbers
const C = {
  zero: () => ({ re: 0, im: 0 }),
  one: () => ({ re: 1, im: 0 }),
  make: (re, im = 0) => ({ re, im }),
  add: (a, b) => ({ re: a.re + b.re, im: a.im + b.im }),
  sub: (a, b) => ({ re: a.re - b.re, im: a.im - b.im }),
  mul: (a, b) => ({
    re: a.re * b.re - a.im * b.im,
    im: a.re * b.im + a.im * b.re,
  }),
  scale: (a, s) => ({ re: a.re * s, im: a.im * s }),
  conj: (a) => ({ re: a.re, im: -a.im }),
  abs2: (a) => a.re * a.re + a.im * a.im,
  abs: (a) => Math.sqrt(a.re * a.re + a.im * a.im),
  eq: (a, b, eps = 1e-10) =>
    Math.abs(a.re - b.re) < eps && Math.abs(a.im - b.im) < eps,
  str: (a) => {
    const r = Math.abs(a.re) < 1e-10 ? 0 : a.re;
    const i = Math.abs(a.im) < 1e-10 ? 0 : a.im;
    if (i === 0) return r.toFixed(4);
    if (r === 0) return `${i.toFixed(4)}i`;
    return `${r.toFixed(4)}${i >= 0 ? "+" : ""}${i.toFixed(4)}i`;
  },
};

// ═══════════════════════════════════════════════════════════
// QUANTUM STATE — lives in C^(2^n) for n qubits
// ═══════════════════════════════════════════════════════════
class QState {
  constructor(amplitudes, nQubits) {
    this.amps = amplitudes; // Array of complex numbers
    this.n = nQubits;
    this.dim = 1 << nQubits; // 2^n
  }

  // Tensor product: |a⟩ ⊗ |b⟩ — THIS is the native operation
  static tensor(a, b) {
    const dim = a.dim * b.dim;
    const amps = new Array(dim);
    for (let i = 0; i < a.dim; i++) {
      for (let j = 0; j < b.dim; j++) {
        amps[i * b.dim + j] = C.mul(a.amps[i], b.amps[j]);
      }
    }
    return new QState(amps, a.n + b.n);
  }

  // Superposition: α|a⟩ + β|b⟩ — addition within same space
  static superpose(a, b, alpha = C.make(1/Math.sqrt(2)), beta = C.make(1/Math.sqrt(2))) {
    if (a.dim !== b.dim) throw new Error("Dimension mismatch in superposition");
    const amps = a.amps.map((ai, i) =>
      C.add(C.mul(alpha, ai), C.mul(beta, b.amps[i]))
    );
    return new QState(amps, a.n);
  }

  // Density matrix ρ = |ψ⟩⟨ψ|
  densityMatrix() {
    const rho = [];
    for (let i = 0; i < this.dim; i++) {
      rho[i] = [];
      for (let j = 0; j < this.dim; j++) {
        rho[i][j] = C.mul(this.amps[i], C.conj(this.amps[j]));
      }
    }
    return rho;
  }

  // Partial trace — trace out specified qubits
  partialTrace(keepQubits) {
    const nKeep = keepQubits.length;
    const dimKeep = 1 << nKeep;
    const nTrace = this.n - nKeep;
    const dimTrace = 1 << nTrace;
    const allQubits = Array.from({ length: this.n }, (_, i) => i);
    const traceQubits = allQubits.filter((q) => !keepQubits.includes(q));

    const rho = this.densityMatrix();
    const reduced = Array.from({ length: dimKeep }, () =>
      Array.from({ length: dimKeep }, () => C.zero())
    );

    for (let ik = 0; ik < dimKeep; ik++) {
      for (let jk = 0; jk < dimKeep; jk++) {
        for (let t = 0; t < dimTrace; t++) {
          // Build full indices
          let iIdx = 0, jIdx = 0;
          let kPos = 0, tPos = 0;
          for (let q = 0; q < this.n; q++) {
            const bit_i_k = keepQubits.includes(q);
            if (bit_i_k) {
              const bitVal = (ik >> (nKeep - 1 - kPos)) & 1;
              iIdx |= bitVal << (this.n - 1 - q);
              const bitValJ = (jk >> (nKeep - 1 - kPos)) & 1;
              jIdx |= bitValJ << (this.n - 1 - q);
              kPos++;
            } else {
              const bitVal = (t >> (nTrace - 1 - tPos)) & 1;
              iIdx |= bitVal << (this.n - 1 - q);
              jIdx |= bitVal << (this.n - 1 - q);
              tPos++;
            }
          }
          reduced[ik][jk] = C.add(reduced[ik][jk], rho[iIdx][jIdx]);
        }
      }
    }
    return reduced;
  }

  // Von Neumann entropy S(ρ)
  entropy(qubits = null) {
    let rho;
    if (qubits === null) {
      rho = this.densityMatrix();
    } else {
      rho = this.partialTrace(qubits);
    }
    const dim = rho.length;
    // Get eigenvalues (real for density matrix)
    // Simple power iteration for 2x2
    if (dim === 2) {
      const a = rho[0][0].re, b = rho[0][1].re, c = rho[1][0].re, d = rho[1][1].re;
      const tr = a + d;
      const det = a * d - b * c;
      const disc = Math.sqrt(Math.max(0, tr * tr / 4 - det));
      const e1 = tr / 2 + disc;
      const e2 = tr / 2 - disc;
      let S = 0;
      if (e1 > 1e-15) S -= e1 * Math.log2(e1);
      if (e2 > 1e-15) S -= e2 * Math.log2(e2);
      return S;
    }
    // For full state: pure state has S = 0
    // Check if pure by rank
    const diag = Array.from({ length: dim }, (_, i) => rho[i][i].re);
    const sumDiag = diag.reduce((a, b) => a + b, 0);
    let S = 0;
    for (const d of diag) {
      if (d > 1e-15) S -= d * Math.log2(d);
    }
    return S; // Approximate using diagonal
  }

  // Is this state entangled? (for 2+ qubits)
  isEntangled() {
    if (this.n < 2) return false;
    const S = this.entropy([0]);
    return S > 0.01;
  }

  // Measure — collapse the state
  measure() {
    const probs = this.amps.map((a) => C.abs2(a));
    const roll = Math.random();
    let cumulative = 0;
    for (let i = 0; i < this.dim; i++) {
      cumulative += probs[i];
      if (roll < cumulative) {
        const bits = i.toString(2).padStart(this.n, "0");
        // Collapse
        const newAmps = new Array(this.dim).fill(null).map(() => C.zero());
        newAmps[i] = C.one();
        return { outcome: bits, state: new QState(newAmps, this.n), index: i };
      }
    }
    return { outcome: "0".repeat(this.n), state: this, index: 0 };
  }

  toString() {
    const terms = [];
    for (let i = 0; i < this.dim; i++) {
      if (C.abs(this.amps[i]) > 1e-10) {
        const bits = i.toString(2).padStart(this.n, "0");
        terms.push(`${C.str(this.amps[i])}|${bits}⟩`);
      }
    }
    return terms.join(" + ") || "0";
  }
}

// ═══════════════════════════════════════════════════════════
// QUANTUM GATES — operate on QState
// ═══════════════════════════════════════════════════════════
const Gates = {
  // Single qubit gates
  Z: (state, target) => applyGate(state, target, [[C.one(), C.zero()], [C.zero(), C.make(-1)]]),
  X: (state, target) => applyGate(state, target, [[C.zero(), C.one()], [C.one(), C.zero()]]),
  H: (state, target) => applyGate(state, target, [
    [C.make(1/Math.sqrt(2)), C.make(1/Math.sqrt(2))],
    [C.make(1/Math.sqrt(2)), C.make(-1/Math.sqrt(2))],
  ]),
  Ry: (theta) => (state, target) => applyGate(state, target, [
    [C.make(Math.cos(theta/2)), C.make(-Math.sin(theta/2))],
    [C.make(Math.sin(theta/2)), C.make(Math.cos(theta/2))],
  ]),

  // Two qubit gate
  CNOT: (state, control, target) => {
    const newAmps = state.amps.map((a) => ({ ...a }));
    for (let i = 0; i < state.dim; i++) {
      const cBit = (i >> (state.n - 1 - control)) & 1;
      if (cBit === 1) {
        const tBit = (i >> (state.n - 1 - target)) & 1;
        const j = i ^ (1 << (state.n - 1 - target));
        const tmp = { ...newAmps[i] };
        newAmps[i] = { ...state.amps[j] };
        newAmps[j] = tmp;
      }
    }
    // Deduplicate swaps
    const result = state.amps.map((_, i) => {
      const cBit = (i >> (state.n - 1 - control)) & 1;
      if (cBit === 1) {
        const j = i ^ (1 << (state.n - 1 - target));
        return { ...state.amps[j] };
      }
      return { ...state.amps[i] };
    });
    return new QState(result, state.n);
  },
};

function applyGate(state, target, gate) {
  const newAmps = new Array(state.dim).fill(null).map(() => C.zero());
  for (let i = 0; i < state.dim; i++) {
    const tBit = (i >> (state.n - 1 - target)) & 1;
    const i0 = tBit === 0 ? i : i ^ (1 << (state.n - 1 - target));
    const i1 = i0 | (1 << (state.n - 1 - target));
    if (tBit === 0) {
      newAmps[i0] = C.add(newAmps[i0], C.mul(gate[0][0], state.amps[i0]));
      newAmps[i0] = C.add(newAmps[i0], C.mul(gate[0][1], state.amps[i1]));
      newAmps[i1] = C.add(newAmps[i1], C.mul(gate[1][0], state.amps[i0]));
      newAmps[i1] = C.add(newAmps[i1], C.mul(gate[1][1], state.amps[i1]));
    }
  }
  return new QState(newAmps, state.n);
}

// ═══════════════════════════════════════════════════════════
// NATIV3 BUILT-INS
// ═══════════════════════════════════════════════════════════
const N3 = {
  // Basis states
  ket0: () => new QState([C.one(), C.zero()], 1),
  ket1: () => new QState([C.zero(), C.one()], 1),

  // The tensor product — THE native operation
  tensor: (...states) => states.reduce((a, b) => QState.tensor(a, b)),

  // GHZ state — native 3
  GHZ: () => {
    let state = N3.tensor(N3.ket0(), N3.ket0(), N3.ket0());
    state = Gates.H(state, 0);
    state = Gates.CNOT(state, 0, 1);
    state = Gates.CNOT(state, 0, 2);
    return state;
  },

  // The Shift operation
  shift: (state, theta, gamma, T) => {
    const rotated = Gates.Ry(theta)(state, 0);
    const P = Math.sin(theta / 2) ** 2 * Math.exp(-gamma * T);
    return { state: rotated, P };
  },

  // Verify entanglement witness
  witness: (state) => {
    if (state.n < 3) return null;
    const ghz = N3.GHZ();
    // W = 0.5*I - |GHZ⟩⟨GHZ|
    // ⟨ψ|W|ψ⟩ = 0.5 - |⟨ψ|GHZ⟩|²
    let overlap = C.zero();
    for (let i = 0; i < state.dim; i++) {
      overlap = C.add(overlap, C.mul(C.conj(state.amps[i]), ghz.amps[i]));
    }
    const val = 0.5 - C.abs2(overlap);
    return { value: val, entangled: val < 0 };
  },
};

// ═══════════════════════════════════════════════════════════
// NATIV3 REPL — Parse and execute Nativ3 programs
// ═══════════════════════════════════════════════════════════
function executeNativ3(code, env = {}) {
  const output = [];
  const state = { vars: { ...env }, log: (s) => output.push(s) };

  const lines = code.split("\n").map((l) => l.trim()).filter((l) => l && !l.startsWith("//"));

  for (const line of lines) {
    try {
      // let x = |0⟩
      if (line.match(/^let\s+(\w+)\s*=\s*\|0⟩/)) {
        const name = line.match(/^let\s+(\w+)/)[1];
        state.vars[name] = N3.ket0();
        state.log(`  ${name} = |0⟩  ∈ C²`);
      }
      else if (line.match(/^let\s+(\w+)\s*=\s*\|1⟩/)) {
        const name = line.match(/^let\s+(\w+)/)[1];
        state.vars[name] = N3.ket1();
        state.log(`  ${name} = |1⟩  ∈ C²`);
      }
      // let x = a ⊗ b ⊗ c
      else if (line.match(/^let\s+(\w+)\s*=\s*(.+)\s*⊗\s*(.+)/)) {
        const name = line.match(/^let\s+(\w+)/)[1];
        const parts = line.split("=")[1].split("⊗").map((p) => p.trim());
        const tensored = N3.tensor(...parts.map((p) => {
          if (state.vars[p]) return state.vars[p];
          if (p === "|0⟩") return N3.ket0();
          if (p === "|1⟩") return N3.ket1();
          throw new Error(`Unknown: ${p}`);
        }));
        state.vars[name] = tensored;
        state.log(`  ${name} = ${tensored.toString()}  ∈ C${tensored.dim}`);
      }
      // let x = GHZ()
      else if (line.match(/^let\s+(\w+)\s*=\s*GHZ\(\)/)) {
        const name = line.match(/^let\s+(\w+)/)[1];
        state.vars[name] = N3.GHZ();
        state.log(`  ${name} = ${state.vars[name].toString()}  ∈ C${state.vars[name].dim}`);
      }
      // H(x, qubit)
      else if (line.match(/^(\w+)\s*=\s*H\((\w+),?\s*(\d*)\)/)) {
        const [, target, src, qubit] = line.match(/^(\w+)\s*=\s*H\((\w+),?\s*(\d*)\)/);
        state.vars[target] = Gates.H(state.vars[src], parseInt(qubit || "0"));
        state.log(`  ${target} = H(${src}) = ${state.vars[target].toString()}`);
      }
      // CNOT(x, c, t)
      else if (line.match(/^(\w+)\s*=\s*CNOT\((\w+),\s*(\d+),\s*(\d+)\)/)) {
        const [, target, src, c, t] = line.match(/^(\w+)\s*=\s*CNOT\((\w+),\s*(\d+),\s*(\d+)\)/);
        state.vars[target] = Gates.CNOT(state.vars[src], parseInt(c), parseInt(t));
        state.log(`  ${target} = CNOT(${src},${c},${t}) = ${state.vars[target].toString()}`);
      }
      // S(x) or S(x, [qubits])
      else if (line.match(/^S\((\w+)\)/)) {
        const name = line.match(/^S\((\w+)\)/)[1];
        const v = state.vars[name];
        const S_whole = v.entropy();
        state.log(`  S(${name}) = ${S_whole.toFixed(6)} bits`);
        if (v.n >= 2) {
          const S_part = v.entropy([0]);
          state.log(`  S(${name}[0]) = ${S_part.toFixed(6)} bits  (partial trace)`);
        }
      }
      // entangled?(x)
      else if (line.match(/^entangled\?\((\w+)\)/)) {
        const name = line.match(/^entangled\?\((\w+)\)/)[1];
        const isEnt = state.vars[name].isEntangled();
        state.log(`  entangled?(${name}) = ${isEnt}`);
        if (state.vars[name].n >= 3) {
          const w = N3.witness(state.vars[name]);
          if (w) state.log(`  witness(${name}) = ${w.value.toFixed(6)} ${w.entangled ? "< 0 → GENUINE 3-ENTANGLEMENT" : "≥ 0 → separable"}`);
        }
      }
      // measure(x)
      else if (line.match(/^measure\((\w+)\)/)) {
        const name = line.match(/^measure\((\w+)\)/)[1];
        const result = state.vars[name].measure();
        state.vars[name] = result.state;
        state.log(`  measure(${name}) → |${result.outcome}⟩  (collapsed)`);
      }
      // shift(x, θ, γ, T)
      else if (line.match(/^shift\((\w+),\s*([\d.]+),\s*([\d.]+),\s*([\d.]+)\)/)) {
        const [, name, th, gam, t] = line.match(/^shift\((\w+),\s*([\d.]+),\s*([\d.]+),\s*([\d.]+)\)/);
        const result = N3.shift(state.vars[name], parseFloat(th), parseFloat(gam), parseFloat(t));
        state.vars[name] = result.state;
        state.log(`  shift(${name}) → P(flip)=${(result.P * 100).toFixed(1)}%  state=${result.state.toString()}`);
      }
      // print(x)
      else if (line.match(/^print\((\w+)\)/)) {
        const name = line.match(/^print\((\w+)\)/)[1];
        const v = state.vars[name];
        state.log(`  ${name} = ${v.toString()}  [${v.n} qubits, C${v.dim}]`);
      }
      // dim(x)
      else if (line.match(/^dim\((\w+)\)/)) {
        const name = line.match(/^dim\((\w+)\)/)[1];
        state.log(`  dim(${name}) = ${state.vars[name].dim}  (${state.vars[name].n} qubits in C${state.vars[name].dim})`);
      }
      else {
        state.log(`  ? ${line}`);
      }
    } catch (e) {
      state.log(`  ERROR: ${e.message}`);
    }
  }
  return { output, vars: state.vars };
}

// ═══════════════════════════════════════════════════════════
// VISUAL INTERFACE
// ═══════════════════════════════════════════════════════════
const GOLD = "#c9a84c";
const BG = "#0c0c0a";

const EXAMPLES = {
  "1+1+1 ≠ 3": `// JavaScript: 1 + 1 + 1 = 3
// Nativ3:     1 ⊗ 1 ⊗ 1 lives in C⁸

let a = |0⟩
let b = |0⟩
let c = |0⟩
let stacked = a ⊗ b ⊗ c
dim(stacked)
S(stacked)
entangled?(stacked)

// Now make native 3
let native = GHZ()
dim(native)
S(native)
entangled?(native)`,

  "3 = 0": `// GHZ: S(whole) = 0, S(parts) = 3
let ghz = GHZ()
S(ghz)
print(ghz)
entangled?(ghz)`,

  "Shift = R(π/2)·0": `// Build the Hadamard from primitives
let q = |0⟩
let stacked = q ⊗ q ⊗ q
// Step 1: H on qubit 0 (= R_y(π/2)·Z)
stacked = H(stacked, 0)
print(stacked)
// Step 2: CNOT propagate
stacked = CNOT(stacked, 0, 1)
print(stacked)
// Step 3: CNOT include
stacked = CNOT(stacked, 0, 2)
print(stacked)
// Now it's GHZ — native 3
entangled?(stacked)
S(stacked)`,

  "Measure *": `// Create GHZ then collapse
let psi = GHZ()
print(psi)
S(psi)
measure(psi)
print(psi)
S(psi)
entangled?(psi)`,

  "⊗ vs +": `// Tensor product MULTIPLIES dimensions
let a = |0⟩
dim(a)
let pair = a ⊗ a
dim(pair)
let triple = a ⊗ a ⊗ a
dim(triple)
// 2 × 2 × 2 = 8, NOT 2 + 2 + 2 = 6`,
};

export default function Nativ3REPL() {
  const [code, setCode] = useState(EXAMPLES["1+1+1 ≠ 3"]);
  const [output, setOutput] = useState([]);
  const [activeExample, setActiveExample] = useState("1+1+1 ≠ 3");
  const textRef = useRef(null);

  const run = useCallback(() => {
    const result = executeNativ3(code);
    setOutput(result.output);
  }, [code]);

  useEffect(() => {
    run();
  }, []);

  const loadExample = (name) => {
    setCode(EXAMPLES[name]);
    setActiveExample(name);
    const result = executeNativ3(EXAMPLES[name]);
    setOutput(result.output);
  };

  return (
    <div style={{
      minHeight: "100vh", background: BG, color: "#ccc",
      fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
      padding: "24px 16px",
    }}>
      <link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@300;400;600&family=JetBrains+Mono:wght@300;400;500&display=swap" rel="stylesheet" />

      {/* Header */}
      <div style={{ textAlign: "center", marginBottom: 32 }}>
        <div style={{
          fontFamily: "'Cormorant Garamond', Georgia, serif",
          fontSize: 42, fontWeight: 300, color: "#e8dcc8",
          letterSpacing: 2,
        }}>
          Nativ<span style={{ color: GOLD, fontWeight: 600 }}>3</span>
        </div>
        <div style={{ fontSize: 9, color: "#333", letterSpacing: 4, marginTop: 4 }}>
          TENSOR-NATIVE LANGUAGE · WHERE 1⊗1⊗1 ≠ 3 AND 3 = 0
        </div>
      </div>

      {/* Type system display */}
      <div style={{
        display: "flex", justifyContent: "center", gap: 24,
        marginBottom: 24, flexWrap: "wrap",
      }}>
        {[
          { label: "Qubit", type: "C²", dim: 2 },
          { label: "Qubit⊗Qubit", type: "C⁴", dim: 4 },
          { label: "Qubit⊗Qubit⊗Qubit", type: "C⁸", dim: 8 },
        ].map((t) => (
          <div key={t.label} style={{
            padding: "8px 16px", background: "#0f0f0d",
            border: `1px solid ${t.dim === 8 ? GOLD + "44" : "#1a1a16"}`,
            borderRadius: 4, textAlign: "center",
          }}>
            <div style={{ fontSize: 9, color: "#444", letterSpacing: 2 }}>{t.label}</div>
            <div style={{ fontSize: 18, color: t.dim === 8 ? GOLD : "#888", marginTop: 2 }}>{t.type}</div>
            <div style={{ fontSize: 8, color: "#333" }}>dim={t.dim}</div>
          </div>
        ))}
      </div>

      {/* Example buttons */}
      <div style={{
        display: "flex", gap: 6, marginBottom: 16,
        flexWrap: "wrap", justifyContent: "center",
      }}>
        {Object.keys(EXAMPLES).map((name) => (
          <button key={name} onClick={() => loadExample(name)} style={{
            padding: "6px 12px", fontSize: 10,
            background: activeExample === name ? "#1a1810" : "transparent",
            border: `1px solid ${activeExample === name ? GOLD : "#222"}`,
            borderRadius: 3,
            color: activeExample === name ? GOLD : "#555",
            cursor: "pointer", letterSpacing: 1,
            fontFamily: "'JetBrains Mono', monospace",
          }}>
            {name}
          </button>
        ))}
      </div>

      {/* Editor + Output */}
      <div style={{ maxWidth: 640, margin: "0 auto" }}>
        {/* Code editor */}
        <div style={{
          background: "#0f0f0d", border: "1px solid #1a1a16",
          borderRadius: "4px 4px 0 0", padding: "8px 12px",
          display: "flex", justifyContent: "space-between", alignItems: "center",
        }}>
          <span style={{ fontSize: 9, color: "#444", letterSpacing: 3 }}>NATIV3 SOURCE</span>
          <button onClick={run} style={{
            padding: "4px 16px", background: "transparent",
            border: `1px solid ${GOLD}`, borderRadius: 3,
            color: GOLD, fontSize: 10, cursor: "pointer",
            letterSpacing: 2, fontFamily: "'JetBrains Mono', monospace",
          }}>
            RUN ▶
          </button>
        </div>
        <textarea
          ref={textRef}
          value={code}
          onChange={(e) => setCode(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
              e.preventDefault();
              run();
            }
          }}
          spellCheck={false}
          style={{
            width: "100%", minHeight: 220, padding: 16,
            background: "#0a0a08", border: "1px solid #1a1a16",
            borderTop: "none", color: "#aaa", fontSize: 12,
            fontFamily: "'JetBrains Mono', monospace",
            lineHeight: 1.7, resize: "vertical",
            outline: "none", boxSizing: "border-box",
          }}
        />

        {/* Output */}
        <div style={{
          background: "#0f0f0d", border: "1px solid #1a1a16",
          borderTop: "none", borderRadius: "0 0 4px 4px",
          padding: "8px 12px",
        }}>
          <span style={{ fontSize: 9, color: "#444", letterSpacing: 3 }}>OUTPUT</span>
        </div>
        <div style={{
          background: "#080808", border: "1px solid #1a1a16",
          borderTop: "none", borderRadius: "0 0 4px 4px",
          padding: 16, minHeight: 120, maxHeight: 400,
          overflowY: "auto",
        }}>
          {output.length === 0 ? (
            <div style={{ color: "#333", fontSize: 11, fontStyle: "italic" }}>
              press RUN or Ctrl+Enter
            </div>
          ) : (
            output.map((line, i) => (
              <div key={i} style={{
                fontSize: 11, lineHeight: 1.8,
                color: line.includes("ENTANGLEMENT") || line.includes("FLIPPED") ? GOLD
                  : line.includes("ERROR") ? "#c44"
                  : line.includes("true") ? "#5a5"
                  : line.includes("false") ? "#a55"
                  : "#888",
                fontFamily: "'JetBrains Mono', monospace",
              }}>
                {line}
              </div>
            ))
          )}
        </div>

        {/* Key insight */}
        <div style={{
          marginTop: 32, padding: 20, background: "#0f0f0d",
          border: `1px solid #1a1a1644`, borderRadius: 4, textAlign: "center",
        }}>
          <div style={{ fontSize: 9, color: GOLD, letterSpacing: 4, marginBottom: 12 }}>
            WHY NATIV3 EXISTS
          </div>
          <div style={{
            fontFamily: "'Cormorant Garamond', Georgia, serif",
            fontSize: 15, color: "#777", lineHeight: 1.8,
            fontWeight: 300,
          }}>
            JavaScript's <span style={{ color: "#aaa", fontFamily: "monospace" }}>+</span> preserves dimension.
            Nativ3's <span style={{ color: GOLD, fontFamily: "monospace" }}>⊗</span> multiplies it.
            <br /><br />
            Three qubits tensor-producted live in C<sup>8</sup>.
            <br />
            <span style={{ color: GOLD }}>8</span> is not a metaphor. It's the dimension of the Hilbert space.
            <br />
            The <span style={{ color: GOLD }}>8</span> in Shift 8 IS the tensor product of three entangled states.
            <br /><br />
            <span style={{ fontFamily: "monospace", color: "#555", fontSize: 12 }}>
              dim(|0⟩ ⊗ |0⟩ ⊗ |0⟩) = 2 × 2 × 2 = 8
            </span>
          </div>
        </div>

        {/* Footer */}
        <div style={{ textAlign: "center", margin: "40px 0 20px", color: "#1a1a16", fontSize: 9, letterSpacing: 3 }}>
          THE COMPOSITE IS NOT THE PRIME · THE PRIME IS THE IDENTITY
        </div>
      </div>
    </div>
  );
}
