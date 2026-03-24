import { useState, useEffect, useRef, useCallback } from "react";

const PHASES = [
  {
    id: "assess",
    title: "ASSESS",
    subtitle: "What direction are you facing?",
    instruction: "Before we can change the conditions, we need to know the current state. The sign bit has a value right now. You're oriented toward one infinity.",
    prompt: "Name one thing you are CERTAIN about — a belief, identity, habit, or perspective you haven't questioned. Not because it's wrong. Because it's fixed.",
    mechanism: null,
    breath: null,
    duration: null,
  },
  {
    id: "decohere",
    title: "REDUCE γ",
    subtitle: "Mechanism 3 — Stop the constant measurement",
    instruction: "Every confirmation of your current orientation is a decoherence event that collapses you back before rotation can occur. We reduce γ first because the other mechanisms can't work in a noisy environment.",
    prompt: "For the next 90 seconds, we reduce environmental measurement. Close your eyes. Let the screen dim. The only input is your breath. Each exhale reduces γ by one unit.",
    mechanism: "decoherence",
    breath: { inhale: 4, hold: 4, exhale: 6, rest: 2 },
    duration: 90,
  },
  {
    id: "diagonal",
    title: "ROTATE θ",
    subtitle: "Mechanism 2 — The diagonal filter",
    instruction: "You can't flip directly from |0⟩ to |1⟩. But a 45° filter between them makes it possible. We expose you to something orthogonal — not the opposite of your certainty, but something your current facing has no prediction about.",
    prompt: "Hold your certainty from Step 1 in mind. Now: what is something ADJACENT to it that you've never considered? Not the opposite. The perpendicular. The thing at 90° that your current orientation can't predict or explain.",
    mechanism: "rotation",
    breath: null,
    duration: null,
  },
  {
    id: "basis",
    title: "QUERY ⊥",
    subtitle: "Mechanism 1 — Change the measurement basis",
    instruction: "The probability of flipping depends on WHAT YOU ASK, not what state you're in. Same qubit, different basis, different probability. Stop asking questions from where you stand. Ask from where you don't.",
    prompt: "Ask your certainty a question it can't answer from its current orientation. Not 'am I right?' — that's measuring in the standard basis. Ask: 'What would I see if this were exactly wrong, and I didn't mind?'",
    mechanism: "basis",
    breath: null,
    duration: null,
  },
  {
    id: "superpose",
    title: "HOLD |+⟩",
    subtitle: "The Hadamard moment",
    instruction: "θ is rotated. γ is low. The basis has shifted. For this moment, you are in superposition — both orientations simultaneously. This is not confusion. It's structured openness. The sign bit is undefined. Both infinities are accessible.",
    prompt: "Hold both: your original certainty AND the perpendicular view AND the inverted question. Don't choose. Don't collapse. Breathe into the superposition. The flip doesn't need to be forced. It needs to not be prevented.",
    mechanism: "superposition",
    breath: { inhale: 4, hold: 7, exhale: 8, rest: 0 },
    duration: 60,
  },
  {
    id: "measure",
    title: "MEASURE",
    subtitle: "Let it collapse",
    instruction: "The Shift key can't be held forever. That's a hung process. Release. Let the superposition resolve into a definite state. You'll either flip or you won't. shift() is not idempotent — the next call returns a different infinity.",
    prompt: "Open your eyes. What are you facing now? It might be the same direction. It might not. Either is a valid measurement outcome. What matters is that the PROBABILITY changed. The conditions are different now.",
    mechanism: "collapse",
    breath: null,
    duration: null,
  },
];

