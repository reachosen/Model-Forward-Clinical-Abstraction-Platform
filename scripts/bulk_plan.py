import argparse
import json
import subprocess
import os
import datetime
import sys
from pathlib import Path

# Fix unicode encoding for Windows console
if sys.platform == 'win32':
    sys.stdout.reconfigure(encoding='utf-8')

# --- DYNAMIC PATH CONFIGURATION ---
# Find the script's directory
SCRIPT_DIR = Path(__file__).resolve().parent

# Define potential locations for 'plan.ts' based on project structure
POTENTIAL_PATHS = [
    # 1. If script is in hac-planner-cli/scripts/
    SCRIPT_DIR.parent / "cli" / "plan.ts",

    # 2. If script is in root scripts/ folder
    SCRIPT_DIR.parent / "hac-planner-cli" / "cli" / "plan.ts",
    SCRIPT_DIR.parent / "factory-cli" / "cli" / "plan.ts",

    # 3. Fallback: Try CWD
    Path.cwd() / "cli" / "plan.ts",
    Path.cwd() / "hac-planner-cli" / "cli" / "plan.ts",
    Path.cwd() / "factory-cli" / "cli" / "plan.ts"
]

# Locate the correct entry point
CLI_ENTRY_POINT = None
HAC_CLI_ROOT = None

for p in POTENTIAL_PATHS:
    if p.exists():
        CLI_ENTRY_POINT = p
        HAC_CLI_ROOT = p.parent.parent # Go up two levels (cli -> root)
        break

# Mapping of metric prefixes to domains
DOMAIN_MAP = {
    'C': {'name': 'Endocrinology', 'archetype': 'USNWR_ENDO_METRIC'},
    'D': {'name': 'Gastroenterology', 'archetype': 'USNWR_GASTRO_METRIC'},
    'E': {'name': 'Cardiology', 'archetype': 'USNWR_CARDIO_METRIC'},
    'F': {'name': 'Neonatology', 'archetype': 'USNWR_NEO_METRIC'},
    'G': {'name': 'Nephrology', 'archetype': 'USNWR_NEPHRO_METRIC'},
    'H': {'name': 'Neurology_Neurosurgery', 'archetype': 'USNWR_NEURO_METRIC'},
    'I': {'name': 'Orthopedics', 'archetype': 'USNWR_ORTHO_METRIC'},
    'J': {'name': 'Pulmonology', 'archetype': 'USNWR_PULM_METRIC'},
    'K': {'name': 'Urology', 'archetype': 'USNWR_URO_METRIC'},
    'L': {'name': 'Behavioral_Health', 'archetype': 'USNWR_BH_METRIC'}
}

def get_domain_info(metric_id):
    """Detect domain and archetype from metric ID prefix."""
    prefix = metric_id[0].upper()
    return DOMAIN_MAP.get(prefix, {'name': 'General_Medical', 'archetype': 'USNWR_GENERAL_METRIC'})

def generate_input_json(metric_id, output_path):
    """Generate a temporary PlanningInput JSON file."""
    info = get_domain_info(metric_id)
    
    # Sanitize ID (e.g., C41.1a -> C41_1A)
    sanitized_id = metric_id.replace('.', '_').upper()
    
    input_data = {
        "planning_id": f"bulk-{sanitized_id.lower()}-{datetime.datetime.now().strftime('%Y%m%d')}",
        "concern": metric_id,  # Use the original metric ID (e.g., "I25", "C35.1a1")
        "intent": f"Automated abstraction for USNWR metric {metric_id}",
        "target_population": "Pediatric patients",
        "specific_requirements": [
            f"USNWR {info['name']} quality metric reporting"
        ],
        "clinical_context": {
            "objective": f"Automated abstraction for USNWR metric {metric_id}",
            "regulatory_frameworks": ["USNWR_2025"]
        },
        "data_profile": {
            "sources": [
                {
                    "source_id": "ehr",
                    "type": "EHR",
                    "available_data": ["procedures", "diagnosis", "labs", "clinical_notes"]
                }
            ]
        }
    }
    
    with open(output_path, 'w') as f:
        json.dump(input_data, f, indent=2)
    return input_data

def run_planner(metric_id, input_file, output_base_dir, api_key=None):
    """Run the HAC Planner CLI using absolute paths."""
    timestamp = datetime.datetime.now().strftime('%Y-%m-%d_%H-%M-%S')
    
    info = get_domain_info(metric_id)
    sanitized_id = metric_id.replace('.', '_').upper()
    
    folder_name = f"USNWR_{sanitized_id}_{info['name']}_{timestamp}"
    output_dir = os.path.join(output_base_dir, folder_name)
    
    cmd = [
        "npx", "ts-node", str(CLI_ENTRY_POINT),
        str(input_file),
        "-o", str(output_dir)
    ]
    
    if api_key:
        cmd.extend(["--api-key", api_key])
    elif "OPENAI_API_KEY" not in os.environ:
        cmd.append("--mock")

    print(f"\n🚀 Generating plan for {metric_id} in {output_dir}...")
    
    try:
        # Run inside the correct CLI root so imports resolve
        subprocess.run(cmd, check=True, shell=True if os.name == 'nt' else False, cwd=HAC_CLI_ROOT)
        print(f"✅ Success: {metric_id}")
    except subprocess.CalledProcessError as e:
        print(f"❌ Failed: {metric_id}")

def main():
    parser = argparse.ArgumentParser(description="Bulk generate HAC Plans")
    parser.add_argument("--metrics", type=str, required=True, help="Comma-separated list of metrics (e.g., I27,C41.1a)")
    parser.add_argument("--output", type=str, default="planoutput", help="Base output directory")
    parser.add_argument("--api-key", type=str, help="OpenAI API Key (optional)")
    
    args = parser.parse_args()
    
    if not CLI_ENTRY_POINT:
        print("❌ Error: Could not find 'cli/plan.ts' in any expected location.")
        print(f"   Script dir: {SCRIPT_DIR}")
        return

    # Ensure we output to the absolute path
    output_path = Path(args.output).resolve()
    metrics = [m.strip().upper() for m in args.metrics.split(',') if m.strip()]
    os.makedirs(output_path, exist_ok=True)
    
    print(f"📋 Batch Processing {len(metrics)} metrics: {', '.join(metrics)}")
    print(f"📂 CLI Root: {HAC_CLI_ROOT}")
    
    for metric in metrics:
        # Create input file inside the CLI root to avoid relative path issues
        temp_input = HAC_CLI_ROOT / f"temp_input_{metric.replace('.', '_')}.json"
        try:
            generate_input_json(metric, temp_input)
            run_planner(metric, temp_input, output_path, args.api_key)
        finally:
            if temp_input.exists():
                os.remove(temp_input)

if __name__ == "__main__":
    main()