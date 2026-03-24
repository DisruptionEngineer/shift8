# Running the Nativ3 Experiment on IBM Quantum Hardware
## Complete Walkthrough — No Prior Experience Needed

---

## STEP 1: Create an IBM Quantum Account (5 minutes)

1. Open your browser
2. Go to: **https://quantum.ibm.com**
3. Click **"Create an IBMid account"** (or sign in with Google/GitHub)
4. Fill in email, name, password
5. Verify your email
6. You're in. Free tier gives you access to real quantum computers.

---

## STEP 2: Get Your API Token (2 minutes)

1. Once logged in at quantum.ibm.com, look at the top-right corner
2. Click your **profile icon** → **"Account settings"**
3. You'll see a section called **"API token"**
4. Click **"Copy"** next to the token (it looks like a long string of random characters)
5. Save this somewhere — you'll paste it into the terminal in Step 4

Your token looks something like: `a8b3f7e2c1d4...` (very long)

---

## STEP 3: Set Up Your Mac Mini (5 minutes)

Open Terminal on your Mac Mini (or SSH in from your phone via Tailscale).

Run these commands one at a time:

```bash
# Install the required packages
pip3 install qiskit qiskit-ibm-runtime

# Create a working directory
mkdir -p ~/nativ3-experiment
cd ~/nativ3-experiment
```

Now download the experiment file. You have two options:

**Option A:** If you downloaded `nativ3-experiment.py` from Claude:
```bash
# Move it to the working directory
mv ~/Downloads/nativ3-experiment.py ~/nativ3-experiment/
```

