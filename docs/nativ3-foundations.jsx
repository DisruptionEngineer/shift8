import { useState, useEffect } from "react";

const GOLD = "#c9a84c";
const BG = "#0c0c0a";
const CARD = "#0f0f0d";

function Section({ number, title, children, accent = GOLD }) {
  return (
    <div style={{ marginBottom: 56 }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: 12, marginBottom: 20 }}>
        <span style={{
          fontFamily: "'JetBrains Mono', monospace", fontSize: 10,
          color: accent, letterSpacing: 3, opacity: 0.6,
        }}>{number}</span>
        <h2 style={{
          fontFamily: "'Cormorant Garamond', Georgia, serif",
          fontSize: 28, fontWeight: 300, color: "#e8dcc8", margin: 0,
        }}>{title}</h2>
      </div>
      {children}
    </div>
  );
}

function P({ children }) {
  return (
    <p style={{
      fontFamily: "'Cormorant Garamond', Georgia, serif",
      fontSize: 17, lineHeight: 1.85, color: "#999", fontWeight: 300,
      margin: "0 0 16px",
    }}>{children}</p>
  );
}

function Highlight({ children, color = GOLD }) {
  return <span style={{ color, fontWeight: 400 }}>{children}</span>;
}

function Code({ children }) {
  return (
    <span style={{
      fontFamily: "'JetBrains Mono', monospace", fontSize: 13,
      color: "#bbb", background: "#141412", padding: "2px 6px",
      borderRadius: 3,
    }}>{children}</span>
  );
}

function Box({ children, label, accent = GOLD }) {
  return (
    <div style={{
      background: "#111110", border: `1px solid ${accent}22`,
      borderRadius: 4, padding: "16px 20px", margin: "20px 0",
    }}>
      {label && (
        <div style={{
          fontFamily: "'JetBrains Mono', monospace", fontSize: 9,
          color: accent, letterSpacing: 3, marginBottom: 10, opacity: 0.7,
        }}>{label}</div>
      )}
      {children}
    </div>
  );
}

