import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';
import OpenAI from 'openai';
import { SemanticPacketLoader } from '../utils/semanticPacketLoader';
import { getPromptText } from '../PlanningFactory/utils/promptBuilder';
import { getSignalEnrichmentVariables } from '../shared/context_builders/signalEnrichment';
import { getEventSummaryVariables } from '../shared/context_builders/eventSummary';
import { getClinicalReviewPlanVariables } from '../shared/context_builders/clinicalReviewPlan';
import { getFollowupQuestionsVariables } from '../shared/context_builders/followupQuestions'; 
import { getExclusionCheckVariables } from '../shared/context_builders/exclusionCheck';

// Load Env
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

// Types
interface ToySignal {
    signal_id: string;
    name?: string;
    description?: string;
    provenance: string;
    tags?: string[];
}

interface ToyOutput {
    summary: string;
    signals: ToySignal[];
    reviewer?: {
        overall_call: string;
        metric_alignment: string;
    };
    display_fields?: Array<{
        order: number;
        label: string;
        value: string;
    }>;
    followup_questions?: string[];
    exclusion_check?: {
        overall_status: string;
        exclusions_evaluated: any[];
    };
}

// 1. Load Registry & Build Prompt
function buildContext(concernId: string, task: string = 'signal_enrichment', extraContext: any = {}) {
    console.log(`\n📚 Loading Registry for ${concernId} (Task: ${task})...`);
    const loader = SemanticPacketLoader.getInstance();
    loader.clearCache();
    const packet = loader.load('Orthopedics', concernId); // Hardcoded domain for I32a
    
    if (!packet) throw new Error(`Packet not found for ${concernId}`);

    const context = {
        concern_id: concernId,
        domain: 'Orthopedics',
        primary_archetype: packet.metrics[concernId]?.primary_archetype || 'Preventability_Detective',
        archetypes: packet.metrics[concernId]?.archetypes || ['Preventability_Detective'],
        ortho_context: packet,
        semantic_context: { packet, ranking: { specialty_name: 'Orthopedics' } },
        ...extraContext
    };

    // Ensure variable builder runs to populate context
    if (task === 'event_summary') {
        getEventSummaryVariables(context);
    } else if (task === 'clinical_review_helper') {
        // Handled by promptBuilder logic
    } else if (task === 'clinical_review_plan') {
        getClinicalReviewPlanVariables(context);
    } else if (task === 'followup_questions') {
        getFollowupQuestionsVariables(context);
    } else if (task === 'exclusion_check') {
        getExclusionCheckVariables(context);
    } else {
        getSignalEnrichmentVariables(context);
    }

    const prompt = getPromptText(task, context);
    return { prompt, packet };
}

// 2. Run Model (Mock/Live)
async function runModel(prompt: string, payload: string, mode: 'mock' | 'live', task: string): Promise<ToyOutput> {
    console.log(`\n🤖 Running Model (${mode.toUpperCase()})...`);
    
    if (mode === 'mock') {
        return { summary: "Mock Summary", signals: [] };
    }

    // Live Mode
    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const isJson = task !== 'clinical_review_helper';
    
    const completion = await client.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
            { role: 'system', content: prompt },
            { role: 'user', content: payload }
        ],
        response_format: isJson ? { type: 'json_object' } : undefined,
        temperature: 0
    });

    const content = completion.choices[0].message.content || '{}';
    
    if (!isJson) {
        return { summary: content, signals: [] }; 
    }

    const parsed = JSON.parse(content);

    // Adapter Logic (Minimal)
    const signals: ToySignal[] = [];
    if (parsed.signal_groups) {
        parsed.signal_groups.forEach((g: any) => {
            if (g.signals) {
                g.signals.forEach((s: any) => signals.push(s));
            }
        });
    }

    return {
        summary: parsed.summary || parsed.event_summary || "",
        signals: signals,
        reviewer: parsed.clinical_reviewer,
        display_fields: parsed.display_fields,
        followup_questions: parsed.followup_questions,
        exclusion_check: parsed.exclusion_check
    };
}

