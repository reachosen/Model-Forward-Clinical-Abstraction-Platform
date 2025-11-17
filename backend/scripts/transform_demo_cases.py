"""Transform demo case files to structured 4-section format

This script transforms PAT-001 and PAT-002 from flat to structured format.
"""

import json
import sys
from pathlib import Path

# Add backend to path
backend_path = Path(__file__).parent.parent
sys.path.insert(0, str(backend_path))

from ca_factory.adapters import CaseAdapter


def transform_case_file(input_path: Path, output_path: Path, backup: bool = True):
    """
    Transform a single case file from flat to structured format.

    Args:
        input_path: Path to input JSON file (flat format)
        output_path: Path to output JSON file (structured format)
        backup: If True, create backup of original file
    """
    print(f"\n{'='*60}")
    print(f"Transforming: {input_path.name}")
    print(f"{'='*60}")

    # Read legacy case
    with open(input_path, 'r') as f:
        legacy_case = json.load(f)

    print(f"✓ Loaded legacy case: {legacy_case.get('case_metadata', {}).get('case_id')}")

    # Transform to structured format
    structured_case = CaseAdapter.to_new_structure(legacy_case)

    print(f"✓ Transformed to structured format:")
    print(f"  - case_id: {structured_case['case_id']}")
    print(f"  - concern_id: {structured_case['concern_id']}")
    print(f"  - patient section: {len(structured_case['patient'])} keys")
    print(f"  - enrichment.signal_groups: {len(structured_case['enrichment']['signal_groups'])} groups")
    print(f"  - abstraction.narrative: {len(structured_case['abstraction']['narrative'])} chars")

    # Backup original if requested
    if backup and output_path.exists():
        backup_path = output_path.with_suffix('.json.backup')
        print(f"✓ Creating backup: {backup_path.name}")
        with open(backup_path, 'w') as f:
            json.dump(legacy_case, f, indent=2)

    # Write structured case
    with open(output_path, 'w') as f:
        json.dump(structured_case, f, indent=2)

    print(f"✓ Saved structured case to: {output_path.name}")

    return structured_case


def main():
    """Transform PAT-001 and PAT-002 case files."""

    # Define paths
    data_dir = Path(__file__).parent.parent / "data" / "mock" / "cases"

    cases_to_transform = [
        ("PAT-001-clabsi-positive.json", "PAT-001-clabsi-positive.json"),
        ("PAT-002-clabsi-negative.json", "PAT-002-clabsi-negative.json")
    ]

    print("\n" + "="*60)
    print("DEMO CASE TRANSFORMATION SCRIPT")
    print("="*60)
    print(f"Data directory: {data_dir}")
    print(f"Cases to transform: {len(cases_to_transform)}")

    results = []

    for input_filename, output_filename in cases_to_transform:
        input_path = data_dir / input_filename
        output_path = data_dir / output_filename

        if not input_path.exists():
            print(f"\n✗ ERROR: Input file not found: {input_path}")
            continue

        try:
            structured_case = transform_case_file(input_path, output_path, backup=True)
            results.append({
                "filename": output_filename,
                "case_id": structured_case["case_id"],
                "success": True
            })
        except Exception as e:
            print(f"\n✗ ERROR transforming {input_filename}: {str(e)}")
            results.append({
                "filename": output_filename,
                "case_id": None,
                "success": False,
                "error": str(e)
            })

    # Summary
    print("\n" + "="*60)
    print("TRANSFORMATION SUMMARY")
    print("="*60)

    successful = sum(1 for r in results if r["success"])
    failed = len(results) - successful

    print(f"\nTotal cases: {len(results)}")
    print(f"✓ Successful: {successful}")
    print(f"✗ Failed: {failed}")

    if successful > 0:
        print(f"\n✓ Demo case files have been transformed to structured format!")
        print(f"✓ Backup files created with .json.backup extension")
        print(f"\nTo test with the new format:")
        print(f"  1. Set environment variable: USE_STRUCTURED_CASES=false (adapter will auto-transform)")
        print(f"  2. Or update endpoints to read structured format directly")

    return 0 if failed == 0 else 1


if __name__ == "__main__":
    sys.exit(main())
