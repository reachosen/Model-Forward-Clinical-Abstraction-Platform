
import * as path from 'path';
import * as dotenv from 'dotenv';
import { SemanticPacketLoader } from '../utils/semanticPacketLoader';
import { getSignalEnrichmentVariables } from '../shared/context_builders/signalEnrichment';
import { runI25Engine } from '../EvalsFactory/validation/engine';

// Load env vars
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

async function main() {
    console.log("🧪 Starting Toy Playground for I32a...");

    const concernId = 'I32a';
    const domain = 'Orthopedics'; // Mapped from I*

    // 1. Load Context
    console.log(`
📚 Loading Semantic Packet for ${concernId}...`);
    const loader = SemanticPacketLoader.getInstance();
    // Force reload/clear cache to ensure fresh state
    loader.clearCache();
    const packet = loader.load(domain, concernId);

    if (!packet) {
        console.error("❌ Failed to load packet.");
        process.exit(1);
    }

    // 2. Build Context Variables
    console.log(`
🏗️  Building Context Variables...`);
    const context = {
        concern_id: concernId,
        domain: domain,
        primary_archetype: packet.metrics[concernId]?.primary_archetype || 'Preventability_Detective',
        archetypes: packet.metrics[concernId]?.archetypes || ['Preventability_Detective'],
        ortho_context: packet,
        semantic_context: {
            packet: packet,
            ranking: { specialty_name: domain }
        }
    };

    const variables = getSignalEnrichmentVariables(context);

    // 3. Inspect Expanded Signals
    console.log(`
🔍 Expanded Signal Groups (First 500 chars):`);
    console.log(variables.signalGroupIds.substring(0, 500) + "...");
    
    // Inspect Duet/Ambiguity
    console.log(`
🎭 Duet Persona:`);
    console.log(variables.duetPersona);
    console.log(`
❓ Ambiguity Handling:`);
    console.log(variables.ambiguityHandling);
    
    // Check for "Wound drainage/erythema"
    const targetSignal = "Wound drainage/erythema";
    const found = variables.signalGroupIds.toLowerCase().includes(targetSignal.toLowerCase());
    console.log(`
🎯 Target Signal '${targetSignal}': ${found ? "✅ FOUND" : "❌ NOT FOUND"}`);

    if (found) {
        // Show surrounding context
        const idx = variables.signalGroupIds.toLowerCase().indexOf(targetSignal.toLowerCase());
        const start = Math.max(0, idx - 50);
        const end = Math.min(variables.signalGroupIds.length, idx + 50);
        console.log(`   Context: "...${variables.signalGroupIds.substring(start, end)}..."`);
    }

    // 4. Run Engine (Optional)
    const patientPayload = "NARRATIVE: 14F s/p PSF T4-L1. POD10 phone call: Mom reports patient has low grade fever 100.2 and increased back pain. Notes some redness and drainage from the inferior aspect of the incision. Advised to come to ED.";
    
    if (process.env.OPENAI_API_KEY) {
        console.log(`
🚀 Running Engine with Test Payload...`);
        const result = await runI25Engine({
            concern_id: concernId,
            patient_payload: patientPayload,
            debug: true // This will print the full prompt
        });

        console.log(`
📤 Engine Output:`);
        console.log(JSON.stringify(result, null, 2));

        // Check if signal was extracted
        const extracted = result.signals.some(s => s.toLowerCase().includes('drainage') || s.toLowerCase().includes('erythema'));
        console.log(`
✅ Signal Extracted? ${extracted ? "YES" : "NO"}`);
    } else {
        console.log(`
⚠️  Skipping Engine Run (No OPENAI_API_KEY)`);
    }
}

main().catch(console.error);
