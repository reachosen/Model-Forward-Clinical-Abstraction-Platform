
import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process'; // Import added
import { SAFEv0BatchReport } from '../types/safety';
import { LearningQueueItem, LearningPatch } from '../models/LearningQueue';
import { proposeLearningPatch } from '../PlanningFactory/planner/learningAgent';

// Paths
const DRAFTS_DIR = path.join(__dirname, '../learning_drafts');

/**
 * Ensure learning drafts directory exists
 */
function ensureDraftsDirectory(): void {
  if (!fs.existsSync(DRAFTS_DIR)) {
    fs.mkdirSync(DRAFTS_DIR, { recursive: true });
  }
}

/**
 * Save a learning patch to drafts directory
 */
function savePatchToDrafts(patch: LearningPatch): string {
  ensureDraftsDirectory();
  const filename = `${patch.source_queue_item_id}.json`;
  const filepath = path.join(DRAFTS_DIR, filename);

  fs.writeFileSync(filepath, JSON.stringify(patch, null, 2), 'utf-8');
  return filepath;
}

async function main() {
    const reportPath = process.argv[2];
    if (!reportPath || !fs.existsSync(reportPath)) {
        console.error("Usage: ts-node auto-heal.ts <path-to-validation-report.json>");
        process.exit(1);
    }

    console.log(`🚑 Auto-Heal: Analyzing report ${reportPath}...`);
    
    let report: SAFEv0BatchReport;
    try {
        report = JSON.parse(fs.readFileSync(reportPath, 'utf-8'));
    } catch (e) {
        console.error("Failed to parse report JSON:", e);
        process.exit(1);
    }

    const { failure_analysis, concern_id, by_archetype } = report;
    
    // Identify primary archetype from the report stats
    // (Sort by count descending)
    const primaryArchetype = Object.entries(by_archetype)
        .sort((a, b) => b[1].count - a[1].count)[0]?.[0] || 'Unknown';

    const domain = 'Orthopedics'; // TODO: Infer this from concern or path?

    const issues: string[] = [];
    
    // 1. CR Misses (Missing Signals)
    if (failure_analysis.common_CR_misses.length > 0) {
        const topMisses = failure_analysis.common_CR_misses.slice(0, 3);
        const missText = topMisses.map(m => `'${m.signal}'`).join(', ');
        issues.push(`CRITICAL: The Clinical Reviewer consistently missed these signals: ${missText}.`);
    }

    // 2. AC Misses (Missing Phrases/Logic)
    if (failure_analysis.common_AC_misses.length > 0) {
        const topMisses = failure_analysis.common_AC_misses.slice(0, 3);
        const missText = topMisses.map(m => `'${m.phrase}'`).join(', ');
        issues.push(`CRITICAL: The Automated Check found these concepts missing from the output: ${missText}.`);
    }

    // 3. AH Violations (Hallucinations)
    if (failure_analysis.common_AH_violations.length > 0) {
        const topViolations = failure_analysis.common_AH_violations.slice(0, 3);
        const violText = topViolations.map(v => `'${v.term}'`).join(', ');
        issues.push(`CRITICAL: The model hallucinated these forbidden terms: ${violText}.`);
    }

    if (issues.length === 0) {
        console.log("✅ No significant patterns found to heal.");
        return;
    }

    // Synthesize a "Reviewer Comment"
    const feedback = issues.join('\n\n');
    console.log(`\nFound Issues:\n${feedback}\n`);

    // Create Learning Queue Item
    const item: LearningQueueItem = {
        id: `auto_heal_${Date.now()}`,
        created_at: new Date().toISOString(),
        input: {} as any, // Not needed for this flow
        output: {} as any, // Not needed for this flow
        domain_type: 'USNWR', // Assumption for now
        archetype: primaryArchetype,
        domain: domain,
        review_target: concern_id,
        reviewer_comment: feedback,
        reviewer_name: 'Auto-Heal Bot',
        status: 'pending'
    };

    // Call Learning Agent
    console.log("🤖 Consulting Learning Agent...");
    try {
        const patch = await proposeLearningPatch(item, false); // useMock = false (Real LLM)
        const savedPath = savePatchToDrafts(patch);
        console.log(`✅ Patch generated and saved to: ${savedPath}`);
        console.log(`   Summary: ${patch.explanation_summary}`);
        console.log(`   Confidence: ${patch.confidence}`);

        // AUTO-APPLY
        console.log(`🚀 Auto-Applying Patch...`);
        try {
            const applyTool = path.join(__dirname, 'apply-patch.ts');
            execSync(`npx ts-node "${applyTool}" "${savedPath}"`, { stdio: 'inherit' });
        } catch (applyErr) {
            console.error("❌ Failed to auto-apply patch:", applyErr);
        }

    } catch (e) {
        console.error("❌ Failed to generate patch:", e);
    }
}

main();