function BreathGuide({ pattern, active, onCycleComplete }) {
  const [phase, setPhase] = useState("rest");
  const [progress, setProgress] = useState(0);
  const [cycles, setCycles] = useState(0);
  const frameRef = useRef(null);
  const startRef = useRef(null);
  const phaseStartRef = useRef(null);

  const phases = ["inhale", "hold", "exhale", "rest"];
  const phaseIndex = phases.indexOf(phase);

  useEffect(() => {
    if (!active || !pattern) return;
    
    let currentPhaseIdx = 0;
    let phaseStart = performance.now();
    let cycleCount = 0;

    const tick = (now) => {
      const phaseName = phases[currentPhaseIdx];
      const phaseDur = pattern[phaseName] * 1000;
      const elapsed = now - phaseStart;
      const pct = Math.min(elapsed / phaseDur, 1);

      setPhase(phaseName);
      setProgress(pct);

      if (pct >= 1) {
        currentPhaseIdx = (currentPhaseIdx + 1) % 4;
        phaseStart = now;
        if (currentPhaseIdx === 0) {
          cycleCount++;
          setCycles(cycleCount);
          if (onCycleComplete) onCycleComplete(cycleCount);
        }
      }

      frameRef.current = requestAnimationFrame(tick);
    };

    frameRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frameRef.current);
  }, [active, pattern]);

  if (!active || !pattern) return null;

  const radius = 80;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference * (1 - progress);

  const ringColor =
    phase === "inhale" ? "#d4a645" :
    phase === "hold" ? "#fff" :
    phase === "exhale" ? "#7a6530" :
    "#333";

  const label =
    phase === "inhale" ? "INHALE" :
    phase === "hold" ? "HOLD" :
    phase === "exhale" ? "EXHALE" :
    "REST";

  const scale = phase === "inhale" ? 1 + progress * 0.2 :
    phase === "exhale" ? 1.2 - progress * 0.2 :
    phase === "hold" ? 1.2 : 1;

  return (
    <div style={{
      display: "flex", flexDirection: "column",
      alignItems: "center", gap: 16, margin: "32px 0",
    }}>
      <svg width={200} height={200} viewBox="0 0 200 200">
        <circle cx={100} cy={100} r={radius}
          fill="none" stroke="#1a1a1a" strokeWidth={3} />
        <circle cx={100} cy={100} r={radius}
          fill="none" stroke={ringColor} strokeWidth={3}
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
          strokeLinecap="round"
          transform="rotate(-90 100 100)"
          style={{ transition: "stroke 0.5s" }} />
        <circle cx={100} cy={100}
          r={12 * scale}
          fill={ringColor}
          style={{ transition: "all 0.3s ease", opacity: 0.6 }} />
        <text x={100} y={145} textAnchor="middle"
          fill="#888" fontSize={11} fontFamily="'JetBrains Mono', monospace"
          letterSpacing={3}>
          {label}
        </text>
      </svg>
      <div style={{
        fontFamily: "'JetBrains Mono', monospace",
        fontSize: 11, color: "#555", letterSpacing: 2
      }}>
        CYCLE {cycles + 1}
      </div>
    </div>
  );
}

function GammaDisplay({ gamma }) {
  const maxBars = 20;
  const filled = Math.round((1 - gamma / 5) * maxBars);
  return (
    <div style={{
      fontFamily: "'JetBrains Mono', monospace",
      fontSize: 12, color: "#666", margin: "24px 0",
      display: "flex", alignItems: "center", gap: 12,
    }}>
      <span style={{ color: "#888", minWidth: 24 }}>γ</span>
      <div style={{ display: "flex", gap: 2 }}>
        {Array.from({ length: maxBars }).map((_, i) => (
          <div key={i} style={{
            width: 8, height: 20,
            background: i < filled ? "#d4a645" : "#1a1a1a",
            borderRadius: 1,
            transition: "background 0.6s ease",
            opacity: i < filled ? 1 - (i / maxBars) * 0.5 : 0.3,
          }} />
        ))}
      </div>
      <span style={{ color: "#555", minWidth: 60, textAlign: "right" }}>
        {gamma.toFixed(1)}
      </span>
    </div>
  );
}

