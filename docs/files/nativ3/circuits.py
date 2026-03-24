"""
Circuit builders for star and chain topologies.
Supports CNOT and arbitrary controlled-unitary gates.
"""

from qiskit import QuantumCircuit
from qiskit.circuit.library import UnitaryGate
import numpy as np
from typing import Optional


# ── Standard gate matrices ─────────────────────────────────────────────

X = np.array([[0, 1], [1, 0]])
Y = np.array([[0, -1j], [1j, 0]])
Z = np.array([[1, 0], [0, -1]])
H = (1 / np.sqrt(2)) * np.array([[1, 1], [1, -1]])
T_GATE = np.diag([1, np.exp(1j * np.pi / 4)])
SQRT_X = np.array([[0.5 + 0.5j, 0.5 - 0.5j],
                    [0.5 - 0.5j, 0.5 + 0.5j]])


def ry_matrix(theta: float) -> np.ndarray:
    """Rotation about Y axis by angle theta."""
    return np.array([
        [np.cos(theta / 2), -np.sin(theta / 2)],
        [np.sin(theta / 2),  np.cos(theta / 2)]
    ])


# ── Gate catalog for generalization experiments ─────────────────────────

GATE_CATALOG: dict[str, np.ndarray] = {
    'X':        X,
    'Z':        Z,
    'Y':        Y,
    'H':        H,
    'Ry(π/4)':  ry_matrix(np.pi / 4),
    'Ry(π/2)':  ry_matrix(np.pi / 2),
    'Ry(π)':    ry_matrix(np.pi),
    'Ry(0.7)':  ry_matrix(0.7),
    'Sqrt(X)':  SQRT_X,
    'T':        T_GATE,
}


# ── Circuit builders ───────────────────────────────────────────────────

def _init_middleman(qc: QuantumCircuit, alpha: float) -> None:
    """Initialize qubit 1 (middleman) to cos(α)|0⟩ + sin(α)|1⟩."""
    if abs(alpha) > 1e-10:
        qc.ry(2 * alpha, 1)  # Ry(2α)|0⟩ = cos(α)|0⟩ + sin(α)|1⟩


def build_star_cx(alpha: float) -> QuantumCircuit:
    """Star topology with CNOT: CX(0→1), CX(0→2)."""
    qc = QuantumCircuit(3, 3)
    _init_middleman(qc, alpha)
    qc.h(0)
    qc.cx(0, 1)
    qc.cx(0, 2)
    qc.measure([0, 1, 2], [0, 1, 2])
    return qc


def build_chain_cx(alpha: float) -> QuantumCircuit:
    """Chain topology with CNOT: CX(0→1), CX(1→2)."""
    qc = QuantumCircuit(3, 3)
    _init_middleman(qc, alpha)
    qc.h(0)
    qc.cx(0, 1)
    qc.cx(1, 2)
    qc.measure([0, 1, 2], [0, 1, 2])
    return qc


def build_star_cu(alpha: float, unitary: np.ndarray, label: str = 'U') -> QuantumCircuit:
    """Star topology with arbitrary controlled-U: CU(0→1), CU(0→2)."""
    qc = QuantumCircuit(3, 3)
    _init_middleman(qc, alpha)
    qc.h(0)
    gate = UnitaryGate(unitary, label=label).control(1)
    qc.append(gate, [0, 1])
    qc.append(gate, [0, 2])
    qc.measure([0, 1, 2], [0, 1, 2])
    return qc


def build_chain_cu(alpha: float, unitary: np.ndarray, label: str = 'U') -> QuantumCircuit:
    """Chain topology with arbitrary controlled-U: CU(0→1), CU(1→2)."""
    qc = QuantumCircuit(3, 3)
    _init_middleman(qc, alpha)
    qc.h(0)
    gate = UnitaryGate(unitary, label=label).control(1)
    qc.append(gate, [0, 1])
    qc.append(gate, [1, 2])
    qc.measure([0, 1, 2], [0, 1, 2])
    return qc


def build_pair(alpha: float, unitary: Optional[np.ndarray] = None,
               label: str = 'CX') -> tuple[QuantumCircuit, QuantumCircuit]:
    """Build (star, chain) pair. Uses native CX if unitary is None."""
    if unitary is None:
        return build_star_cx(alpha), build_chain_cx(alpha)
    return build_star_cu(alpha, unitary, label), build_chain_cu(alpha, unitary, label)


def build_alpha_sweep(
    alphas: np.ndarray,
    unitary: Optional[np.ndarray] = None,
    label: str = 'CX'
) -> list[QuantumCircuit]:
    """Build interleaved [star₀, chain₀, star₁, chain₁, ...] for all alphas."""
    circuits = []
    for alpha in alphas:
        star, chain = build_pair(float(alpha), unitary, label)
        circuits.extend([star, chain])
    return circuits


def get_eigeninfo(unitary: np.ndarray) -> list[dict]:
    """Compute eigenvalues and eigenvectors of a 2x2 unitary.

    Returns list of dicts with 'value', 'vector', 'alpha' (angle from |0⟩).
    """
    eigenvalues, eigenvectors = np.linalg.eig(unitary)
    results = []
    for i in range(len(eigenvalues)):
        vec = eigenvectors[:, i]
        # Normalize phase so first nonzero component is real-positive
        phase = np.exp(-1j * np.angle(vec[0])) if abs(vec[0]) > 1e-10 else np.exp(-1j * np.angle(vec[1]))
        vec = vec * phase
        # alpha = angle from |0⟩: cos(α) = |⟨0|v⟩|
        alpha = np.arccos(np.clip(abs(vec[0]), 0, 1))
        results.append({
            'value': eigenvalues[i],
            'vector': vec,
            'alpha': float(alpha),
        })
    return results
