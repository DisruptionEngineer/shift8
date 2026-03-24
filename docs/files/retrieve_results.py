#!/usr/bin/env python3
"""
Retrieve and analyze completed IBM Quantum jobs.

Usage:
    python retrieve_results.py <job_id>
    python retrieve_results.py --list          # List saved job metadata
    python retrieve_results.py --reanalyze     # Re-analyze the first completed job
"""

import sys
import json
from pathlib import Path

RESULTS_DIR = Path(__file__).parent / 'results'


def list_jobs():
    """List all saved job metadata files."""
    if not RESULTS_DIR.exists():
        print("  No results directory found.")
        return

    files = sorted(RESULTS_DIR.glob('job_*.json'))
    if not files:
        print("  No saved jobs found.")
        return

    print(f"\n  {'File':<40} {'Job ID':<30} {'Status'}")
    print(f"  {'─' * 80}")
    for f in files:
        data = json.loads(f.read_text())
        print(f"  {f.name:<40} {data.get('job_id', 'N/A'):<30} {data.get('status', '?')}")


def retrieve_and_analyze(job_id: str):
    """Retrieve job results and run analysis."""
    from nativ3.hardware import retrieve_job, extract_counts, get_service

    service = get_service()
    job = retrieve_job(job_id, service)

    status = str(job.status())
    print(f"  Status: {status}")

    if 'DONE' not in status:
        print(f"  Job not yet complete. Check back later.")
        return

    result = job.result()

    # Print raw counts for each circuit
    n_results = len(result)
    print(f"\n  {n_results} circuit results:")
    for i in range(n_results):
        counts = result[i].data.c.get_counts()
        total = sum(counts.values())
        top3 = sorted(counts.items(), key=lambda x: -x[1])[:3]
        top_str = ', '.join(f'{k}:{v}' for k, v in top3)
        print(f"    [{i:3d}] {total:6d} shots | top: {top_str}")


def main():
    args = sys.argv[1:]

    if '--list' in args:
        list_jobs()
    elif len(args) >= 1 and not args[0].startswith('--'):
        retrieve_and_analyze(args[0])
    else:
        print("Usage:")
        print("  python retrieve_results.py <job_id>")
        print("  python retrieve_results.py --list")


if __name__ == '__main__':
    main()
