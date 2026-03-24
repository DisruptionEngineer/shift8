"""
IBM Quantum hardware interface.
Job submission, retrieval, qubit selection, transpilation.
"""

from qiskit import QuantumCircuit
from qiskit.transpiler.preset_passmanagers import generate_preset_pass_manager
from qiskit_ibm_runtime import QiskitRuntimeService, SamplerV2, Batch
import json
import os
from datetime import datetime
from pathlib import Path
from typing import Optional

RESULTS_DIR = Path(__file__).parent.parent / 'results'


def get_service() -> QiskitRuntimeService:
    """Connect to IBM Quantum Runtime."""
    return QiskitRuntimeService()


def get_backend(service: QiskitRuntimeService, name: str = 'ibm_torino'):
    """Get a specific backend."""
    return service.backend(name)


def select_best_qubits(backend, n_qubits: int = 3) -> Optional[list[int]]:
    """Find the best-connected qubit triad for star+chain experiments.

    Needs qubits where q0-q1, q0-q2, AND q1-q2 are all connected
    (supports both star and chain topologies).

    Returns list of qubit indices sorted by combined error rate,
    or None if calibration data unavailable.
    """
    try:
        # Get coupling map edges
        coupling_map = backend.coupling_map
        edges = set()
        for edge in coupling_map.get_edges():
            edges.add((min(edge), max(edge)))

        # Find all triads where all pairs are connected
        qubits = list(range(backend.num_qubits))
        triads = []
        for i in range(len(qubits)):
            for j in range(i + 1, len(qubits)):
                for k in range(j + 1, len(qubits)):
                    q = (qubits[i], qubits[j], qubits[k])
                    pairs = [(min(q[a], q[b]), max(q[a], q[b]))
                             for a, b in [(0, 1), (0, 2), (1, 2)]]
                    if all(p in edges for p in pairs):
                        triads.append(q)

        if not triads:
            print("  ⚠ No fully-connected triads found, using default mapping")
            return None

        # For now, return the first triad found (lowest qubit indices)
        # TODO: rank by calibration error rates when properties API is available
        best = triads[0]
        print(f"  Selected qubits: {best} (from {len(triads)} candidates)")
        return list(best)

    except Exception as e:
        print(f"  ⚠ Qubit selection failed: {e}, using default mapping")
        return None


def transpile_circuits(
    circuits: list[QuantumCircuit],
    backend,
    initial_layout: Optional[list[int]] = None,
    optimization_level: int = 1
) -> list[QuantumCircuit]:
    """Transpile circuits for target backend."""
    pm = generate_preset_pass_manager(
        optimization_level=optimization_level,
        backend=backend,
        initial_layout=initial_layout,
    )
    return pm.run(circuits)


def submit_job(
    circuits: list[QuantumCircuit],
    backend,
    shots: int = 8192,
    description: str = '',
) -> str:
    """Submit circuits to hardware and return job ID.

    Uses SamplerV2 with built-in error mitigation options.
    """
    from nativ3.mitigation import get_sampler_options

    print(f"\n  Submitting {len(circuits)} circuits to {backend.name} ({shots} shots)")

    sampler = SamplerV2(mode=backend)

    # Configure options
    options = get_sampler_options()
    sampler.options.update(**options)

    job = sampler.run(circuits, shots=shots)
    job_id = job.job_id()
    print(f"  Job ID: {job_id}")

    # Save metadata
    save_job_metadata(job_id, backend.name, len(circuits), shots, description)
    return job_id


def save_job_metadata(
    job_id: str,
    backend_name: str,
    n_circuits: int,
    shots: int,
    description: str = ''
) -> Path:
    """Save job metadata to results/ directory."""
    RESULTS_DIR.mkdir(exist_ok=True)
    ts = datetime.now().strftime('%Y%m%d_%H%M%S')
    filepath = RESULTS_DIR / f'job_{ts}_{job_id[:12]}.json'
    metadata = {
        'job_id': job_id,
        'backend': backend_name,
        'timestamp': datetime.now().isoformat(),
        'n_circuits': n_circuits,
        'shots': shots,
        'description': description,
        'status': 'submitted',
    }
    filepath.write_text(json.dumps(metadata, indent=2))
    print(f"  Metadata saved: {filepath.name}")
    return filepath


def retrieve_job(job_id: str, service: Optional[QiskitRuntimeService] = None):
    """Retrieve a completed job by ID."""
    if service is None:
        service = get_service()
    job = service.job(job_id)
    print(f"  Job {job_id}: {job.status()}")
    return job


def extract_counts(result, n_circuits: int) -> list[dict]:
    """Extract counts dicts from a SamplerV2 result."""
    all_counts = []
    for i in range(n_circuits):
        counts = result[i].data.c.get_counts()
        all_counts.append(counts)
    return all_counts
