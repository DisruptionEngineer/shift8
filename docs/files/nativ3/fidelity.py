"""
Fidelity computation with statistical framework.
Bhattacharyya coefficient + bootstrap confidence intervals.
"""

import numpy as np
from qiskit.quantum_info import Statevector
from qiskit import QuantumCircuit
from typing import Optional


def compute_bc_squared(counts_a: dict, counts_b: dict) -> float:
    """Bhattacharyya coefficient squared (classical fidelity).

    BC² measures overlap between two probability distributions.
    BC² = 1 means identical, BC² = 0 means no overlap.
    """
    all_keys = set(counts_a.keys()) | set(counts_b.keys())
    total_a = sum(counts_a.values())
    total_b = sum(counts_b.values())
    if total_a == 0 or total_b == 0:
        return 0.0
    bc = sum(
        np.sqrt(counts_a.get(k, 0) / total_a * counts_b.get(k, 0) / total_b)
        for k in all_keys
    )
    return float(bc ** 2)


def _resample_counts(counts: dict, total: int, rng: np.random.Generator) -> dict:
    """Multinomial resample from an empirical distribution."""
    keys = list(counts.keys())
    probs = np.array([counts[k] for k in keys], dtype=float)
    probs /= probs.sum()
    samples = rng.multinomial(total, probs)
    return {k: int(s) for k, s in zip(keys, samples) if s > 0}


def compute_bc_with_ci(
    counts_a: dict,
    counts_b: dict,
    n_bootstrap: int = 1000,
    ci: float = 0.95,
    seed: int = 42
) -> tuple[float, float, float]:
    """BC² with bootstrap confidence interval.

    Returns (bc_squared, ci_lower, ci_upper).
    """
    bc_sq = compute_bc_squared(counts_a, counts_b)
    total_a = sum(counts_a.values())
    total_b = sum(counts_b.values())
    rng = np.random.default_rng(seed)

    bootstrap_vals = []
    for _ in range(n_bootstrap):
        ra = _resample_counts(counts_a, total_a, rng)
        rb = _resample_counts(counts_b, total_b, rng)
        bootstrap_vals.append(compute_bc_squared(ra, rb))

    bootstrap_vals = np.array(bootstrap_vals)
    alpha = (1 - ci) / 2
    ci_lower = float(np.percentile(bootstrap_vals, 100 * alpha))
    ci_upper = float(np.percentile(bootstrap_vals, 100 * (1 - alpha)))
    return bc_sq, ci_lower, ci_upper


def statevector_fidelity(qc_a: QuantumCircuit, qc_b: QuantumCircuit) -> float:
    """Compute |⟨ψ_a|ψ_b⟩|² from statevector simulation (no measurement)."""
    sv_a = Statevector.from_instruction(qc_a.remove_final_measurements(inplace=False))
    sv_b = Statevector.from_instruction(qc_b.remove_final_measurements(inplace=False))
    return float(np.abs(sv_a.inner(sv_b)) ** 2)


def theoretical_fidelity_cnot(alpha: float) -> float:
    """Theorem 2: F(star, chain) = cos⁴(α) for CNOT."""
    return float(np.cos(alpha) ** 4)


def noise_aware_pass(
    measured: float,
    ci_lower: float,
    ci_upper: float,
    theoretical: float,
    noise_floor: float = 0.05
) -> bool:
    """Noise-aware pass/fail: theoretical value within CI ± noise floor."""
    return (ci_lower - noise_floor) <= theoretical <= (ci_upper + noise_floor)