**Option B:** Create it directly (paste this entire block):
```bash
cat > ~/nativ3-experiment/run_experiment.py << 'SCRIPT'
"""
Nativ3 Theorem Verification on IBM Quantum Hardware
"""
from qiskit import QuantumCircuit
from qiskit.quantum_info import Statevector
from qiskit_ibm_runtime import QiskitRuntimeService, SamplerV2
from qiskit.transpiler.preset_passmanagers import generate_preset_pass_manager
import numpy as np
import sys
import json
from datetime import datetime

# ══════════════════════════════════════════
# CONFIGURATION
# ══════════════════════════════════════════
SHOTS = 4096  # Number of measurements per circuit

def build_circuits():
    """Build all 6 circuits (3 experiments × 2 topologies)"""
    circuits = {}
    
    # EXPERIMENT 1: Control case — |ψ₂⟩ = |0⟩ (should match)
    star_0 = QuantumCircuit(3, 3)
    star_0.h(0)
    star_0.cx(0, 1)
    star_0.cx(0, 2)
    star_0.measure([0,1,2], [0,1,2])
    star_0.name = "star_psi2_0"
    
    chain_0 = QuantumCircuit(3, 3)
    chain_0.h(0)
    chain_0.cx(0, 1)
    chain_0.cx(1, 2)
    chain_0.measure([0,1,2], [0,1,2])
    chain_0.name = "chain_psi2_0"
    
    # EXPERIMENT 2: Test case — |ψ₂⟩ = |1⟩ (should be orthogonal)
    star_1 = QuantumCircuit(3, 3)
    star_1.x(1)        # <-- This is the key difference
    star_1.h(0)
    star_1.cx(0, 1)
    star_1.cx(0, 2)
    star_1.measure([0,1,2], [0,1,2])
    star_1.name = "star_psi2_1"
    
    chain_1 = QuantumCircuit(3, 3)
    chain_1.x(1)        # <-- Same prep, different topology
    chain_1.h(0)
    chain_1.cx(0, 1)
    chain_1.cx(1, 2)
    chain_1.measure([0,1,2], [0,1,2])
    chain_1.name = "chain_psi2_1"
    
    # EXPERIMENT 3: Theorem 2 — |ψ₂⟩ = |+⟩ (F should = 0.25)
    star_plus = QuantumCircuit(3, 3)
    star_plus.h(1)      # <-- Puts qubit 1 in superposition
    star_plus.h(0)
    star_plus.cx(0, 1)
    star_plus.cx(0, 2)
    star_plus.measure([0,1,2], [0,1,2])
    star_plus.name = "star_psi2_plus"
    
    chain_plus = QuantumCircuit(3, 3)
    chain_plus.h(1)
    chain_plus.h(0)
    chain_plus.cx(0, 1)
    chain_plus.cx(1, 2)
    chain_plus.measure([0,1,2], [0,1,2])
    chain_plus.name = "chain_psi2_plus"
    
    circuits = {
        'exp1_star': star_0, 'exp1_chain': chain_0,
        'exp2_star': star_1, 'exp2_chain': chain_1,
        'exp3_star': star_plus, 'exp3_chain': chain_plus,
    }
    return circuits

def classical_fidelity(counts_a, counts_b):
    """Bhattacharyya coefficient squared — classical analog of fidelity"""
    all_keys = set(counts_a.keys()) | set(counts_b.keys())
    total_a = sum(counts_a.values())
    total_b = sum(counts_b.values())
    if total_a == 0 or total_b == 0:
        return 0.0
    bc = sum(np.sqrt(counts_a.get(k,0)/total_a * counts_b.get(k,0)/total_b) 
             for k in all_keys)
    return bc**2

def analyze_results(results_dict):
    """Analyze and print results"""
    experiments = [
        ("EXPERIMENT 1: |ψ₂⟩ = |0⟩ (control)", 
         'exp1_star', 'exp1_chain', 1.0,
         "Star and chain should produce IDENTICAL distributions"),
        ("EXPERIMENT 2: |ψ₂⟩ = |1⟩ (theorem 1)", 
         'exp2_star', 'exp2_chain', 0.0,
         "Star and chain should produce COMPLETELY DIFFERENT distributions"),
        ("EXPERIMENT 3: |ψ₂⟩ = |+⟩ (theorem 2)", 
         'exp3_star', 'exp3_chain', 0.25,
         "Star and chain should have 25% overlap (F = cos⁴(π/4))"),
    ]
    
    print("\n" + "="*60)
    print("  NATIV3 EXPERIMENTAL RESULTS")
    print("  " + datetime.now().strftime("%Y-%m-%d %H:%M:%S"))
    print("="*60)
    
    all_pass = True
    for name, star_key, chain_key, expected, description in experiments:
        counts_star = results_dict[star_key]
        counts_chain = results_dict[chain_key]
        fid = classical_fidelity(counts_star, counts_chain)
        
        # For hardware, allow noise margin
        if expected == 0.0:
            passed = fid < 0.05  # Allow 5% noise
        elif expected == 1.0:
            passed = fid > 0.90  # Allow 10% noise
        else:
            passed = abs(fid - expected) < 0.10  # Allow 10% margin
        
        if not passed:
            all_pass = False
        
        print(f"\n  {name}")
        print(f"  {description}")
        print(f"  Star:  {dict(sorted(counts_star.items(), key=lambda x:-x[1])[:4])}")
        print(f"  Chain: {dict(sorted(counts_chain.items(), key=lambda x:-x[1])[:4])}")
        print(f"  Classical fidelity: {fid:.4f}")
        print(f"  Expected:           {expected:.4f}")
        print(f"  Result:             {'✓ PASS' if passed else '✗ FAIL'}")
    
    print(f"\n{'='*60}")
    print(f"  OVERALL: {'ALL EXPERIMENTS PASSED' if all_pass else 'SOME EXPERIMENTS FAILED'}")
    print(f"{'='*60}\n")
    
    return all_pass

def run_on_hardware(token=None):
    """Run on real IBM Quantum hardware"""
    print("\n  Connecting to IBM Quantum...")
    
    if token:
        service = QiskitRuntimeService(channel="ibm_quantum", token=token)
    else:
        # Uses saved credentials
        service = QiskitRuntimeService(channel="ibm_quantum")
    
    # Find least busy backend with >= 3 qubits
    backend = service.least_busy(min_num_qubits=3, operational=True)
    print(f"  Selected backend: {backend.name}")
    print(f"  Queue depth: check quantum.ibm.com for current wait times")
    
    circuits = build_circuits()
    circuit_list = list(circuits.values())
    
    # Transpile for the specific backend
    print(f"  Transpiling circuits for {backend.name}...")
    pm = generate_preset_pass_manager(optimization_level=1, backend=backend)
    transpiled = pm.run(circuit_list)
    
    # Run
    print(f"  Submitting {len(transpiled)} circuits ({SHOTS} shots each)...")
    sampler = SamplerV2(backend)
    job = sampler.run(transpiled, shots=SHOTS)
    
    print(f"  Job ID: {job.job_id()}")
    print(f"  Status: {job.status()}")
    print(f"  Waiting for results (this may take several minutes)...")
    
    result = job.result()
    
    # Extract counts
    results_dict = {}
    for i, (name, _) in enumerate(circuits.items()):
        counts = result[i].data.c.get_counts()
        results_dict[name] = counts
    
    # Save raw results
    filename = f"nativ3_results_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
    with open(filename, 'w') as f:
        json.dump({
            'backend': backend.name,
            'shots': SHOTS,
            'job_id': job.job_id(),
            'timestamp': datetime.now().isoformat(),
            'results': {k: dict(v) for k, v in results_dict.items()}
        }, f, indent=2)
    print(f"  Raw results saved to: {filename}")
    
    return analyze_results(results_dict)

def run_simulation():
    """Run locally using Qiskit simulator"""
    from qiskit.primitives import StatevectorSampler
    
    print("\n  Running in SIMULATION mode (no IBM account needed)")
    
    circuits = build_circuits()
    sampler = StatevectorSampler()
    
    results_dict = {}
    for name, qc in circuits.items():
        job = sampler.run([qc], shots=SHOTS)
        result = job.result()
        counts = result[0].data.c.get_counts()
        results_dict[name] = counts
    
    return analyze_results(results_dict)

# ══════════════════════════════════════════
# MAIN
# ══════════════════════════════════════════
if __name__ == '__main__':
    print("\n  ╔══════════════════════════════════════════╗")
    print("  ║  NATIV3 THEOREM VERIFICATION             ║")
    print("  ║  Star ≠ Chain CNOT Topology               ║")
    print("  ╚══════════════════════════════════════════╝")
    
    if '--simulate' in sys.argv:
        run_simulation()
    elif '--token' in sys.argv:
        idx = sys.argv.index('--token')
        token = sys.argv[idx + 1]
        run_on_hardware(token=token)
    else:
        print("\n  Usage:")
        print("    python run_experiment.py --simulate          # Local simulation")
        print("    python run_experiment.py --token YOUR_TOKEN  # Real hardware")
        print()
SCRIPT
echo "Script created successfully"
```

