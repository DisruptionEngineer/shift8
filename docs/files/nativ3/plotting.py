"""
Publication-quality matplotlib figures for Nativ3 experiments.
"""

import numpy as np
import matplotlib
matplotlib.use('Agg')  # Non-interactive backend
import matplotlib.pyplot as plt
from pathlib import Path

FIGURES_DIR = Path(__file__).parent.parent / 'figures'
FIGURES_DIR.mkdir(exist_ok=True)


def _setup_style():
    """Configure publication aesthetics."""
    plt.rcParams.update({
        'font.size': 11,
        'axes.labelsize': 13,
        'axes.titlesize': 14,
        'xtick.labelsize': 10,
        'ytick.labelsize': 10,
        'legend.fontsize': 10,
        'figure.dpi': 150,
        'savefig.dpi': 300,
        'savefig.bbox': 'tight',
        'axes.grid': True,
        'grid.alpha': 0.3,
    })


def plot_theorem1_bars(analysis: dict, title: str = 'Theorem 1: Non-Transitivity') -> Path:
    """Bar chart: star vs chain BC² for key states with error bars."""
    _setup_style()

    # Pick key experiments: α=0, α≈π/4, α=π/2
    key_alphas = [0, np.pi / 4, np.pi / 2]
    key_labels = ['|0⟩\n(α=0)', '|+⟩\n(α=π/4)', '|1⟩\n(α=π/2)']

    experiments = analysis.get('experiments', [])
    selected = []
    for target in key_alphas:
        closest = min(experiments, key=lambda e: abs(e['alpha'] - target))
        selected.append(closest)

    fig, ax = plt.subplots(figsize=(8, 5))

    x = np.arange(len(selected))
    measured = [e['measured_bc'] for e in selected]
    theoretical = [e['theoretical'] for e in selected]
    ci_lo = [e['measured_bc'] - e['ci_lower'] for e in selected]
    ci_hi = [e['ci_upper'] - e['measured_bc'] for e in selected]

    bars = ax.bar(x, measured, 0.5, yerr=[ci_lo, ci_hi],
                  capsize=5, color='#4C72B0', alpha=0.8, label='Measured BC²')

    # Theory markers
    ax.scatter(x, theoretical, s=100, color='#C44E52', marker='D',
               zorder=5, label='Theoretical')

    ax.set_xlabel('Middleman State |ψ₂⟩')
    ax.set_ylabel('Fidelity (BC²)')
    ax.set_title(title)
    ax.set_xticks(x)
    ax.set_xticklabels(key_labels)
    ax.set_ylim(-0.05, 1.15)
    ax.legend()

    # Pass/fail annotations
    for i, e in enumerate(selected):
        symbol = '✓' if e['pass'] else '✗'
        color = '#2ca02c' if e['pass'] else '#d62728'
        ax.annotate(symbol, (x[i], e['measured_bc'] + ci_hi[i] + 0.05),
                    ha='center', fontsize=16, color=color, fontweight='bold')

    filepath = FIGURES_DIR / 'theorem1_bars.png'
    fig.savefig(filepath)
    plt.close(fig)
    print(f"  📊 Saved: {filepath}")
    return filepath


def plot_theorem2_curve(
    analysis: dict,
    title: str = 'Theorem 2: F = cos⁴(α)'
) -> Path:
    """Fidelity vs α curve with theory line and hardware points."""
    _setup_style()

    experiments = analysis.get('experiments', [])
    alphas_m = np.array([e['alpha'] for e in experiments])
    measured = np.array([e['measured_bc'] for e in experiments])
    ci_lo = np.array([e['ci_lower'] for e in experiments])
    ci_hi = np.array([e['ci_upper'] for e in experiments])

    # Theory curve (smooth)
    alpha_theory = np.linspace(0, np.pi / 2, 200)
    f_theory = np.cos(alpha_theory) ** 4

    fig, ax = plt.subplots(figsize=(8, 5))

    # Theory line
    ax.plot(alpha_theory, f_theory, 'r-', linewidth=2, label='cos⁴(α) theory')

    # Measured points with CI
    ax.errorbar(alphas_m, measured,
                yerr=[measured - ci_lo, ci_hi - measured],
                fmt='o', color='#4C72B0', markersize=6, capsize=4,
                label='Measured BC² (95% CI)')

    # Statevector overlay if available
    sv_fids = [e.get('statevector_fidelity') for e in experiments]
    if any(sv is not None for sv in sv_fids):
        sv_vals = [sv for sv in sv_fids if sv is not None]
        sv_alphas = [e['alpha'] for e, sv in zip(experiments, sv_fids) if sv is not None]
        ax.plot(sv_alphas, sv_vals, 'g^', markersize=5, alpha=0.5, label='Statevector')

    ax.set_xlabel('α (radians)')
    ax.set_ylabel('Fidelity F(star, chain)')
    ax.set_title(title)
    ax.set_xlim(-0.05, np.pi / 2 + 0.05)
    ax.set_ylim(-0.05, 1.1)

    # Key α labels
    ax.set_xticks([0, np.pi / 8, np.pi / 4, 3 * np.pi / 8, np.pi / 2])
    ax.set_xticklabels(['0', 'π/8', 'π/4', '3π/8', 'π/2'])
    ax.legend(loc='upper right')

    filepath = FIGURES_DIR / 'theorem2_curve.png'
    fig.savefig(filepath)
    plt.close(fig)
    print(f"  📊 Saved: {filepath}")
    return filepath


