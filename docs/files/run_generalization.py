#!/usr/bin/env python3
"""
Workstream B: Theorem Generalization to All Controlled-Unitary Gates
=====================================================================
Verifies that star≠chain holds for arbitrary C-U gates, not just CNOT.
Tests the eigenvector condition: star=chain iff |ψ₂⟩ is eigenvector of U.
Derives functional form of F(α) for each gate.

No IBM Quantum account needed — pure statevector simulation.

Usage:
    python run_generalization.py                  # Full sweep
    python run_generalization.py --gate X         # Single gate
    python run_generalization.py --plot            # Generate figures
"""

import sys
import numpy as np
from pathlib import Path

from nativ3.circuits import (
    GATE_CATALOG, build_pair, get_eigeninfo, build_star_cx, build_chain_cx,
)
from nativ3.fidelity import statevector_fidelity, compute_bc_squared
from nativ3.analysis import analyze_generalization, save_results

# ── Configuration ───────────────────────────────────────────────────────

N_ALPHA_POINTS = 500
ALPHA_RANGE = (0, np.pi / 2)


def sweep_gate(
    gate_name: str,
    unitary: np.ndarray,
    alphas: np.ndarray,
    verbose: bool = True
) -> dict:
    """Sweep α for a single C-U gate, compute statevector fidelity at each point."""
    eigeninfo = get_eigeninfo(unitary)
    fidelities = np.zeros(len(alphas))

    for i, alpha in enumerate(alphas):
        star, chain = build_pair(float(alpha), unitary, label=gate_name)
        fidelities[i] = statevector_fidelity(star, chain)

    analysis = analyze_generalization(gate_name, unitary, alphas, fidelities, eigeninfo)

    if verbose:
        print(f"\n{'─' * 55}")
        print(f"  C-{gate_name}")
        print(f"  Eigenvalues: {[f'{complex(e['value']):.4f}' for e in eigeninfo]}")
        print(f"  Diagonal in comp. basis: {'✓' if analysis['is_diagonal'] else '✗'}")
        print(f"  U|0⟩ → basis state:      {'✓' if analysis['maps_zero_to_basis'] else '✗'}")
        print(f"  Category: {analysis['category']}")
        print(f"    F(α=0) = {analysis['f_at_zero']:.6f}")
        print(f"    F=1 ∀α: {'✓' if analysis['all_unity'] else '✗'}")
        print(f"  Structural prediction:   {'✓ CORRECT' if analysis['theorem_generalized'] else '✗ MISMATCH'}")

    return analysis


def sweep_cnot_baseline(alphas: np.ndarray, verbose: bool = True) -> dict:
    """Sweep CNOT specifically to verify cos⁴(α) formula."""
    fidelities = np.zeros(len(alphas))
    cos4_theoretical = np.cos(alphas) ** 4

    for i, alpha in enumerate(alphas):
        star = build_star_cx(float(alpha))
        chain = build_chain_cx(float(alpha))
        fidelities[i] = statevector_fidelity(star, chain)

    max_error = np.max(np.abs(fidelities - cos4_theoretical))

    if verbose:
        print(f"\n{'═' * 55}")
        print(f"  CNOT BASELINE: F = cos⁴(α) verification")
        print(f"  {len(alphas)} points, α ∈ [0, π/2]")
        print(f"  Max |F_measured - cos⁴(α)|: {max_error:.2e}")
        print(f"  Theorem 2: {'✓ CONFIRMED' if max_error < 1e-10 else '✗ FAILED'}")
        print(f"{'═' * 55}")

    eigeninfo = get_eigeninfo(np.array([[0, 1], [1, 0]]))  # X gate
    return analyze_generalization('X (CNOT)', np.array([[0, 1], [1, 0]]),
                                  alphas, fidelities, eigeninfo)


