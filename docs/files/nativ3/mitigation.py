"""
Error mitigation configuration for IBM Quantum hardware.
T-REx (measurement twirling), gate twirling, dynamical decoupling, ZNE.
"""

from qiskit import QuantumCircuit
from qiskit.transpiler.preset_passmanagers import generate_preset_pass_manager
import numpy as np
from typing import Optional


def get_sampler_options() -> dict:
    """Return SamplerV2 options dict with all available mitigations enabled.

    These are passed to SamplerV2(options=...) via EstimatorOptions/SamplerOptions.
    The qiskit-ibm-runtime SamplerV2 accepts these as keyword arguments or via
    the options object.
    """
    return {
        'dynamical_decoupling': {
            'enable': True,
            'sequence_type': 'XpXm',
        },
        'twirling': {
            'enable_gates': True,
            'enable_measure': True,  # T-REx
            'num_randomizations': 32,
            'shots_per_randomization': 256,  # 32 × 256 = 8192 effective shots
        },
    }


def amplify_noise(circuit: QuantumCircuit, factor: int) -> QuantumCircuit:
    """Gate-fold a circuit to amplify noise by the given odd factor.

    For factor=1: returns circuit unchanged.
    For factor=3: each CX gate becomes CX·CX†·CX (triple gate time).
    For factor=5: CX·CX†·CX·CX†·CX.

    Only folds 2-qubit gates (the dominant noise source).
    """
    if factor == 1:
        return circuit.copy()
    if factor % 2 == 0:
        raise ValueError("ZNE noise factor must be odd (1, 3, 5, ...)")

    folded = QuantumCircuit(circuit.num_qubits, circuit.num_clbits)
    n_folds = (factor - 1) // 2

    for instruction in circuit.data:
        gate = instruction.operation
        qubits = instruction.qubits
        clbits = instruction.clbits

        folded.append(gate, qubits, clbits)

        # Only fold multi-qubit gates (CX, ECR, etc.)
        if gate.num_qubits >= 2 and gate.name != 'barrier' and gate.name != 'measure':
            for _ in range(n_folds):
                folded.append(gate.inverse(), qubits)
                folded.append(gate, qubits)

    return folded


def zne_extrapolate(
    noise_factors: list[int],
    measurements: list[float]
) -> float:
    """Richardson extrapolation to zero noise.

    Linear fit of measurement vs noise_factor, extrapolated to factor=0.
    """
    factors = np.array(noise_factors, dtype=float)
    values = np.array(measurements, dtype=float)

    # Linear fit: y = a*x + b, extrapolate to x=0
    coeffs = np.polyfit(factors, values, deg=1)
    return float(np.polyval(coeffs, 0))


def zne_extrapolate_with_uncertainty(
    noise_factors: list[int],
    measurements: list[float],
    ci_lowers: list[float],
    ci_uppers: list[float]
) -> tuple[float, float, float]:
    """ZNE with propagated uncertainty bounds.

    Returns (extrapolated_value, lower_bound, upper_bound).
    """
    value = zne_extrapolate(noise_factors, measurements)

    # Propagate CIs through the extrapolation
    lower = zne_extrapolate(noise_factors, ci_lowers)
    upper = zne_extrapolate(noise_factors, ci_uppers)

    return value, min(lower, upper), max(lower, upper)


ZNE_FACTORS = [1, 3, 5]