// 3. Parser & Scorer
function scoreResult(output: ToyOutput, testCase: any) {
    console.log(`\n⚖️  Scoring...`);

    // New Contract-Driven Scoring
    if (testCase.contract) {
        const contract = testCase.contract;
        console.log(`   [Contract] Intents: ${contract.intents.join(', ')}`);
        
        let crFail = 0;
        let ahFail = 0;
        
        if (contract.expected_signals) {
            const foundSignals = output.signals;
            const normalize = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');

            for (const expected of contract.expected_signals) {
                // CR: Concept Match
                const match = foundSignals.find(s => 
                    normalize(s.signal_id || s.name || "").includes(normalize(expected.signal_id))
                );
                
                if (!match) {
                    console.log(`   ❌ [CR] Missed Concept: ${expected.signal_id}`);
                    crFail++;
                    continue;
                }
                console.log(`   ✅ [CR] Found Concept: ${expected.signal_id}`);

                // AH: Provenance Match
                if (expected.required_provenance) {
                    const provMatch = expected.required_provenance.some((p: string) => 
                        match.provenance.toLowerCase().includes(p.toLowerCase())
                    );
                    if (!provMatch) {
                        console.log(`   ❌ [AH] Provenance Mismatch. Expected one of: ${JSON.stringify(expected.required_provenance)}`);
                        console.log(`          Got: "${match.provenance}"`);
                        ahFail++;
                    } else {
                        console.log(`   ✅ [AH] Provenance Verified.`);
                    }
                }
            }
        }
        
        return { 
            pass: crFail === 0 && ahFail === 0,
            missingSignals: crFail > 0 ? [`${crFail} concepts`] : [],
            missingPhrases: [],
            provenanceCheck: ahFail === 0
        };
    }

    // Legacy Scoring
    const expectations = testCase.expectations || {};
    
    // Follow-up Questions Check
    if (expectations.followup_questions) {
        const questions = output.followup_questions || [];
        console.log(`   [Questions] Found: ${questions.length}`);
        
        // Refined Blocklist (Option 1)
        const defaults = ["hospital policy", "standard of care", "guideline", "protocol", "best practice", "what should we do"];
        const forbidden = [...defaults, ...(expectations.followup_questions.forbidden_terms || [])];
        
        const violations = questions.filter(q => forbidden.some(f => q.toLowerCase().includes(f)));

        const requiredPhrases = expectations.followup_questions.must_contain_phrases || [];
        const missingPhrases = requiredPhrases.filter((p: string) => 
            !questions.some(q => q.toLowerCase().includes(p.toLowerCase()))
        );

        if (missingPhrases.length > 0) {
             console.log(`   [Questions] Missed Phrases: ${JSON.stringify(missingPhrases)}`);
        }

        if (questions.length < 5 || questions.length > 10 || violations.length > 0 || missingPhrases.length > 0) {
            console.log(`   [Questions] FAIL: Count ${questions.length}, Violations: ${JSON.stringify(violations)}`);
            return { pass: false, missingSignals: [], missingPhrases: missingPhrases, provenanceCheck: true };
        }
        console.log(`   [Questions] Pass (No forbidden terms, correct count, all phrases found).`);
        return { pass: true, missingSignals: [], missingPhrases: [], provenanceCheck: true };
    }

    // Reviewer Check
    if (expectations.clinical_reviewer) {
        const expectedCall = expectations.clinical_reviewer.overall_call;
        const actualCall = output.reviewer?.overall_call;
        console.log(`   [Review] Expected: ${expectedCall} | Actual: ${actualCall}`);
        
        if (expectedCall && expectedCall !== actualCall) {
            console.log(`   [Review] Mismatch!`);
            return { pass: false, missingSignals: [], missingPhrases: [], provenanceCheck: true };
        }
        return { pass: true, missingSignals: [], missingPhrases: [], provenanceCheck: true };
    }

    // 20/80 Display Fields Check
    if (expectations.display_fields) {
        const actualFields = output.display_fields || [];
        console.log(`   [20/80] Fields Found: ${actualFields.length}/8`);
        
        const missingLabels = expectations.display_fields.labels.filter((l: string) => 
            !actualFields.some(f => f.label.toLowerCase().includes(l.toLowerCase()))
        );

        if (actualFields.length !== 8 || missingLabels.length > 0) {
            console.log(`   [20/80] FAIL: ${actualFields.length} fields, Missing Labels: ${JSON.stringify(missingLabels)}`);
            return { pass: false, missingSignals: [], missingPhrases: [], provenanceCheck: true };
        }
        console.log(`   [20/80] All 8 labels matched.`);
        return { pass: true, missingSignals: [], missingPhrases: [], provenanceCheck: true };
    }

    // Signal Recall (CR) - Concept ID Check
    const expectedSignals = expectations.signal_generation?.must_find_signals || [];
    const foundSignals = output.signals.map(s => s.name || s.signal_id);
    const foundProvenance = output.signals.map(s => s.provenance.toLowerCase());
    
    // console.log(`   [CR] Expected: ${JSON.stringify(expectedSignals)}`); // Noise

    const normalize = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');

    const missingSignals = [];
    let remainingFound = [...foundSignals];
    
    for (const expected of expectedSignals) {
        const normExpected = normalize(expected);
        const matchIndex = remainingFound.findIndex(f => normalize(f).includes(normExpected));
        if (matchIndex > -1) {
            remainingFound.splice(matchIndex, 1);
        } else {
            missingSignals.push(expected);
        }
    }

    // Provenance Check (AH)
    const expectedProvenance = expectations.provenance_checks || [];
    const missingProvenance = expectedProvenance.filter((p: string) => 
        !foundProvenance.some(fp => fp.includes(p.toLowerCase()))
    );

    // Summary Content (AC) - Text Match
    const expectedPhrases = expectations.event_summary?.must_contain_phrases || [];
    const summaryText = output.summary.toLowerCase();
    
    const missingPhrases = expectedPhrases.filter((p: string) => !summaryText.includes(p.toLowerCase()));
    
    if (missingPhrases.length > 0) {
        console.log(`   [DEBUG] Missing Phrases: ${JSON.stringify(missingPhrases)}`);
    }

    // Provenance Check (AH - Implicit)
    const provenanceCheck = output.signals.every(s => s.provenance && s.provenance.length > 0);

    return {
        pass: missingSignals.length === 0 && missingProvenance.length === 0 && missingPhrases.length === 0 && provenanceCheck,
        missingSignals,
        missingProvenance,
        missingPhrases,
        provenanceCheck
    };
}

