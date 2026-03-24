"""
Results analysis — process hardware/simulation data,
validate theorems, generate summary reports.
"""

import numpy as np
import json
from pathlib import Path
from datetime import datetime
from typing import Optional

from nativ3.fidelity import (
    compute_bc_squared,
    compute_bc_with_ci,
    statevector_fidelity,
    theoretical_fidelity_cnot,
    noise_aware_pass,
)
from nativ3.mitigation import zne_extrapolate_with_uncertainty, ZNE_FACTORS

RESULTS_DIR = Path(__file__).parent.parent / 'results'


def analyze_cnot_experiment(
    alphas: np.ndarray,
    all_counts: list[dict],
    circuits: list,
    use_zne: bool = False,
    n_zne_factors: int = 3,
) -> dict:
    """Analyze a CNOT hardware/simulation experiment.

    Args:
        alphas: array of alpha values tested
        all_counts: interleaved [star₀, chain₀, star₁, chain₁, ...] counts
        circuits: corresponding circuit objects (for statevector verification)
        use_zne: whether counts include ZNE-amplified circuits
        n_zne_factors: number of ZNE noise factors (default 3: [1,3,5])

    Returns dict with per-alpha results and theorem verdicts.
    """
    results = []
    stride = 2 * n_zne_factors if use_zne else 2

    for i, alpha in enumerate(alphas):
        theoretical = theoretical_fidelity_cnot(alpha)

        if use_zne:
            # Counts are: [star_f1, chain_f1, star_f3, chain_f3, star_f5, chain_f5]
            base = i * stride
            zne_bc = []
            zne_ci_lo = []
            zne_ci_hi = []
            for j in range(n_zne_factors):
                idx_s = base + j * 2
                idx_c = base + j * 2 + 1
                bc, lo, hi = compute_bc_with_ci(all_counts[idx_s], all_counts[idx_c])
                zne_bc.append(bc)
                zne_ci_lo.append(lo)
                zne_ci_hi.append(hi)

            bc_sq, ci_lower, ci_upper = zne_extrapolate_with_uncertainty(
                ZNE_FACTORS[:n_zne_factors], zne_bc, zne_ci_lo, zne_ci_hi
            )
            raw_bc = zne_bc[0]  # factor=1 measurement
            raw_ci = (zne_ci_lo[0], zne_ci_hi[0])
        else:
            idx_s = i * 2
            idx_c = i * 2 + 1
            bc_sq, ci_lower, ci_upper = compute_bc_with_ci(
                all_counts[idx_s], all_counts[idx_c]
            )
            raw_bc = bc_sq
            raw_ci = (ci_lower, ci_upper)

        # Statevector check
        sv_fid = statevector_fidelity(circuits[i * 2], circuits[i * 2 + 1]) if circuits else None

        passed = noise_aware_pass(bc_sq, ci_lower, ci_upper, theoretical)

        results.append({
            'alpha': float(alpha),
            'theoretical': theoretical,
            'measured_bc': bc_sq,
            'ci_lower': ci_lower,
            'ci_upper': ci_upper,
            'raw_bc': raw_bc,
            'statevector_fidelity': sv_fid,
            'pass': passed,
        })

    # Theorem verdicts
    thm1_control = next((r for r in results if abs(r['alpha']) < 1e-10), None)
    thm1_test = next((r for r in results if abs(r['alpha'] - np.pi / 2) < 0.01), None)

    thm1_pass = (
        thm1_control is not None and thm1_control['measured_bc'] > 0.8
        and thm1_test is not None and thm1_test['measured_bc'] < 0.3
    ) if thm1_control and thm1_test else None

    return {
        'experiments': results,
        'theorem1_confirmed': thm1_pass,
        'theorem2_confirmed': all(r['pass'] for r in results),
        'n_experiments': len(results),
        'timestamp': datetime.now().isoformat(),
    }


def is_diagonal_in_computational_basis(unitary: np.ndarray, tol: float = 1e-10) -> bool:
    """Check if U is diagonal in the computational basis (e.g., Z, T, S)."""
    off_diag = np.abs(unitary[0, 1]) + np.abs(unitary[1, 0])
    return off_diag < tol


def maps_zero_to_basis(unitary: np.ndarray, tol: float = 1e-10) -> bool:
    """Check if U|0⟩ maps to a computational basis state (|0⟩ or |1⟩, up to phase).

    This is the condition for F(α=0)=1:
    When the middleman starts at |0⟩, the first CU maps it to U|0⟩.
    For star=chain at α=0, we need U|0⟩ to be a basis state so that
    ab=0 in U|0⟩ = a|0⟩ + b|1⟩ (eliminating cross terms in the chain path).
    """
    result = unitary @ np.array([1, 0])
    # Either |a|≈1 (maps to |0⟩) or |b|≈1 (maps to |1⟩)
    return abs(abs(result[0]) - 1.0) < tol or abs(abs(result[1]) - 1.0) < tol