// ═══════════════════════════════════════════════
// INTERACTIVE: Coin combiner
// ═══════════════════════════════════════════════
function CoinDemo() {
  const [mode, setMode] = useState("add"); // "add" or "tensor"
  const coins = ["H", "T"];

  const added = ["H", "T", "H", "T", "H", "T"]; // 3 coins "added" = just listed
  const tensored = [];
  for (const a of coins)
    for (const b of coins)
      for (const c of coins)
        tensored.push(a + b + c);

  const results = mode === "add" ? coins.concat(coins).concat(coins) : tensored;
  const isTensor = mode === "tensor";

  return (
    <div style={{ margin: "20px 0" }}>
      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        <button onClick={() => setMode("add")} style={{
          padding: "8px 20px", fontSize: 11, letterSpacing: 2,
          fontFamily: "'JetBrains Mono', monospace",
          background: !isTensor ? "#1a1810" : "transparent",
          border: `1px solid ${!isTensor ? GOLD : "#333"}`,
          color: !isTensor ? GOLD : "#555",
          borderRadius: 3, cursor: "pointer",
        }}>+ ADD</button>
        <button onClick={() => setMode("tensor")} style={{
          padding: "8px 20px", fontSize: 11, letterSpacing: 2,
          fontFamily: "'JetBrains Mono', monospace",
          background: isTensor ? "#1a1810" : "transparent",
          border: `1px solid ${isTensor ? GOLD : "#333"}`,
          color: isTensor ? GOLD : "#555",
          borderRadius: 3, cursor: "pointer",
        }}>⊗ TENSOR</button>
      </div>

      <div style={{
        display: "flex", alignItems: "center", gap: 8, marginBottom: 16,
        fontFamily: "'JetBrains Mono', monospace", fontSize: 12, color: "#888",
      }}>
        <span style={{ color: "#c77" }}>coin₁</span>
        <span style={{ color: "#555" }}>{isTensor ? "⊗" : "+"}</span>
        <span style={{ color: "#7c7" }}>coin₂</span>
        <span style={{ color: "#555" }}>{isTensor ? "⊗" : "+"}</span>
        <span style={{ color: "#77c" }}>coin₃</span>
        <span style={{ color: "#555" }}>=</span>
        <span style={{ color: GOLD }}>{isTensor ? "8 possibilities" : "6 items in a list"}</span>
      </div>

      <div style={{
        display: "flex", flexWrap: "wrap", gap: 6,
        transition: "all 0.3s",
      }}>
        {(isTensor ? tensored : ["H₁", "T₁", "H₂", "T₂", "H₃", "T₃"]).map((item, i) => (
          <div key={`${mode}-${i}`} style={{
            padding: isTensor ? "6px 8px" : "6px 12px",
            background: "#1a1a16",
            border: `1px solid ${isTensor ? GOLD + "33" : "#222"}`,
            borderRadius: 3,
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: isTensor ? 11 : 12,
            color: isTensor ? GOLD : "#666",
            animation: "fadeIn 0.3s ease",
            animationDelay: `${i * 30}ms`,
            animationFillMode: "both",
          }}>
            {item}
          </div>
        ))}
      </div>

      <div style={{
        fontFamily: "'JetBrains Mono', monospace", fontSize: 10,
        color: "#444", marginTop: 12, letterSpacing: 1,
      }}>
        {isTensor
          ? "⊗ creates EVERY COMBINATION. 2 × 2 × 2 = 8 possibilities."
          : "+ just puts them side by side. 2 + 2 + 2 = 6 items."}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════
// INTERACTIVE: CNOT visual
// ═══════════════════════════════════════════════
function CNOTDemo() {
  const [control, setControl] = useState(false);
  const [target, setTarget] = useState(false);

  const toggle = () => {
    setControl((c) => !c);
  };

  const afterCNOT = control ? !target : target;

  return (
    <div style={{ margin: "20px 0" }}>
      <div style={{ display: "flex", gap: 40, alignItems: "center", justifyContent: "center" }}>
        {/* Control */}
        <div style={{ textAlign: "center" }}>
          <div style={{
            fontFamily: "'JetBrains Mono', monospace", fontSize: 9,
            color: "#555", letterSpacing: 2, marginBottom: 8,
          }}>CONTROL</div>
          <button onClick={toggle} style={{
            width: 64, height: 64, borderRadius: "50%",
            background: control ? GOLD + "22" : "#111",
            border: `2px solid ${control ? GOLD : "#333"}`,
            color: control ? GOLD : "#555",
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 20, cursor: "pointer",
            transition: "all 0.3s",
          }}>
            {control ? "1" : "0"}
          </button>
          <div style={{
            fontFamily: "'JetBrains Mono', monospace", fontSize: 9,
            color: "#333", marginTop: 6,
          }}>tap to flip</div>
        </div>

        {/* Arrow */}
        <div style={{ textAlign: "center" }}>
          <div style={{
            fontFamily: "'JetBrains Mono', monospace", fontSize: 9,
            color: control ? GOLD : "#222", letterSpacing: 2,
            transition: "color 0.3s",
          }}>CNOT</div>
          <div style={{
            fontSize: 24, color: control ? GOLD : "#222",
            transition: "color 0.3s",
          }}>→</div>
          <div style={{
            fontFamily: "'JetBrains Mono', monospace", fontSize: 8,
            color: control ? GOLD : "#222", transition: "color 0.3s",
          }}>{control ? "FLIPS!" : "nothing"}</div>
        </div>

        {/* Target */}
        <div style={{ textAlign: "center" }}>
          <div style={{
            fontFamily: "'JetBrains Mono', monospace", fontSize: 9,
            color: "#555", letterSpacing: 2, marginBottom: 8,
          }}>TARGET</div>
          <div style={{
            width: 64, height: 64, borderRadius: "50%",
            background: afterCNOT ? GOLD + "22" : "#111",
            border: `2px solid ${afterCNOT ? GOLD : "#333"}`,
            color: afterCNOT ? GOLD : "#555",
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 20, display: "flex", alignItems: "center",
            justifyContent: "center", transition: "all 0.3s",
          }}>
            {afterCNOT ? "1" : "0"}
          </div>
          <div style={{
            fontFamily: "'JetBrains Mono', monospace", fontSize: 9,
            color: "#333", marginTop: 6,
          }}>controlled by left</div>
        </div>
      </div>

      <div style={{
        textAlign: "center", marginTop: 16,
        fontFamily: "'JetBrains Mono', monospace",
        fontSize: 11, color: control ? GOLD : "#444",
        transition: "color 0.3s",
      }}>
        {control
          ? "Control is ON → target gets FLIPPED. They're now linked."
          : "Control is OFF → target stays the same. No connection."}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════
// INTERACTIVE: GHZ builder
// ═══════════════════════════════════════════════
function GHZBuilder() {
  const [step, setStep] = useState(0);

  const steps = [
    {
      label: "START",
      qubits: [{ val: "0", color: "#555" }, { val: "0", color: "#555" }, { val: "0", color: "#555" }],
      state: "|000⟩",
      desc: "Three separate coins. All heads. Each one knows what it is. No connections.",
      entropy: { whole: "0", parts: "0 + 0 + 0 = 0", label: "Everything known everywhere" },
      entangled: false,
    },
    {
      label: "HADAMARD",
      qubits: [{ val: "?", color: GOLD }, { val: "0", color: "#555" }, { val: "0", color: "#555" }],
      state: "(|0⟩+|1⟩)/√2 ⊗ |0⟩ ⊗ |0⟩",
      desc: "First coin flipped into the air. It's spinning — not heads, not tails, genuinely BOTH until someone looks. The other two haven't moved.",
      entropy: { whole: "1", parts: "1 + 0 + 0 = 1", label: "One coin uncertain, two certain" },
      entangled: false,
    },
    {
      label: "CNOT 1→2",
      qubits: [{ val: "?", color: GOLD }, { val: "?", color: GOLD }, { val: "0", color: "#555" }],
      state: "(|00⟩+|11⟩)/√2 ⊗ |0⟩",
      desc: "First coin is LINKED to second coin. Whatever the first coin lands on, the second will match. They don't know what they'll be — but they know they'll be THE SAME THING.",
      entropy: { whole: "1", parts: "1 + 1 + 0 = 2", label: "Two coins correlated, third independent" },
      entangled: true,
    },
    {
      label: "CNOT 1→3",
      qubits: [{ val: "?", color: GOLD }, { val: "?", color: GOLD }, { val: "?", color: GOLD }],
      state: "(|000⟩+|111⟩)/√2",
      desc: "ALL THREE are now linked. None of them has its own answer. Ask any one alone: pure randomness, 50/50. But they will ALL land the same way. The relationship IS the information. The parts know nothing. The whole knows everything.",
      entropy: { whole: "0", parts: "1 + 1 + 1 = 3", label: "Parts: maximum confusion. Whole: perfect clarity." },
      entangled: true,
    },
  ];

  const s = steps[step];

  return (
    <div style={{ margin: "20px 0" }}>
      {/* Step buttons */}
      <div style={{ display: "flex", gap: 6, marginBottom: 20 }}>
        {steps.map((st, i) => (
          <button key={i} onClick={() => setStep(i)} style={{
            flex: 1, padding: "8px 4px", fontSize: 9,
            fontFamily: "'JetBrains Mono', monospace", letterSpacing: 1,
            background: i === step ? "#1a1810" : "transparent",
            border: `1px solid ${i === step ? GOLD : i <= step ? "#333" : "#1a1a16"}`,
            color: i === step ? GOLD : i < step ? "#555" : "#222",
            borderRadius: 3, cursor: "pointer",
          }}>
            {st.label}
          </button>
        ))}
      </div>

      {/* Qubit display */}
      <div style={{
        display: "flex", justifyContent: "center", gap: 24,
        margin: "24px 0",
      }}>
        {s.qubits.map((q, i) => (
          <div key={i} style={{ textAlign: "center" }}>
            <div style={{
              width: 72, height: 72, borderRadius: "50%",
              border: `2px solid ${q.color}`,
              display: "flex", alignItems: "center", justifyContent: "center",
              fontFamily: "'JetBrains Mono', monospace", fontSize: 24,
              color: q.color, transition: "all 0.5s",
              background: q.val === "?" ? `${GOLD}11` : "transparent",
              animation: q.val === "?" ? "pulse 2s infinite" : "none",
            }}>
              {q.val}
            </div>
            <div style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 9, color: "#333", marginTop: 6,
            }}>qubit {i + 1}</div>
          </div>
        ))}
      </div>

      {/* Connection lines */}
      {s.entangled && (
        <div style={{
          textAlign: "center", margin: "-12px 0 8px",
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: 20, color: GOLD, opacity: 0.3,
          letterSpacing: 16,
        }}>
          {step >= 3 ? "⟨ ═══════ ⟩" : "⟨ ════ ⟩"}
        </div>
      )}

      {/* Description */}
      <P>{s.desc}</P>

      {/* Math state */}
      <div style={{
        fontFamily: "'JetBrains Mono', monospace", fontSize: 12,
        color: "#666", padding: "8px 12px", background: "#0a0a08",
        borderRadius: 3, margin: "12px 0",
      }}>
        |ψ⟩ = {s.state}
      </div>

      {/* Entropy */}
      <div style={{
        display: "flex", gap: 16, margin: "12px 0",
      }}>
        <div style={{
          flex: 1, padding: "10px 14px", background: "#0a0a08",
          borderRadius: 3, borderLeft: `2px solid ${step === 3 ? GOLD : "#222"}`,
        }}>
          <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9, color: "#444", letterSpacing: 2 }}>
            S(whole)
          </div>
          <div style={{
            fontFamily: "Georgia, serif", fontSize: 22,
            color: step === 3 ? GOLD : "#666", marginTop: 4,
          }}>
            {s.entropy.whole}
          </div>
        </div>
        <div style={{
          flex: 1, padding: "10px 14px", background: "#0a0a08",
          borderRadius: 3, borderLeft: `2px solid ${step === 3 ? "#c44" : "#222"}`,
        }}>
          <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9, color: "#444", letterSpacing: 2 }}>
            S(parts)
          </div>
          <div style={{
            fontFamily: "Georgia, serif", fontSize: 22,
            color: step === 3 ? "#c77" : "#666", marginTop: 4,
          }}>
            {s.entropy.parts}
          </div>
        </div>
      </div>
      <div style={{
        fontFamily: "'JetBrains Mono', monospace", fontSize: 10,
        color: step === 3 ? GOLD : "#333", textAlign: "center",
        transition: "color 0.3s",
      }}>
        {s.entropy.label}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════