// Main
async function main() {
    const args = process.argv.slice(2);
    const fileArgIdx = args.indexOf('--file');
    const fileArg = fileArgIdx > -1 ? args[fileArgIdx + 1] : null;
    
    const taskArgIdx = args.indexOf('--task');
    const task = taskArgIdx > -1 ? args[taskArgIdx + 1] : 'signal_enrichment';

    const queryArgIdx = args.indexOf('--query');
    const userQuery = queryArgIdx > -1 ? args[queryArgIdx + 1] : null;
    
    const isLive = args.includes('--live');

    let testCases = [];

    if (fileArg) {
        const fullPath = path.isAbsolute(fileArg) ? fileArg : path.join(process.cwd(), fileArg);
        if (!fs.existsSync(fullPath)) {
             const relPath = path.join(__dirname, '../domains_registry/USNWR/Orthopedics/metrics/I32a/tests/testcases/', fileArg);
             if (fs.existsSync(relPath)) {
                 const content = JSON.parse(fs.readFileSync(relPath, 'utf-8'));
                 testCases = content.test_cases;
             } else {
                 console.error(`❌ Test file not found: ${fileArg}`);
                 process.exit(1);
             }
        } else {
            const content = JSON.parse(fs.readFileSync(fullPath, 'utf-8'));
            testCases = content.test_cases;
        }
    } else {
        console.log('Using default single_fail_test.json (Use --file to override)');
        const casePath = path.join(__dirname, '../domains_registry/USNWR/Orthopedics/metrics/I32a/tests/testcases/single_fail_test.json');
        testCases = JSON.parse(fs.readFileSync(casePath, 'utf-8')).test_cases;
    }

    // 1. Build Context (Once)
    // Mock Context for Helper & Follow-up
    const extraContext: any = {};
    if (task === 'clinical_review_helper') {
        extraContext.eventSummary = "Patient readmitted on POD 10 for deep SSI.";
        extraContext.keySignals = [
            { description: "Purulent drainage", evidence_type: "extracted" },
            { description: "Positive culture Staph Aureus", evidence_type: "extracted" }
        ];
        if (userQuery) extraContext.userQuery = userQuery;
    } else if (task === 'followup_questions') {
        // Inject signals for the Signal-Driven test
        extraContext.keySignals = [
            { description: "Fever 102", evidence_type: "extracted" }
        ];
    }

    const { prompt } = buildContext('I32a', task, extraContext);
    
    // Print Prompt Artifacts (Once)
    console.log(`\n📜 Prompt Snippet:`);
    const targetStart = prompt.indexOf('TARGET SIGNAL GROUPS');
    if (targetStart > -1) {
        console.log(prompt.substring(targetStart, targetStart + 1000) + "...");
    } else {
        const contextStart = prompt.indexOf('**Context:**');
        if (contextStart > -1) {
             console.log(prompt.substring(contextStart, contextStart + 1000) + "...");
        } else {
             // Helper prompt
             console.log(prompt.substring(0, 1000) + "...");
        }
    }
    
    console.log(`\n🚀 Starting Test Run: ${testCases.length} cases`);
    const mode = isLive ? 'live' : 'mock';
    let failures = 0;

    for (let i = 0; i < testCases.length; i++) {
        const testCase = testCases[i];
        console.log(`\n---------------------------------------------------
`);
        console.log(`CASE ${i+1}: ${testCase.description || testCase.test_id}`);
        console.log(`Payload: "${testCase.patient_payload}"`);
        
        const output = await runModel(prompt, testCase.patient_payload, mode, task);

        console.log(`\n📤 Model Output:`);
        if (output.summary) {
            console.log(`   Summary/Response: "${output.summary}"`);
        }
        if (output.reviewer) {
            console.log(`   Reviewer Call: ${output.reviewer.overall_call}`);
        }
        if (output.display_fields) {
            console.log(`   Display Fields:`);
            output.display_fields.forEach(f => {
                console.log(`     [${f.order}] ${f.label}: "${f.value}"`);
            });
        }
        if (output.followup_questions) {
            console.log(`   Questions:`);
            output.followup_questions.forEach(q => console.log(`     - ${q}`));
        }
        output.signals.forEach(s => {
            console.log(`   - [${s.name || s.signal_id}] "${s.provenance}"`);
        });

        const result = scoreResult(output, testCase);

        if (result.pass) {
            console.log(`\n✅ PASS`);
        } else {
            console.log(`\n❌ FAIL`);
            if (result.missingSignals.length) console.log(`   Missed Signals: ${result.missingSignals.join(', ')}`);
            if (result.missingPhrases.length) console.log(`   Missed Phrases: ${result.missingPhrases.join(', ')}`);
            if (!result.provenanceCheck) console.log(`   Missing Provenance in some signals.`);
            failures++;
        }
    }

    if (failures > 0) {
        console.log(`\n🏁 Run Complete: ${failures} failures.`);
        process.exit(1);
    } else {
        console.log(`\n🏁 Run Complete: All passed.`);
        process.exit(0);
    }
}

main().catch(err => {
    console.error(err);
    process.exit(1);
});