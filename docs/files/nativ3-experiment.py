"""
Nativ3 Theorem Verification — IBM Quantum Experiment
=====================================================
Run on IBM Quantum hardware to experimentally confirm
Theorem 1 (Non-Transitivity) and Theorem 2 (Fidelity Formula).

Requirements:
    pip install qiskit qiskit-ibm-runtime

Usage:
    # Simulation only (no IBM account needed):
    python nativ3-experiment.py --simulate

    # On real hardware (requires IBM Quantum account):
    python nativ3-experiment.py --backend ibm_torino
"""

from qiskit import QuantumCircuit
from qiskit.quantum_info import Statevector
from qiskit.transpiler.preset_passmanagers import generate_preset_pass_manager
import numpy as np
import sys

def build_star(init_q1='0'):
    """Star topology: CNOT(0→1), CNOT(0→2)"""
    qc = QuantumCircuit(3, 3)
    if init_q1 == '1':
        qc.x(1)
    elif init_q1 == '+':
        qc.h(1)
    qc.h(0)
    qc.cx(0, 1)  # Direct: hub → spoke 1
    qc.cx(0, 2)  # Direct: hub → spoke 2
    qc.measure([0, 1, 2], [0, 1, 2])
    return qc

def build_chain(init_q1='0'):
    """Chain topology: CNOT(0→1), CNOT(1→2)"""
    qc = QuantumCircuit(3, 3)
    if init_q1 == '1':
        qc.x(1)
    elif init_q1 == '+':
        qc.h(1)
    qc.h(0)
    qc.cx(0, 1)  # Link 1: first → second
    qc.cx(1, 2)  # Link 2: second → third (transitive)
    qc.measure([0, 1, 2], [0, 1, 2])
    return qc

def simulate(qc, shots=4096):
    """Simulate using Qiskit statevector"""
    from qiskit.primitives import StatevectorSampler
    sampler = StatevectorSampler()
    job = sampler.run([qc], shots=shots)
    result = job.result()
    counts = result[0].data.c.get_counts()
    return counts

def run_on_hardware(circuits, backend_name, shots=4096):
    """Run circuits on real IBM Quantum hardware via SamplerV2."""
    from qiskit_ibm_runtime import QiskitRuntimeService, SamplerV2

    print(f"\n  Connecting to IBM Quantum...")
    service = QiskitRuntimeService()
    backend = service.backend(backend_name)
    print(f"  Backend: {backend.name} ({backend.num_qubits}q)")

    # Transpile for target hardware
    pm = generate_preset_pass_manager(optimization_level=1, backend=backend)
    transpiled = pm.run(circuits)

    print(f"  Submitting {len(circuits)} circuits ({shots} shots each)...")
    sampler = SamplerV2(mode=backend)
    job = sampler.run(transpiled, shots=shots)
    print(f"  Job ID: {job.job_id()}")
    print(f"  Waiting for results (queue + execution)...")

    result = job.result()
    all_counts = []
    for i in range(len(circuits)):
        counts = result[i].data.c.get_counts()
        all_counts.append(counts)
    return all_counts


def compute_classical_fidelity(counts_s, counts_c):
    """Bhattacharyya coefficient squared."""
    all_keys = set(counts_s.keys()) | set(counts_c.keys())
    total_s = sum(counts_s.values())
    total_c = sum(counts_c.values())
    bc = sum(np.sqrt(counts_s.get(k, 0) / total_s * counts_c.get(k, 0) / total_c)
             for k in all_keys)
    return bc ** 2


def run_experiments(use_hardware=False, backend_name=None):
    experiments = [
        ('CONTROL: |ψ₂⟩=|0⟩', '0', 1.0),
        ('TEST:    |ψ₂⟩=|1⟩', '1', 0.0),
        ('THEOREM2:|ψ₂⟩=|+⟩', '+', 0.25),
    ]

    # Build all circuits
    all_circuits = []
    for _, init, _ in experiments:
        all_circuits.append(build_star(init))
        all_circuits.append(build_chain(init))

    # Run on hardware or simulate
    if use_hardware:
        all_counts = run_on_hardware(all_circuits, backend_name)
    else:
        all_counts = [simulate(qc) for qc in all_circuits]

    # Report results
    for i, (name, init, expected_fid) in enumerate(experiments):
        star = all_circuits[i * 2]
        chain = all_circuits[i * 2 + 1]
        counts_s = all_counts[i * 2]
        counts_c = all_counts[i * 2 + 1]

        # Statevector verification
        sv_s = Statevector.from_instruction(
            star.remove_final_measurements(inplace=False))
        sv_c = Statevector.from_instruction(
            chain.remove_final_measurements(inplace=False))
        fid = float(np.abs(sv_s.inner(sv_c)) ** 2)

        cf = compute_classical_fidelity(counts_s, counts_c)

        print(f"\n{'=' * 55}")
        print(f"  {name}")
        print(f"  Predicted fidelity:    {expected_fid:.3f}")
        print(f"  Statevector fidelity:  {fid:.6f}")
        print(f"  {'Hardware' if use_hardware else 'Simulated'} fidelity (BC): {cf:.4f}")
        print(f"  Statevector match: {'✓' if abs(fid - expected_fid) < 0.001 else '✗'}")
        print(f"\n  Star distribution:  {dict(sorted(counts_s.items()))}")
        print(f"  Chain distribution: {dict(sorted(counts_c.items()))}")

    # Validate theorems from actual data
    # Theorem 1: star ≠ chain when |ψ₂⟩ ≠ |0⟩ (fidelity < 1)
    control_cf = compute_classical_fidelity(all_counts[0], all_counts[1])
    test_cf = compute_classical_fidelity(all_counts[2], all_counts[3])
    thm1 = control_cf > 0.9 and test_cf < 0.1

    # Theorem 2: F = cos⁴(α), for |+⟩ α=π/4 → F=0.25
    thm2_cf = compute_classical_fidelity(all_counts[4], all_counts[5])
    thm2 = abs(thm2_cf - 0.25) < 0.15  # hardware tolerance

    print(f"\n{'=' * 55}")
    print(f"  SUMMARY {'(HARDWARE)' if use_hardware else '(SIMULATION)'}")
    print(f"  Theorem 1: star≠chain for |ψ₂⟩≠|0⟩  — {'CONFIRMED' if thm1 else 'FAILED'}")
    print(f"  Theorem 2: F = cos⁴(α)               — {'CONFIRMED' if thm2 else 'FAILED'}")
    print(f"{'=' * 55}")


if __name__ == '__main__':
    hw = '--backend' in ' '.join(sys.argv)
    sim = '--simulate' in ' '.join(sys.argv)
    backend = sys.argv[sys.argv.index('--backend') + 1] if hw else None
    run_experiments(use_hardware=hw, backend_name=backend)