def plot_generalization(all_results: dict, alphas: np.ndarray) -> Path:
    """Multi-panel F(α) plot for all C-U gates."""
    _setup_style()

    # Filter to gate sweeps with fidelity curves
    gates = {k: v for k, v in all_results.items()
             if isinstance(v, dict) and 'fidelity_curve' in v}

    if not gates:
        print("  ⚠ No fidelity curve data to plot")
        return FIGURES_DIR

    n_gates = len(gates)
    cols = min(3, n_gates)
    rows = (n_gates + cols - 1) // cols

    fig, axes = plt.subplots(rows, cols, figsize=(5 * cols, 4 * rows), squeeze=False)

    # CNOT theory curve
    alpha_fine = np.linspace(0, np.pi / 2, 200)
    cos4 = np.cos(alpha_fine) ** 4

    for idx, (name, data) in enumerate(gates.items()):
        r, c = divmod(idx, cols)
        ax = axes[r][c]

        curve = data['fidelity_curve']
        ax.plot(curve['alphas'], curve['fidelities'], 'b-', linewidth=1.5, label=f'C-{name}')
        ax.plot(alpha_fine, cos4, 'r--', alpha=0.4, linewidth=1, label='cos⁴(α)')

        # Mark eigenvector points
        for ec in data.get('eigenvalue_checks', []):
            marker = '★' if ec['is_unity'] else '×'
            color = '#2ca02c' if ec['is_unity'] else '#d62728'
            ax.plot(ec['alpha'], ec['measured_fidelity'], marker='*' if ec['is_unity'] else 'x',
                    color=color, markersize=12, zorder=5)

        ax.set_title(f'C-{name}', fontsize=11)
        ax.set_xlim(-0.05, np.pi / 2 + 0.05)
        ax.set_ylim(-0.05, 1.1)
        ax.set_xlabel('α')
        ax.set_ylabel('F(star, chain)')

        status = '✓' if data.get('theorem_generalized') else '✗'
        ax.text(0.95, 0.95, status, transform=ax.transAxes,
                fontsize=16, ha='right', va='top',
                color='#2ca02c' if data.get('theorem_generalized') else '#d62728',
                fontweight='bold')

    # Hide unused subplots
    for idx in range(n_gates, rows * cols):
        r, c = divmod(idx, cols)
        axes[r][c].set_visible(False)

    fig.suptitle('Theorem Generalization: F(α) for All C-U Gates', fontsize=14, y=1.02)
    fig.tight_layout()

    filepath = FIGURES_DIR / 'generalization_all_gates.png'
    fig.savefig(filepath)
    plt.close(fig)
    print(f"  📊 Saved: {filepath}")
    return filepath


def plot_zne_diagnostic(
    alphas: np.ndarray,
    zne_factors: list[int],
    zne_measurements: dict,  # {alpha: [bc_at_f1, bc_at_f3, bc_at_f5]}
) -> Path:
    """ZNE extrapolation diagnostic: BC² vs noise factor for each α."""
    _setup_style()

    fig, ax = plt.subplots(figsize=(8, 5))
    cmap = plt.cm.viridis(np.linspace(0, 1, len(zne_measurements)))

    for (alpha, values), color in zip(zne_measurements.items(), cmap):
        factors = np.array(zne_factors[:len(values)], dtype=float)
        vals = np.array(values)

        # Plot measured points
        ax.scatter(factors, vals, color=color, s=40, zorder=5)

        # Extrapolation line
        coeffs = np.polyfit(factors, vals, deg=1)
        x_ext = np.array([0] + list(factors))
        ax.plot(x_ext, np.polyval(coeffs, x_ext), '--', color=color, alpha=0.6,
                label=f'α={alpha:.2f}')

        # ZNE point at factor=0
        ax.scatter([0], [np.polyval(coeffs, 0)], color=color, marker='D', s=60,
                   edgecolors='black', linewidth=0.5, zorder=6)

    ax.set_xlabel('Noise Amplification Factor')
    ax.set_ylabel('BC² Fidelity')
    ax.set_title('Zero-Noise Extrapolation Diagnostic')
    ax.axvline(x=0, color='gray', linestyle=':', alpha=0.5)
    ax.legend(fontsize=8, ncol=2)

    filepath = FIGURES_DIR / 'zne_diagnostic.png'
    fig.savefig(filepath)
    plt.close(fig)
    print(f"  📊 Saved: {filepath}")
    return filepath
