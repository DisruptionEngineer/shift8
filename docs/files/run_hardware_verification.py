#!/usr/bin/env python3
"""
Workstream A: Publication-Ready Hardware Verification
=====================================================
Runs Theorem 1 & 2 verification on IBM Quantum hardware with:
  - Measurement twirling (T-REx)
  - Gate twirling
  - Dynamical decoupling
  - Zero-noise extrapolation (manual gate folding)
  - Bootstrap confidence intervals
  - Optimal qubit selection

Usage:
    python run_hardware_verification.py --simulate          # Local dry run
    python run_hardware_verification.py --submit-only       # Queue on IBM, save job ID
    python run_hardware_verification.py --retrieve <job_id> # Fetch + analyze results
    python run_hardware_verification.py --backend ibm_torino --submit-only
"""

import sys
import numpy as np
from pathlib import Path

from nativ3.circuits import build_star_cx, build_chain_cx, build_alpha_sweep
from nativ3.fidelity import compute_bc_with_ci, statevector_fidelity, theoretical_fidelity_cnot
from nativ3.mitigation import amplify_noise, ZNE_FACTORS
from nativ3.analysis import analyze_cnot_experiment, save_results, print_summary


# ── Configuration ───────────────────────────────────────────────────────

# 13 α values for smooth Theorem 2 curve
ALPHAS = np.array([
    0,                    # |0⟩ — control
    np.pi / 12,           # 15°
    np.pi / 8,            # 22.5°
    np.pi / 6,            # 30°
    np.pi / 4,            # |+⟩ — key test point
    np.pi / 3,            # 60°
    5 * np.pi / 12,       # 75°
    np.pi / 2,            # |1⟩ — test
    # Extra points for curve density
    np.pi / 16,           # 11.25°
    3 * np.pi / 16,       # 33.75°
    5 * np.pi / 16,       # 56.25°
    7 * np.pi / 16,       # 78.75°
    3 * np.pi / 8,        # 67.5°
])

SHOTS = 8192
DEFAULT_BACKEND = 'ibm_torino'


def build_zne_circuits(alphas: np.ndarray) -> list:
    """Build circuits with ZNE gate folding.

    For each α: star_f1, chain_f1, star_f3, chain_f3, star_f5, chain_f5
    Total: len(alphas) * 2 * 3 = len(alphas) * 6 circuits
    """
    circuits = []
    base_circuits = []  # Unfolded for statevector reference

    for alpha in alphas:
        star = build_star_cx(float(alpha))
        chain = build_chain_cx(float(alpha))
        base_circuits.extend([star, chain])

        for factor in ZNE_FACTORS:
            circuits.append(amplify_noise(star, factor))
            circuits.append(amplify_noise(chain, factor))

    return circuits, base_circuits


def run_simulate(alphas: np.ndarray) -> None:
    """Local simulation dry run."""
    from qiskit.primitives import StatevectorSampler

    print("\n  Running local simulation (no hardware)...")
    sampler = StatevectorSampler()

    circuits = []
    base_circuits = []
    for alpha in alphas:
        star = build_star_cx(float(alpha))
        chain = build_chain_cx(float(alpha))
        base_circuits.extend([star, chain])
        circuits.extend([star, chain])

    job = sampler.run(circuits, shots=SHOTS)
    result = job.result()

    all_counts = []
    for i in range(len(circuits)):
        all_counts.append(result[i].data.c.get_counts())

    analysis = analyze_cnot_experiment(
        alphas, all_counts, base_circuits, use_zne=False
    )
    print_summary(analysis, 'SIMULATION RESULTS')
    save_results(analysis, 'simulation_cnot')

    # Generate plots
    from nativ3.plotting import plot_theorem1_bars, plot_theorem2_curve
    plot_theorem1_bars(analysis, 'Theorem 1 (Simulation)')
    plot_theorem2_curve(analysis, 'Theorem 2: F = cos⁴(α) (Simulation)')


def run_submit(backend_name: str, alphas: np.ndarray) -> str:
    """Submit ZNE circuits to hardware."""
    from nativ3.hardware import (
        get_service, get_backend, select_best_qubits,
        transpile_circuits, submit_job,
    )

    service = get_service()
    backend = get_backend(service, backend_name)
    print(f"\n  Backend: {backend.name} ({backend.num_qubits}q)")

    # Build ZNE circuits
    zne_circuits, base_circuits = build_zne_circuits(alphas)
    print(f"  Circuits: {len(zne_circuits)} ({len(alphas)} alphas × 2 topologies × {len(ZNE_FACTORS)} ZNE factors)")

    # Select optimal qubits
    best_qubits = select_best_qubits(backend)

    # Transpile
    print("  Transpiling...")
    transpiled = transpile_circuits(zne_circuits, backend, initial_layout=best_qubits)

    # Submit
    job_id = submit_job(
        transpiled, backend, shots=SHOTS,
        description=f'Nativ3 hardware verification: {len(alphas)} alphas, ZNE factors {ZNE_FACTORS}',
    )

    print(f"\n  ✅ Job submitted: {job_id}")
    print(f"  Use: python run_hardware_verification.py --retrieve {job_id}")
    return job_id


def run_retrieve(job_id: str, alphas: np.ndarray) -> None:
    """Retrieve and analyze completed hardware job."""
    from nativ3.hardware import retrieve_job, extract_counts, get_service

    service = get_service()
    job = retrieve_job(job_id, service)

    if str(job.status()) not in str(job.status()):
        print(f"  ⚠ Job not complete: {job.status()}")
        return

    result = job.result()
    n_circuits = len(alphas) * 2 * len(ZNE_FACTORS)
    all_counts = extract_counts(result, n_circuits)

    # Build base circuits for statevector reference
    base_circuits = []
    for alpha in alphas:
        base_circuits.extend([build_star_cx(float(alpha)), build_chain_cx(float(alpha))])

    analysis = analyze_cnot_experiment(
        alphas, all_counts, base_circuits,
        use_zne=True, n_zne_factors=len(ZNE_FACTORS)
    )
    analysis['job_id'] = job_id
    print_summary(analysis, f'HARDWARE RESULTS (job: {job_id[:12]}...)')
    save_results(analysis, 'hardware_cnot')

    # Generate plots
    from nativ3.plotting import plot_theorem1_bars, plot_theorem2_curve
    plot_theorem1_bars(analysis, f'Theorem 1 (Hardware: {job_id[:8]})')
    plot_theorem2_curve(analysis, f'Theorem 2: F = cos⁴(α) (Hardware)')


def main():
    args = sys.argv[1:]

    backend_name = DEFAULT_BACKEND
    if '--backend' in args:
        idx = args.index('--backend')
        backend_name = args[idx + 1]

    if '--simulate' in args:
        run_simulate(ALPHAS)
    elif '--submit-only' in args:
        run_submit(backend_name, ALPHAS)
    elif '--retrieve' in args:
        idx = args.index('--retrieve')
        job_id = args[idx + 1]
        run_retrieve(job_id, ALPHAS)
    else:
        print("Usage:")
        print("  python run_hardware_verification.py --simulate")
        print("  python run_hardware_verification.py --submit-only [--backend ibm_torino]")
        print("  python run_hardware_verification.py --retrieve <job_id>")


if __name__ == '__main__':
    main()