def analyze_generalization(
    gate_name: str,
    unitary: np.ndarray,
    alphas: np.ndarray,
    fidelities: np.ndarray,
    eigeninfo: list[dict],
) -> dict:
    """Analyze generalization results for a single C-U gate.

    Key insight: The eigenvector condition is WRONG. The actual conditions are:
    1. F=1 for ALL α iff U is diagonal in the computational basis
    2. F=1 at α=0 iff U|0⟩ = e^{iφ}|0⟩ (gate preserves |0⟩)
    3. Otherwise, F<1 for all α

    This is because the CU gate's effect on the middleman must preserve its
    behavior as a computational-basis control for the next CU gate.
    """
    is_diagonal = is_diagonal_in_computational_basis(unitary)
    zero_preserved = maps_zero_to_basis(unitary)

    # Check fidelity at α=0
    f_at_zero = float(fidelities[0]) if len(fidelities) > 0 else None

    # Check if F=1 for all α
    all_unity = bool(np.all(np.abs(fidelities - 1.0) < 1e-6))

    # Check if F<1 for all α>0
    non_zero_mask = alphas > 0.01
    all_below_one_nontrivial = bool(np.all(fidelities[non_zero_mask] < 1.0 - 1e-6)) if np.any(non_zero_mask) else True

    # Classify gate behavior
    if all_unity:
        category = 'ALWAYS_EQUAL'  # Star = chain for all |ψ₂⟩ (diagonal gates)
    elif f_at_zero is not None and abs(f_at_zero - 1.0) < 1e-6:
        category = 'ZERO_ONLY'    # Star = chain only at |ψ₂⟩=|0⟩
    else:
        category = 'NEVER_EQUAL'  # Star ≠ chain for all |ψ₂⟩

    # Verify our structural predictions
    diagonal_prediction_correct = (is_diagonal == all_unity)
    zero_prediction_correct = (zero_preserved == (f_at_zero is not None and abs(f_at_zero - 1.0) < 1e-6))

    return {
        'gate': gate_name,
        'is_diagonal': bool(is_diagonal),
        'maps_zero_to_basis': bool(zero_preserved),
        'category': category,
        'f_at_zero': f_at_zero,
        'all_unity': all_unity,
        'diagonal_prediction_correct': diagonal_prediction_correct,
        'zero_prediction_correct': zero_prediction_correct,
        'eigenvalue_checks': [{
            'eigenvalue': complex(e['value']),
            'alpha': e['alpha'],
            'measured_fidelity': float(fidelities[np.argmin(np.abs(alphas - e['alpha']))]),
            'is_unity': abs(float(fidelities[np.argmin(np.abs(alphas - e['alpha']))]) - 1.0) < 1e-6,
        } for e in eigeninfo],
        'theorem_generalized': diagonal_prediction_correct and zero_prediction_correct,
        'fidelity_curve': {
            'alphas': alphas.tolist(),
            'fidelities': fidelities.tolist(),
        },
    }


def save_results(data: dict, name: str) -> Path:
    """Save analysis results as JSON."""
    RESULTS_DIR.mkdir(exist_ok=True)
    ts = datetime.now().strftime('%Y%m%d_%H%M%S')
    filepath = RESULTS_DIR / f'{name}_{ts}.json'

    # Convert numpy types for JSON serialization
    def convert(obj):
        if isinstance(obj, (np.bool_,)):
            return bool(obj)
        if isinstance(obj, (np.integer,)):
            return int(obj)
        if isinstance(obj, (np.floating,)):
            return float(obj)
        if isinstance(obj, (np.complexfloating, complex)):
            return {'real': float(obj.real), 'imag': float(obj.imag)}
        if isinstance(obj, np.ndarray):
            return obj.tolist()
        raise TypeError(f"Cannot serialize {type(obj)}")

    filepath.write_text(json.dumps(data, indent=2, default=convert))
    print(f"  Results saved: {filepath}")
    return filepath


def print_summary(analysis: dict, title: str = '') -> None:
    """Print a formatted summary of analysis results."""
    print(f"\n{'=' * 60}")
    if title:
        print(f"  {title}")
        print(f"{'=' * 60}")

    for exp in analysis.get('experiments', []):
        alpha_deg = np.degrees(exp['alpha'])
        status = '✓' if exp['pass'] else '✗'
        print(f"\n  α = {exp['alpha']:.4f} rad ({alpha_deg:.1f}°)")
        print(f"    Theoretical:  {exp['theoretical']:.6f}")
        print(f"    Measured BC²: {exp['measured_bc']:.6f}")
        print(f"    95% CI:       [{exp['ci_lower']:.6f}, {exp['ci_upper']:.6f}]")
        if exp.get('statevector_fidelity') is not None:
            print(f"    Statevector:  {exp['statevector_fidelity']:.6f}")
        print(f"    Verdict:      {status}")

    print(f"\n{'=' * 60}")
    t1 = analysis.get('theorem1_confirmed')
    t2 = analysis.get('theorem2_confirmed')
    print(f"  Theorem 1 (non-transitivity): {'CONFIRMED' if t1 else 'FAILED' if t1 is False else 'N/A'}")
    print(f"  Theorem 2 (cos⁴α fidelity):   {'CONFIRMED' if t2 else 'FAILED'}")
    print(f"{'=' * 60}")