// MAIN PAGE
// ═══════════════════════════════════════════════
export default function Nativ3Foundations() {
  return (
    <div style={{
      minHeight: "100vh", background: BG, color: "#ccc",
      padding: "40px 20px 80px", maxWidth: 600, margin: "0 auto",
    }}>
      <link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,600;1,300;1,400&family=JetBrains+Mono:wght@300;400&display=swap" rel="stylesheet" />
      <style>{`
        @keyframes pulse { 0%,100% { opacity: 1; } 50% { opacity: 0.6; } }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>

      {/* Header */}
      <div style={{ textAlign: "center", marginBottom: 56 }}>
        <div style={{
          fontFamily: "'Cormorant Garamond', Georgia, serif",
          fontSize: 42, fontWeight: 300, color: "#e8dcc8",
        }}>
          Nativ<span style={{ color: GOLD, fontWeight: 600 }}>3</span>
        </div>
        <div style={{
          fontFamily: "'JetBrains Mono', monospace", fontSize: 9,
          color: "#333", letterSpacing: 4, marginTop: 6,
        }}>FOUNDATIONS · FROM ZERO</div>
      </div>

      {/* ═══════ SECTION 1: TENSOR ═══════ */}
      <Section number="01" title="What's a Tensor?">
        <P>
          Forget the math word. A tensor is just <Highlight>a thing that needs more than one number to describe it</Highlight>.
        </P>
        <P>
          Temperature is one number: 72°. That's a <Highlight color="#888">scalar</Highlight>. One slot. One value.
        </P>
        <P>
          Wind is two things: speed AND direction. "20 mph northwest." That's a <Highlight color="#888">vector</Highlight>. Two slots. You need both to know what the wind is doing.
        </P>
        <P>
          Now imagine you need to describe how <Highlight>stress</Highlight> is distributed through a piece of metal. At each point, force can push in three directions (x, y, z) and each face of a tiny cube has three directions it could be pushed from. That's 3 × 3 = 9 numbers to describe one point. That's a <Highlight color="#888">tensor</Highlight>.
        </P>

        <Box label="THE PATTERN">
          <P style={{ margin: 0 }}>
            Scalar: <Highlight>1 number</Highlight> (temperature)<br/>
            Vector: <Highlight>1 × n numbers</Highlight> (wind)<br/>
            Tensor: <Highlight>n × m × ... numbers</Highlight> (stress, curvature, quantum states)
          </P>
          <div style={{
            fontFamily: "'JetBrains Mono', monospace", fontSize: 11,
            color: "#555", marginTop: 12,
          }}>
            A tensor is anything that needs a GRID of numbers,<br/>
            not just a list.
          </div>
        </Box>

        <P>
          A <Highlight>quantum state</Highlight> is a tensor. A single coin that can be heads or tails needs two numbers: the chance of heads, and the chance of tails. That's a vector in C² — a tiny tensor. Two slots.
        </P>
      </Section>

      {/* ═══════ SECTION 2: TENSOR PRODUCT ═══════ */}
      <Section number="02" title="What's a Tensor Product?">
        <P>
          This is the big one. The tensor product is how you <Highlight>combine things in Nativ3</Highlight>. It's different from addition. Wildly different. Here's why.
        </P>

        <P>
          Imagine a restaurant menu. Three main dishes. Four sides.
        </P>

        <Box label="ADDITION (+)">
          <P style={{ margin: 0 }}>
            "How many items on the menu?"<br/>
            3 mains + 4 sides = <Highlight color="#888">7 items</Highlight>.<br/>
            You list them. That's it. Seven things on a list.
          </P>
        </Box>

        <Box label="TENSOR PRODUCT (⊗)" accent={GOLD}>
          <P style={{ margin: 0 }}>
            "How many possible MEALS can I order?"<br/>
            3 mains × 4 sides = <Highlight>12 possible meals</Highlight>.<br/>
            Every main paired with every side. Not a list — a GRID.<br/>
            The combinations are the product, not the sum.
          </P>
        </Box>

        <P>
          Addition says <Highlight color="#888">"how many things do I have?"</Highlight><br/>
          Tensor product says <Highlight>"how many COMBINATIONS are possible?"</Highlight>
        </P>
        <P>
          Now try it with coins:
        </P>

        <CoinDemo />

        <Box label="WHY THIS MATTERS">
          <P style={{ margin: 0 }}>
            When Nativ3 combines three qubits (quantum coins), it doesn't stack them — it tensor-products them. Each qubit has <Highlight>2 states</Highlight> (heads/tails). Three qubits tensor-producted: 2 × 2 × 2 = <Highlight>8 possible combinations</Highlight>.
          </P>
          <div style={{
            fontFamily: "'JetBrains Mono', monospace", fontSize: 14,
            color: GOLD, textAlign: "center", margin: "16px 0 8px",
          }}>
            dim(qubit ⊗ qubit ⊗ qubit) = 8
          </div>
          <div style={{
            fontFamily: "'JetBrains Mono', monospace", fontSize: 11,
            color: "#555", textAlign: "center",
          }}>
            The 8 in Shift 8.
          </div>
        </Box>
      </Section>

      {/* ═══════ SECTION 3: CNOT ═══════ */}
      <Section number="03" title="What's a CNOT?">
        <P>
          CNOT stands for "Controlled NOT." Forget the name. Think of it as: <Highlight>an IF statement for quantum coins</Highlight>.
        </P>
        <P>
          You have two coins. One is the <Highlight color="#c77">control</Highlight>. One is the <Highlight color="#7c7">target</Highlight>. The rule is simple:
        </P>

        <Box label="THE RULE">
          <P style={{ margin: 0 }}>
            <Highlight color="#c77">IF</Highlight> the control coin is heads (1),<br/>
            <Highlight color="#7c7">THEN</Highlight> flip the target coin.<br/><br/>
            If the control coin is tails (0), do nothing.
          </P>
        </Box>

        <P>
          That's it. That's the whole gate. "If this, flip that." Try it:
        </P>

        <CNOTDemo />

        <P>
          Here's where it gets interesting. Remember that quantum coins can be <Highlight>spinning</Highlight> — not heads or tails, but both at once (superposition). What happens when you CNOT a spinning coin to a still coin?
        </P>

        <Box label="CNOT + SUPERPOSITION = ENTANGLEMENT">
          <P style={{ margin: 0 }}>
            Spinning control + still target:<br/><br/>
            <Highlight color="#888">IF heads → flip target</Highlight> AND <Highlight color="#888">IF tails → leave target</Highlight><br/><br/>
            Both happen simultaneously. The target becomes:<br/>
            "I'll be heads <Highlight>if</Highlight> the control is heads,<br/>
            and tails <Highlight>if</Highlight> the control is tails."<br/><br/>
            Neither coin has its own answer anymore.<br/>
            They only have a <Highlight>shared</Highlight> answer.<br/>
            That's entanglement.
          </P>
        </Box>

        <P>
          CNOT is how openness <Highlight>spreads</Highlight>. One coin is uncertain, and through the CNOT gate, that uncertainty becomes a shared property of both coins. The connection IS the information.
        </P>
      </Section>

      {/* ═══════ SECTION 4: GHZ ═══════ */}
      <Section number="04" title="What's a GHZ State?">
        <P>
          GHZ stands for Greenberger–Horne–Zeilinger. Forget the names. It's just this: <Highlight>three coins that are so connected that none of them has its own answer, but the group has a perfect answer</Highlight>.
        </P>
        <P>
          You make it in three steps. Tap through them:
        </P>

        <GHZBuilder />

        <P>
          That last state — where the parts know nothing but the whole knows everything — is the GHZ state. And its entropy (its uncertainty) is <Highlight>exactly zero</Highlight>.
        </P>
        <P>
          Three things. Each one maximally confused when examined alone. But the trio is perfectly defined. You ask any one coin: "heads or tails?" and it says "I genuinely don't know — 50/50." You ask all three together: "are you in the state (all-heads-or-all-tails)?" and they answer "yes, with absolute certainty."
        </P>

        <Box label="THE EQUATIONS IN PLAIN ENGLISH">
          <div style={{
            fontFamily: "'JetBrains Mono', monospace", fontSize: 12,
            color: "#888", lineHeight: 2.2,
          }}>
            <div>
              <span style={{ color: GOLD }}>1 + 1 + 1 = 3</span>
              <span style={{ color: "#444" }}> &nbsp;→ three separate coins, added up = just three coins</span>
            </div>
            <div>
              <span style={{ color: GOLD }}>3 ≠ 3</span>
              <span style={{ color: "#444" }}> &nbsp;→ three coins stacked ≠ three coins entangled</span>
            </div>
            <div>
              <span style={{ color: GOLD }}>3 = 0</span>
              <span style={{ color: "#444" }}> &nbsp;→ three coins entangled = zero uncertainty in the whole</span>
            </div>
          </div>
        </Box>
      </Section>

      {/* ═══════ SECTION 5: Putting it together ═══════ */}
      <Section number="05" title="The Whole Picture">
        <P>
          Now you have all the pieces:
        </P>

        <Box label="THE VOCABULARY">
          <div style={{
            fontFamily: "'Cormorant Garamond', Georgia, serif",
            fontSize: 16, color: "#999", lineHeight: 2.4, fontWeight: 300,
          }}>
            <Highlight>Tensor</Highlight> — a thing described by a grid of numbers, not just one number.<br/>
            <Highlight>Tensor product ⊗</Highlight> — combining things by multiplying possibilities, not adding items.<br/>
            <Highlight>CNOT</Highlight> — "if this is on, flip that." Creates shared fate between two things.<br/>
            <Highlight>GHZ</Highlight> — three things with perfectly shared fate. Parts know nothing. Whole knows everything.<br/>
          </div>
        </Box>

        <P>
          The reason we need a language called Nativ3 instead of JavaScript is that JavaScript's <Code>+</Code> operator can only <Highlight color="#888">add</Highlight>. It stacks things side by side. It can never create entanglement. It can never make a GHZ state. It can never produce a system where the whole knows more than the parts.
        </P>
        <P>
          Nativ3's <Code>⊗</Code> operator creates the <Highlight>possibility space</Highlight> — the full grid of combinations — and then the quantum gates (H, CNOT) create <Highlight>correlations</Highlight> within that space that can't be decomposed back into the parts.
        </P>
        <P>
          That's why three qubits tensor-producted live in C⁸. That's why the 8 in Shift 8 is not arbitrary — it's <Highlight>the dimension of three entangled quantum states</Highlight>. And when you Shift that 8, when you press the key and ∞ becomes *, you're querying the full 8-dimensional possibility space and collapsing it to one answer.
        </P>

        <div style={{
          textAlign: "center", margin: "40px 0 0",
          fontFamily: "'Cormorant Garamond', Georgia, serif",
          fontSize: 18, color: "#555", fontStyle: "italic",
          fontWeight: 300, lineHeight: 1.8,
        }}>
          Three coins. One truth.<br/>
          The truth isn't in any coin.<br/>
          The truth is in the connection.<br/>
          The connection is the 8.<br/>
          The 8, shifted, is *.
        </div>
      </Section>

      {/* Footer */}
      <div style={{
        textAlign: "center", marginTop: 56,
        fontFamily: "'JetBrains Mono', monospace",
        fontSize: 8, color: "#1a1a16", letterSpacing: 3,
      }}>
        NATIV3 FOUNDATIONS · THE COMPOSITE IS NOT THE PRIME · THE PRIME IS THE IDENTITY
      </div>
    </div>
  );
}