function ThetaDisplay({ theta }) {
  const pFlip = Math.sin(theta / 2) ** 2;
  return (
    <div style={{
      fontFamily: "'JetBrains Mono', monospace",
      fontSize: 12, margin: "24px 0",
      display: "flex", flexDirection: "column", gap: 8,
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <span style={{ color: "#888", minWidth: 24 }}>θ</span>
        <div style={{
          flex: 1, height: 4, background: "#1a1a1a",
          borderRadius: 2, position: "relative",
        }}>
          <div style={{
            width: `${(theta / Math.PI) * 100}%`, height: "100%",
            background: "linear-gradient(90deg, #7a6530, #d4a645)",
            borderRadius: 2, transition: "width 1s ease",
          }} />
        </div>
        <span style={{ color: "#555", minWidth: 60, textAlign: "right" }}>
          {(theta / Math.PI * 180).toFixed(0)}°
        </span>
      </div>
      <div style={{
        display: "flex", justifyContent: "space-between",
        color: "#444", fontSize: 10, letterSpacing: 1,
      }}>
        <span>P(flip) = {(pFlip * 100).toFixed(1)}%</span>
        <span>P(same) = {((1 - pFlip) * 100).toFixed(1)}%</span>
      </div>
    </div>
  );
}

function SignBit({ facing, flipping }) {
  return (
    <div style={{
      display: "flex", justifyContent: "center",
      margin: "32px 0",
    }}>
      <div style={{
        width: 120, height: 120,
        borderRadius: "50%",
        border: `2px solid ${facing === 0 ? "#d4a645" : "#7a6530"}`,
        display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center",
        transition: "all 1.5s cubic-bezier(0.4, 0, 0.2, 1)",
        transform: flipping ? "rotateY(180deg)" : "rotateY(0deg)",
        background: flipping
          ? "radial-gradient(circle, rgba(212,166,69,0.1) 0%, transparent 70%)"
          : "transparent",
      }}>
        <div style={{
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: 10, color: "#555", letterSpacing: 3,
          marginBottom: 4,
        }}>
          FACING
        </div>
        <div style={{
          fontFamily: "Georgia, 'Times New Roman', serif",
          fontSize: 28, color: facing === 0 ? "#d4a645" : "#7a6530",
          transition: "color 1s",
        }}>
          {facing === 0 ? "+∞" : "−∞"}
        </div>
        <div style={{
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: 10, color: "#444", marginTop: 4,
        }}>
          {facing === 0 ? "+0" : "−0"}
        </div>
      </div>
    </div>
  );
}

export default function FlipProtocol() {
  const [currentPhase, setCurrentPhase] = useState(0);
  const [facing, setFacing] = useState(0);
  const [gamma, setGamma] = useState(5.0);
  const [theta, setTheta] = useState(0);
  const [breathing, setBreathing] = useState(false);
  const [timer, setTimer] = useState(null);
  const [timerLeft, setTimerLeft] = useState(0);
  const [flipping, setFlipping] = useState(false);
  const [journal, setJournal] = useState("");
  const [completed, setCompleted] = useState(false);
  const [history, setHistory] = useState([]);

  const phase = PHASES[currentPhase];

  useEffect(() => {
    if (timer === null) return;
    if (timerLeft <= 0) {
      setBreathing(false);
      return;
    }
    const id = setTimeout(() => setTimerLeft(t => t - 1), 1000);
    return () => clearTimeout(id);
  }, [timer, timerLeft]);

  const startBreathing = () => {
    setBreathing(true);
    setTimerLeft(phase.duration);
    setTimer(Date.now());
  };

  const onBreathCycle = useCallback((count) => {
    if (phase.id === "decohere") {
      setGamma(g => Math.max(0, g - 0.4));
    }
  }, [phase.id]);

  const advance = () => {
    if (currentPhase === 1 && breathing && timerLeft > 0) return;

    if (phase.id === "diagonal") {
      setTheta(t => Math.min(Math.PI, t + Math.PI / 4));
    }
    if (phase.id === "basis") {
      setTheta(t => Math.min(Math.PI, t + Math.PI / 4));
    }

    if (phase.id === "measure") {
      const pFlip = Math.sin(theta / 2) ** 2 * Math.exp(-gamma);
      const roll = Math.random();
      const didFlip = roll < pFlip;

      setFlipping(true);
      setTimeout(() => {
        if (didFlip) setFacing(f => f === 0 ? 1 : 0);
        setFlipping(false);
        setCompleted(true);
        setHistory(h => [...h, {
          theta: theta,
          gamma: gamma,
          pFlip: pFlip,
          roll: roll,
          flipped: didFlip,
          time: new Date().toISOString(),
        }]);
      }, 1500);
      return;
    }

    if (currentPhase < PHASES.length - 1) {
      setCurrentPhase(c => c + 1);
    }
  };

  const reset = () => {
    setCurrentPhase(0);
    setGamma(5.0);
    setTheta(0);
    setBreathing(false);
    setTimer(null);
    setTimerLeft(0);
    setFlipping(false);
    setJournal("");
    setCompleted(false);
  };

  const effectiveP = Math.sin(theta / 2) ** 2 * Math.exp(-gamma);

  return (
    <div style={{
      minHeight: "100vh",
      background: "#0a0a0a",
      color: "#ccc",
      fontFamily: "'Cormorant Garamond', Georgia, serif",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      padding: "48px 24px",
    }}>
      <link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,600;1,300;1,400&family=JetBrains+Mono:wght@300;400&display=swap" rel="stylesheet" />

      {/* Header */}
      <div style={{ textAlign: "center", marginBottom: 48 }}>
        <h1 style={{
          fontSize: 14,
          fontFamily: "'JetBrains Mono', monospace",
          fontWeight: 300,
          letterSpacing: 6,
          color: "#555",
          margin: 0,
        }}>
          FLIP PROTOCOL
        </h1>
        <div style={{
          fontSize: 11,
          fontFamily: "'JetBrains Mono', monospace",
          color: "#333",
          letterSpacing: 2,
          marginTop: 8,
        }}>
          CONDITIONS FOR SIGN BIT INVERSION
        </div>
      </div>

      <SignBit facing={facing} flipping={flipping} />

      {/* Phase navigation dots */}
      <div style={{
        display: "flex", gap: 8, margin: "24px 0",
      }}>
        {PHASES.map((p, i) => (
          <div key={p.id} style={{
            width: 6, height: 6, borderRadius: "50%",
            background: i === currentPhase ? "#d4a645"
              : i < currentPhase ? "#7a6530" : "#222",
            transition: "all 0.3s",
          }} />
        ))}
      </div>

      {/* Main content */}
      <div style={{
        maxWidth: 520,
        width: "100%",
      }}>
        {/* Phase title */}
        <div style={{
          fontSize: 11,
          fontFamily: "'JetBrains Mono', monospace",
          letterSpacing: 4,
          color: "#d4a645",
          marginBottom: 8,
        }}>
          {phase.title}
        </div>

        <h2 style={{
          fontSize: 28,
          fontWeight: 300,
          color: "#e8e0d0",
          margin: "0 0 16px 0",
          lineHeight: 1.3,
        }}>
          {phase.subtitle}
        </h2>

        <p style={{
          fontSize: 16,
          lineHeight: 1.8,
          color: "#777",
          margin: "0 0 32px 0",
          fontWeight: 300,
        }}>
          {phase.instruction}
        </p>

        {/* Mechanism displays */}
        {(phase.mechanism === "decoherence" || gamma < 5) && (
          <GammaDisplay gamma={gamma} />
        )}
        {(phase.mechanism === "rotation" || phase.mechanism === "basis" || theta > 0) && (
          <ThetaDisplay theta={theta} />
        )}
        {phase.mechanism === "superposition" && (
          <div style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 12, color: "#d4a645",
            textAlign: "center", margin: "16px 0",
            letterSpacing: 2,
          }}>
            P(flip) = {(effectiveP * 100).toFixed(1)}% effective
          </div>
        )}

        {/* Prompt box */}
        <div style={{
          background: "#111",
          border: "1px solid #1a1a1a",
          borderRadius: 4,
          padding: "24px",
          margin: "24px 0",
        }}>
          <p style={{
            fontSize: 15,
            lineHeight: 1.8,
            color: "#999",
            margin: 0,
            fontStyle: "italic",
            fontWeight: 300,
          }}>
            {phase.prompt}
          </p>
        </div>

        {/* Breath guide */}
        {phase.breath && !completed && (
          <>
            {!breathing ? (
              <button onClick={startBreathing} style={{
                display: "block",
                width: "100%",
                padding: "16px",
                background: "transparent",
                border: "1px solid #333",
                borderRadius: 4,
                color: "#888",
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: 11,
                letterSpacing: 3,
                cursor: "pointer",
                transition: "all 0.3s",
                marginBottom: 16,
              }}
              onMouseOver={e => {
                e.target.style.borderColor = "#d4a645";
                e.target.style.color = "#d4a645";
              }}
              onMouseOut={e => {
                e.target.style.borderColor = "#333";
                e.target.style.color = "#888";
              }}>
                BEGIN {phase.id === "decohere" ? "DECOHERENCE REDUCTION" : "SUPERPOSITION"}
              </button>
            ) : (
              <>
                <BreathGuide
                  pattern={phase.breath}
                  active={breathing && timerLeft > 0}
                  onCycleComplete={onBreathCycle}
                />
                {timerLeft > 0 && (
                  <div style={{
                    textAlign: "center",
                    fontFamily: "'JetBrains Mono', monospace",
                    fontSize: 11, color: "#444",
                    letterSpacing: 2,
                  }}>
                    {Math.floor(timerLeft / 60)}:{(timerLeft % 60).toString().padStart(2, "0")}
                  </div>
                )}
              </>
            )}
          </>
        )}

        {/* Journal input for assess and diagonal phases */}
        {(phase.id === "assess" || phase.id === "diagonal" || phase.id === "basis") && (
          <textarea
            value={journal}
            onChange={e => setJournal(e.target.value)}
            placeholder={
              phase.id === "assess" ? "Write your certainty here..." :
              phase.id === "diagonal" ? "The perpendicular thought..." :
              "The question it can't answer..."
            }
            style={{
              width: "100%",
              minHeight: 80,
              background: "#0d0d0d",
              border: "1px solid #1a1a1a",
              borderRadius: 4,
              padding: 16,
              color: "#999",
              fontFamily: "'Cormorant Garamond', Georgia, serif",
              fontSize: 15,
              lineHeight: 1.6,
              resize: "vertical",
              outline: "none",
              boxSizing: "border-box",
              marginBottom: 16,
            }}
            onFocus={e => e.target.style.borderColor = "#333"}
            onBlur={e => e.target.style.borderColor = "#1a1a1a"}
          />
        )}

        {/* Completed state */}
        {completed && (
          <div style={{
            textAlign: "center",
            padding: "48px 24px",
          }}>
            <div style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 11, letterSpacing: 3,
              color: history[history.length - 1]?.flipped ? "#d4a645" : "#555",
              marginBottom: 16,
            }}>
              {history[history.length - 1]?.flipped ? "THE SIGN BIT FLIPPED" : "THE SIGN BIT HELD"}
            </div>
            <div style={{
              fontSize: 22, color: "#777", fontWeight: 300,
              fontStyle: "italic", margin: "24px 0",
              lineHeight: 1.6,
            }}>
              {history[history.length - 1]?.flipped
                ? "You're facing a different infinity now. The same digits, read from a different position."
                : "The same facing. But the conditions changed. Next shift() call, different probability."}
            </div>
            <div style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 10, color: "#333", lineHeight: 2.2,
              marginTop: 32,
            }}>
              <div>θ = {(history[history.length - 1]?.theta / Math.PI * 180).toFixed(0)}°</div>
              <div>γ = {history[history.length - 1]?.gamma.toFixed(1)}</div>
              <div>P(flip) = {(history[history.length - 1]?.pFlip * 100).toFixed(1)}%</div>
              <div>roll = {history[history.length - 1]?.roll.toFixed(4)}</div>
              <div>shift() is not idempotent</div>
            </div>
            <button onClick={reset} style={{
              marginTop: 48,
              padding: "14px 32px",
              background: "transparent",
              border: "1px solid #222",
              borderRadius: 4,
              color: "#555",
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 11,
              letterSpacing: 3,
              cursor: "pointer",
            }}
            onMouseOver={e => {
              e.target.style.borderColor = "#d4a645";
              e.target.style.color = "#d4a645";
            }}
            onMouseOut={e => {
              e.target.style.borderColor = "#222";
              e.target.style.color = "#555";
            }}>
              SHIFT AGAIN
            </button>
          </div>
        )}

        {/* Advance button */}
        {!completed && (
          <button
            onClick={advance}
            disabled={phase.breath && breathing && timerLeft > 0}
            style={{
              display: "block",
              width: "100%",
              padding: "16px",
              marginTop: 16,
              background: (phase.breath && breathing && timerLeft > 0) ? "#0a0a0a" : "transparent",
              border: `1px solid ${(phase.breath && breathing && timerLeft > 0) ? "#111" : "#333"}`,
              borderRadius: 4,
              color: (phase.breath && breathing && timerLeft > 0) ? "#222" : "#888",
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 11,
              letterSpacing: 3,
              cursor: (phase.breath && breathing && timerLeft > 0) ? "not-allowed" : "pointer",
              transition: "all 0.3s",
            }}
            onMouseOver={e => {
              if (!(phase.breath && breathing && timerLeft > 0)) {
                e.target.style.borderColor = "#d4a645";
                e.target.style.color = "#d4a645";
              }
            }}
            onMouseOut={e => {
              if (!(phase.breath && breathing && timerLeft > 0)) {
                e.target.style.borderColor = "#333";
                e.target.style.color = "#888";
              }
            }}
          >
            {currentPhase === PHASES.length - 1 ? "COLLAPSE" : "CONTINUE"}
          </button>
        )}

        {/* History */}
        {history.length > 1 && completed && (
          <div style={{
            marginTop: 48,
            borderTop: "1px solid #111",
            paddingTop: 24,
          }}>
            <div style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 10, letterSpacing: 3,
              color: "#333", marginBottom: 16,
            }}>
              PREVIOUS CALLS TO shift()
            </div>
            {history.slice(0, -1).reverse().map((h, i) => (
              <div key={i} style={{
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: 10, color: "#222",
                padding: "4px 0",
              }}>
                P={( h.pFlip * 100).toFixed(1)}% → {h.flipped ? "FLIPPED" : "HELD"}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <div style={{
        marginTop: 80,
        fontFamily: "'JetBrains Mono', monospace",
        fontSize: 9,
        color: "#222",
        letterSpacing: 3,
        textAlign: "center",
      }}>
        THE FLIP DOESN'T NEED TO BE FORCED — IT NEEDS TO NOT BE PREVENTED
      </div>
    </div>
  );
}