def reproduce_progress_table(verbose: bool = True) -> dict:
    """Reproduce the gate comparison table from nativ3-progress.md.

    Tests |000⟩ (α=0) and |010⟩ (α=π/2) for each gate.
    """
    if verbose:
        print(f"\n{'═' * 55}")
        print(f"  PROGRESS TABLE REPRODUCTION")
        print(f"{'═' * 55}")
        print(f"  {'Gate':<12} {'|000⟩ F=1?':>12} {'|010⟩ F=1?':>12} {'Random 0/N':>12}")
        print(f"  {'─' * 48}")

    table = {}
    for name, U in GATE_CATALOG.items():
        # α=0 → |ψ₂⟩=|0⟩
        star0, chain0 = build_pair(0.0, U, label=name)
        f_000 = statevector_fidelity(star0, chain0)

        # α=π/2 → |ψ₂⟩=|1⟩
        star1, chain1 = build_pair(np.pi / 2, U, label=name)
        f_010 = statevector_fidelity(star1, chain1)

        # Random test: 100 random α values
        n_random_match = 0
        for _ in range(100):
            alpha = np.random.uniform(0.01, np.pi / 2 - 0.01)
            s, c = build_pair(float(alpha), U, label=name)
            if statevector_fidelity(s, c) > 0.999:
                n_random_match += 1

        match_000 = '✓ Yes' if f_000 > 0.999 else '✗ No'
        match_010 = '✓ Yes' if f_010 > 0.999 else '✗ No'

        table[name] = {
            'f_000': float(f_000),
            'f_010': float(f_010),
            'random_matches': n_random_match,
        }

        if verbose:
            print(f"  C-{name:<10} {match_000:>12} {match_010:>12} {n_random_match:>8}/100")

    return table


def main():
    args = sys.argv[1:]
    single_gate = None
    do_plot = '--plot' in args

    if '--gate' in args:
        idx = args.index('--gate')
        single_gate = args[idx + 1] if idx + 1 < len(args) else None

    alphas = np.linspace(*ALPHA_RANGE, N_ALPHA_POINTS)

    print("=" * 55)
    print("  NATIV3 THEOREM GENERALIZATION")
    print(f"  {N_ALPHA_POINTS} α points, {len(GATE_CATALOG)} gates")
    print("=" * 55)

    # Phase 1: Reproduce progress table
    table = reproduce_progress_table()

    # Phase 2: CNOT baseline
    cnot_result = sweep_cnot_baseline(alphas)

    # Phase 3: Full sweep for each gate
    all_results = {'cnot_baseline': cnot_result}
    gates_to_test = {single_gate: GATE_CATALOG[single_gate]} if single_gate else GATE_CATALOG

    for name, U in gates_to_test.items():
        result = sweep_gate(name, U, alphas)
        all_results[name] = result

    # Summary
    print(f"\n{'═' * 55}")
    print(f"  GENERALIZATION SUMMARY")
    print(f"{'═' * 55}")

    gate_results = {k: v for k, v in all_results.items()
                    if isinstance(v, dict) and 'category' in v}

    n_confirmed = sum(1 for r in gate_results.values() if r.get('theorem_generalized'))
    n_total = len(gate_results)
    print(f"  Structural predictions correct: {n_confirmed}/{n_total}")

    # Category breakdown
    categories = {}
    for name, r in gate_results.items():
        cat = r.get('category', 'UNKNOWN')
        categories.setdefault(cat, []).append(name)

    print(f"\n  CORRECTED THEOREM (replaces eigenvector conjecture):")
    print(f"  ─────────────────────────────────────────────────────")
    print(f"  star = chain ∀|ψ₂⟩  ⟺  U is diagonal in comp. basis")
    print(f"  star = chain at |0⟩  ⟺  U|0⟩ ∈ {{|0⟩, |1⟩}} (basis state)")
    print(f"  star ≠ chain ∀|ψ₂⟩  ⟺  U|0⟩ has nonzero overlap with BOTH basis states")
    print()

    for cat, gates in sorted(categories.items()):
        print(f"  {cat}: {', '.join(f'C-{g}' for g in gates)}")

    print(f"{'═' * 55}")

    # Save results
    save_results({
        'table': table,
        'gate_sweeps': {k: v for k, v in all_results.items()},
        'summary': {
            'n_confirmed': n_confirmed,
            'n_total': n_total,
            'categories': {cat: gates for cat, gates in categories.items()},
        }
    }, 'generalization')

    # Generate plots if requested
    if do_plot:
        from nativ3.plotting import plot_generalization
        plot_generalization(all_results, alphas)


if __name__ == '__main__':
    main()
