
import * as fs from 'fs';
import * as path from 'path';
import { LearningPatch } from '../models/LearningQueue';

/**
 * Patch Application Tool
 * 
 * Applies a generated LearningPatch to the codebase.
 * Currently supports:
 * - Adding signals to domains_registry/.../signals.json
 */

const REGISTRY_ROOT = path.join(__dirname, '../domains_registry');

async function main() {
    const patchPath = process.argv[2];
    if (!patchPath || !fs.existsSync(patchPath)) {
        console.error("Usage: ts-node apply-patch.ts <path-to-patch.json>");
        process.exit(1);
    }

    console.log(`🚑 Applying Patch: ${patchPath}`);
    const patch: LearningPatch = JSON.parse(fs.readFileSync(patchPath, 'utf-8'));

    try {
        if (patch.target === 'signal_library') {
            await applySignalPatch(patch);
        } else if (patch.target === 'prompt') {
            await applyPromptPatch(patch);
        } else {
            console.warn(`⚠️  Target '${patch.target}' not yet supported for auto-application.`);
            process.exit(0); // Exit gracefully
        }
        
        console.log(`✅ Patch applied successfully.`);
        
        // Move patch to "applied" folder or rename
        const parsedPath = path.parse(patchPath);
        const appliedPath = path.join(parsedPath.dir, `applied_${parsedPath.base}`);
        fs.renameSync(patchPath, appliedPath);

    } catch (error) {
        console.error(`❌ Failed to apply patch:`, error);
        process.exit(1);
    }
}

async function applyPromptPatch(patch: LearningPatch) {
    const { domain } = patch;
    const usnwrSpecialty = domain.replace(/ /g, '_');
    
    // Locate the shared prompt
    // TODO: Support metric-specific prompts if they exist?
    // For now, edit the shared one as it's the primary source
    const promptPath = path.join(REGISTRY_ROOT, 'USNWR', usnwrSpecialty, '_shared', 'prompts', 'signal_enrichment.md');
    
    if (!fs.existsSync(promptPath)) {
        throw new Error(`Could not locate prompt file: ${promptPath}`);
    }

    console.log(`   📝 Editing Prompt: ${promptPath}`);
    let content = fs.readFileSync(promptPath, 'utf-8');
    let modified = false;

    // Handle additions (Append to extraction rules or context)
    if (patch.proposed_changes.prompt_additions) {
        for (const addition of patch.proposed_changes.prompt_additions) {
            // Check if already present to avoid duplicates
            if (!content.includes(addition)) {
                // Append to end of file for now, or finding a suitable section would be better
                // Let's append to "EXTRACTION RULES" if found, else end
                if (content.includes('EXTRACTION RULES:')) {
                    content += `\n- ${addition}`;
                } else {
                    content += `\n\n${addition}`;
                }
                console.log(`      + Added instruction: "${addition.substring(0, 50)}..."`);
                modified = true;
            }
        }
    }

    // Handle modifications (Search & Replace)
    if (patch.proposed_changes.prompt_modifications) {
        for (const mod of patch.proposed_changes.prompt_modifications) {
            if (content.includes(mod.old_text)) {
                content = content.replace(mod.old_text, mod.new_text);
                console.log(`      ~ Modified section: ${mod.section}`);
                modified = true;
            } else {
                console.warn(`      ⚠️ Could not find text to replace: "${mod.old_text.substring(0, 30)}..."`);
            }
        }
    }

    if (modified) {
        fs.writeFileSync(promptPath, content, 'utf-8');
    } else {
        console.log(`   (No changes made to prompt)`);
    }
}

async function applySignalPatch(patch: LearningPatch) {
    const { domain, review_target } = patch;
    
    // 1. Locate the correct signals.json
    // Logic matches SemanticPacketLoader: metric-specific > domain-shared
    const usnwrSpecialty = domain.replace(/ /g, '_');
    
    // Try Metric-Specific Definitions first (Preferred)
    let targetFile = path.join(REGISTRY_ROOT, 'USNWR', usnwrSpecialty, 'metrics', review_target, 'definitions', 'signal_groups.json');
    
    if (!fs.existsSync(targetFile)) {
        // Fallback to Domain Shared (Legacy/General)
        // Note: The patch might be asking for specific definitions, but if the file doesn't exist,
        // we might default to the shared signals.json
        targetFile = path.join(REGISTRY_ROOT, 'USNWR', usnwrSpecialty, '_shared', 'signals.json');
    }

    if (!fs.existsSync(targetFile)) {
        throw new Error(`Could not locate signal definition file for ${domain}/${review_target}. Checked: ${targetFile}`);
    }

    console.log(`   📝 Editing: ${targetFile}`);
    const content = JSON.parse(fs.readFileSync(targetFile, 'utf-8'));
    let modified = false;

    // Handle "signals_to_add"
    if (patch.proposed_changes.signals_to_add) {
        for (const newSignal of patch.proposed_changes.signals_to_add) {
            
            // Logic differs slightly between signal_groups.json (V2) and signals.json (V1)
            if (targetFile.endsWith('signal_groups.json')) {
                // V2 Structure: { signal_groups: [ { group_id: "...", signals: [ ... ] } ] }
                // We need to find the right group or add to a default one
                const groups = content.signal_groups || [];
                
                // Heuristic: Map category to group_id
                const targetGroupId = mapCategoryToGroup(newSignal.category);
                let group = groups.find((g: any) => g.group_id === targetGroupId);
                
                if (!group) {
                    // Create group if missing
                    group = { 
                        group_id: targetGroupId, 
                        signals: [] 
                    };
                    groups.push(group);
                }

                // Check for duplicate
                const exists = group.signals.some((s: any) => s.id === newSignal.id || s.name === newSignal.name);
                if (!exists) {
                    group.signals.push({
                        id: newSignal.id,
                        name: newSignal.name,
                        description: newSignal.rationale, // Mapping rationale to description for now
                        evidence_type: "L2" // Default
                    });
                    console.log(`      + Added signal '${newSignal.name}' to group '${targetGroupId}'`);
                    modified = true;
                }

            } else {
                // V1 Structure: { "group_id": [ "signal string" ] }
                // or flat list? Usually V1 is dict of arrays
                const targetGroupId = mapCategoryToGroup(newSignal.category);
                
                if (!content[targetGroupId]) {
                    content[targetGroupId] = [];
                }
                
                // V1 often just uses strings
                if (!content[targetGroupId].includes(newSignal.name)) {
                    content[targetGroupId].push(newSignal.name);
                    console.log(`      + Added signal '${newSignal.name}' to '${targetGroupId}'`);
                    modified = true;
                }
            }
        }
    }

    if (modified) {
        fs.writeFileSync(targetFile, JSON.stringify(content, null, 2), 'utf-8');
    } else {
        console.log(`   (No changes made - signals might already exist)`);
    }
}

function mapCategoryToGroup(category: string): string {
    const map: Record<string, string> = {
        'clinical': 'infection_risks',
        'process': 'bundle_compliance',
        'outcome': 'outcome_risks',
        'admin': 'readmission_risks'
    };
    return map[category] || 'infection_risks';
}

main();