---

## STEP 4: Test with Simulation First (2 minutes)

Before using real hardware, verify everything works locally:

```bash
cd ~/nativ3-experiment
python3 run_experiment.py --simulate
```

You should see output like:
```
  EXPERIMENT 1: |ψ₂⟩ = |0⟩ (control)
  Star:  {'000': 2029, '111': 2067}
  Chain: {'000': 2036, '111': 2060}
  Classical fidelity: 1.0000
  Result: ✓ PASS

  EXPERIMENT 2: |ψ₂⟩ = |1⟩ (theorem 1)
  Star:  {'010': 2054, '101': 2042}
  Chain: {'001': 2020, '110': 2076}
  Classical fidelity: 0.0000
  Result: ✓ PASS
```

If all three pass, you're ready for real hardware.

---

## STEP 5: Run on Real Quantum Hardware (5 min + wait time)

This is the real thing. Your circuits will run on actual quantum 
processors with real qubits.

```bash
cd ~/nativ3-experiment
python3 run_experiment.py --token PASTE_YOUR_TOKEN_HERE
```

Replace `PASTE_YOUR_TOKEN_HERE` with the API token you copied in Step 2.

**What happens:**
1. Script connects to IBM Quantum
2. Finds the least busy quantum computer with 3+ qubits
3. Transpiles your circuits for that specific hardware
4. Submits the job to the queue
5. Waits for execution (usually 1-10 minutes, sometimes longer)
6. Downloads results
7. Analyzes and displays them
8. Saves raw JSON to a file

**What you're waiting for:**
The quantum computer is shared by researchers worldwide. 
Your job goes into a queue. The script will show:
```
  Job ID: abc123...
  Status: QUEUED
  Waiting for results...
```
Just let it sit. It will print results when done.

---

## STEP 6: Read Your Results

When the job finishes, you'll see the same three experiments 
but now with real hardware noise:

**Experiment 1 (control):** Star and chain should give nearly 
identical distributions. Both should show mostly `000` and `111`.
Fidelity should be > 0.90.

**Experiment 2 (theorem 1):** This is the critical test.
- Star should give: `010` and `101`
- Chain should give: `001` and `110`
- These are COMPLETELY DIFFERENT outcomes
- Fidelity should be < 0.05

**Experiment 3 (theorem 2):** Partial overlap.
- Fidelity should be near 0.25 (±0.10 for noise)

The script also saves a JSON file with the raw data.

---

## STEP 7: Save Your Evidence

The script saves a file like `nativ3_results_20260324_143022.json`.
This contains:
- Which quantum computer ran your circuits
- The exact measurement counts
- Timestamp
- Job ID (you can look this up on quantum.ibm.com)

Keep this file. It's your experimental evidence.

---

## What Counts as Success

**Theorem 1 is confirmed if:** Experiment 2 shows zero 
(or near-zero) overlap between star and chain distributions. 
Star gives {010, 101}. Chain gives {001, 110}. Different 
bit strings entirely.

**Theorem 2 is confirmed if:** Experiment 3 shows ~25% 
overlap (fidelity ≈ 0.25), consistent with F = cos⁴(π/4).

**Both theorems are confirmed if:** All three experiments 
pass within noise margins.

---

## Troubleshooting

**"ModuleNotFoundError: No module named 'qiskit'"**
→ Run: `pip3 install qiskit qiskit-ibm-runtime`

**"No module named 'qiskit_ibm_runtime'"**
→ Run: `pip3 install qiskit-ibm-runtime`

**"401 Unauthorized" or token error**
→ Go back to quantum.ibm.com, regenerate your API token, 
   copy it again carefully (no extra spaces)

**Job stays QUEUED for a long time**
→ Normal. Free tier can have long queues. Wait or try later.
→ You can check status at quantum.ibm.com → "Jobs"

**Results look noisy (not exactly 50/50)**
→ Expected. Real quantum computers have errors (~1-3% per gate).
   That's why we use 4096 shots and allow noise margins.

**"No backends available"**
→ IBM sometimes takes backends offline for maintenance.
   Try again in a few hours.
