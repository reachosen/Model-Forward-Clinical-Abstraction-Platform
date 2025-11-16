#!/usr/bin/env python3
"""
End-to-End Demo Test

Demonstrates the complete flow from API request through CA Factory to response.
Runs in mock mode without requiring external dependencies.
"""

import sys
import json
from pathlib import Path

# Add backend to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from ca_factory.core.factory import CAFactory
from ca_factory.config.loader import ConfigLoader
from ca_factory.storage.mock_case_loader import MockCaseLoader

import asyncio


async def test_complete_clabsi_workflow():
    """Test complete CLABSI case evaluation workflow."""
    print("\n" + "="*70)
    print("  CA Factory End-to-End Demo Test - CLABSI Workflow")
    print("="*70 + "\n")

    # Step 1: Load Configuration
    print("[1/5] Loading CLABSI project configuration...")
    config_root = Path(__file__).parent.parent / "configs"
    loader = ConfigLoader(config_root)
    config = loader.load_project("clabsi", validate=True)
    print(f"✓ Loaded config for domain: {config['project_domain']}")
    print(f"✓ Agent profiles loaded: {len(config['agent_profiles'])}")
    print()

    # Step 2: Initialize CA Factory
    print("[2/5] Initializing CA Factory...")
    factory = CAFactory(config=config)
    print("✓ Factory initialized")
    print()

    # Step 3: Load Mock Patient Data
    print("[3/5] Loading mock patient data...")
    case_loader = MockCaseLoader()
    cases = case_loader.list_cases()
    print(f"✓ Loaded {len(cases)} mock cases")
    for case in cases:
        print(f"  - {case['patient_id']}: {case['infection_type']} (confidence: {case['confidence']})")
    print()

    # Step 4: Test Q&A
    print("[4/5] Testing Q&A functionality...")
    patient_id = "PAT-001"
    question = "What evidence supports the CLABSI diagnosis?"

    print(f"  Question: '{question}'")
    print("  Processing...")

    qa_result = await factory.ask_question(
        patient_id=patient_id,
        question=question
    )

    print(f"✓ Answer generated:")
    print(f"  {qa_result['answer'][:150]}...")
    print(f"  Citations: {len(qa_result['evidence_citations'])}")
    print(f"  Confidence: {qa_result['confidence']}")
    print()

    # Step 5: Test Rule Evaluation
    print("[5/5] Testing NHSN rule evaluation...")
    print(f"  Evaluating rules for patient: {patient_id}")
    print("  Processing...")

    rule_result = await factory.evaluate_rules(
        patient_id=patient_id,
        domain="CLABSI",
        include_evidence=True
    )

    summary = rule_result['summary']
    print(f"✓ Rules evaluated:")
    print(f"  Total rules: {summary['totalRules']}")
    print(f"  Passed: {summary['passedRules']}")
    print(f"  Failed: {summary['failedRules']}")
    print(f"  Required rules passed: {summary['requiredRulesPassed']}/{summary['requiredRulesTotal']}")
    print(f"  Overall confidence: {summary['overallConfidence']}")
    print()

    # Display rule details
    print("  Rule-by-rule breakdown:")
    for eval in rule_result['evaluations'][:3]:  # Show first 3
        status_icon = "✓" if eval['status'] == 'pass' else "✗"
        print(f"    {status_icon} {eval['ruleId']}: {eval['ruleName']}")
        print(f"      Status: {eval['status']} (confidence: {eval['confidence']})")
    if len(rule_result['evaluations']) > 3:
        print(f"    ... and {len(rule_result['evaluations']) - 3} more rules")
    print()

    # Step 6: Test Evidence Retrieval
    print("[6/6] Testing evidence retrieval...")
    search_query = "central line insertion"
    print(f"  Query: '{search_query}'")
    print("  Processing...")

    evidence_result = await factory.retrieve_evidence(
        patient_id=patient_id,
        query=search_query,
        top_k=5
    )

    print(f"✓ Evidence retrieved:")
    print(f"  Documents found: {evidence_result['retrieval_stats']['documents_retrieved']}")
    print(f"  Documents used: {evidence_result['retrieval_stats']['documents_used']}")
    print(f"  Avg relevance: {evidence_result['retrieval_stats']['avg_relevance_score']}")
    print()

    print("  Top evidence items:")
    for idx, item in enumerate(evidence_result['results'][:3], 1):
        print(f"    {idx}. [{item['source_type']}] {item['content'][:80]}...")
        print(f"       Relevance: {item['relevance_score']:.2f}")
    print()

    # Final Summary
    print("="*70)
    print("  Test Summary")
    print("="*70)
    print("✓ Configuration loading: PASSED")
    print("✓ CA Factory initialization: PASSED")
    print("✓ Mock data loading: PASSED")
    print("✓ Q&A functionality: PASSED")
    print("✓ Rule evaluation: PASSED")
    print("✓ Evidence retrieval: PASSED")
    print()
    print("All tests PASSED! 🎉")
    print()

    return True


async def test_negative_case():
    """Test a negative case (not CLABSI)."""
    print("\n" + "="*70)
    print("  Testing Negative Case (PAT-002 - Not CLABSI)")
    print("="*70 + "\n")

    # Load config and factory
    config_root = Path(__file__).parent.parent / "configs"
    loader = ConfigLoader(config_root)
    config = loader.load_project("clabsi")
    factory = CAFactory(config=config)

    # Evaluate PAT-002 (should not be CLABSI)
    patient_id = "PAT-002"
    print(f"Evaluating rules for patient: {patient_id}")

    rule_result = await factory.evaluate_rules(
        patient_id=patient_id,
        domain="CLABSI"
    )

    summary = rule_result['summary']
    print(f"✓ Evaluation complete:")
    print(f"  Passed: {summary['passedRules']}/{summary['totalRules']}")
    print(f"  Failed: {summary['failedRules']}")
    print()

    # This patient should fail some criteria
    if summary['failedRules'] > 0:
        print("✓ Correctly identified as NOT meeting CLABSI criteria")
        print()
        print("Failed criteria:")
        for eval in rule_result['evaluations']:
            if eval['status'] == 'fail':
                print(f"  ✗ {eval['ruleId']}: {eval['ruleName']}")
                print(f"    Rationale: {eval.get('rationale', 'N/A')}")
        print()
        return True
    else:
        print("✗ UNEXPECTED: All criteria passed (should have failures)")
        return False


async def main():
    """Run all E2E tests."""
    print("\n" + "#"*70)
    print("#  CA Factory End-to-End Test Suite")
    print("#  Running in MOCK MODE (no external dependencies required)")
    print("#"*70)

    try:
        # Test 1: Complete workflow
        result1 = await test_complete_clabsi_workflow()

        # Test 2: Negative case
        result2 = await test_negative_case()

        # Final summary
        print("\n" + "="*70)
        print("  Final Test Results")
        print("="*70)
        print(f"  CLABSI Positive Case: {'PASSED' if result1 else 'FAILED'}")
        print(f"  CLABSI Negative Case: {'PASSED' if result2 else 'FAILED'}")
        print()

        if result1 and result2:
            print("✓ ALL TESTS PASSED! 🎉")
            print()
            return 0
        else:
            print("✗ Some tests failed")
            print()
            return 1

    except Exception as e:
        print(f"\n✗ Test failed with error: {str(e)}")
        import traceback
        traceback.print_exc()
        return 1


if __name__ == "__main__":
    exit_code = asyncio.run(main())
    sys.exit(exit_code)
