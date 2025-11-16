# CA Factory Configuration System

## Overview

The CA Factory uses a modular, project-based configuration system that enables easy creation and management of multiple clinical abstraction projects across different domains.

## Directory Structure

```
configs/
├── projects/              # Individual project configurations
│   ├── clabsi/           # CLABSI project
│   │   ├── manifest.json
│   │   ├── agent_config.json
│   │   ├── prompts.json
│   │   ├── tasks.json
│   │   ├── rules.json
│   │   ├── knowledge_base.json
│   │   ├── tools.json
│   │   ├── schemas.json
│   │   └── golden_corpus.json
│   └── cauti/            # CAUTI project
│       └── [same structure]
└── templates/            # Project templates
    └── default/
```

## Configuration Files

Each project consists of 9 configuration files:

### 1. `manifest.json` - Project Metadata
Defines high-level project information:
- Project ID, name, and description
- Domain and version information
- Data sources and output formats

### 2. `agent_config.json` - Agent Configuration
Core CA Factory configuration:
- Agent profiles (retrieval, evaluation, qa, timeline, summary)
- Memory management (token limits, pruning policy)
- Delegation thresholds and strategy
- Quality gates and evaluation criteria
- Vector store and memory store configuration

### 3. `prompts.json` - Prompt Library
Reusable prompt templates:
- System prompts for different agent roles
- Task-specific prompts with variable substitution
- Output format templates
- Variable definitions

### 4. `tasks.json` - Task Definitions
Structured task specifications:
- Task inputs and outputs
- Success criteria
- Examples for each task type

### 5. `rules.json` - Rule Library
Domain-specific evaluation rules:
- Rule definitions with NHSN references
- Evaluation logic and conditions
- Required evidence types
- Prompt templates for rule evaluation
- Rule dependencies and execution order

### 6. `knowledge_base.json` - Domain Knowledge
Knowledge chunks for context priming:
- Definition chunks (NHSN criteria, etc.)
- Device/organism knowledge
- Temporal calculation rules
- Priming strategies by task type

### 7. `tools.json` - Tool Catalog
Available tools and their specifications:
- Tool IDs and descriptions
- Input/output schemas
- Execution timeouts and token limits
- Loading strategies (always/on_demand)

### 8. `schemas.json` - Data Schemas
JSON schemas for domain data structures:
- Patient case structure
- Lab result definitions
- Clinical sign definitions
- Evidence structures

### 9. `golden_corpus.json` - Test Cases
Golden corpus for quality evaluation:
- Test cases with expected outputs
- Evaluation criteria
- Performance baselines
- Edge cases

## Using the Configuration System

### Loading a Project

```python
from ca_factory.config.loader import ConfigLoader

loader = ConfigLoader(config_root="./backend/configs")
config = loader.load_project("clabsi", validate=True)

# Access specific components
agent_profiles = config["agent_profiles"]
rules = config["rule_library"]["rules"]
knowledge = config["knowledge_base"]["chunks"]
```

### Creating a New Project

#### Option 1: Using the CLI

```bash
# Create a new project from scratch
python backend/cli/ca_factory_cli.py init ssi \
  --name "Surgical Site Infection Detection" \
  --domain "Healthcare-Acquired Conditions" \
  --description "AI-powered SSI case identification"

# Create from a template
python backend/cli/ca_factory_cli.py init vap \
  --template hac_template \
  --name "Ventilator-Associated Pneumonia Detection"
```

#### Option 2: Using Python API

```python
from ca_factory.config.project_manager import ProjectManager
from pathlib import Path

pm = ProjectManager(Path("./backend/configs"))

# Create new project
manifest = pm.create_project(
    project_id="ssi",
    project_name="Surgical Site Infection Detection",
    domain="Healthcare-Acquired Conditions",
    description="AI-powered SSI case identification",
    template="default"
)
```

### Validating a Project

```bash
# Using CLI
python backend/cli/ca_factory_cli.py validate clabsi

# Using Python
from ca_factory.config.validator import ConfigValidator

validator = ConfigValidator()
result = validator.validate(config)

if not result["valid"]:
    print("Errors:", result["errors"])
```

### Listing Projects

```bash
python backend/cli/ca_factory_cli.py list
```

### Switching Projects

Set the `CA_FACTORY_PROJECT` environment variable:

```bash
# Use CLABSI (default)
export CA_FACTORY_PROJECT=clabsi
python backend/api/main.py

# Use CAUTI
export CA_FACTORY_PROJECT=cauti
python backend/api/main.py
```

## CLI Commands

```bash
# Initialize new project
ca-factory init <project_id> --name "Name" --domain "Domain"

# List all projects
ca-factory list

# Validate project
ca-factory validate <project_id>

# Show project details
ca-factory show <project_id>

# Delete project (with confirmation)
ca-factory delete <project_id> --confirm

# Export project
ca-factory export <project_id> --output ./exports
```

## Creating a Domain Template

To create a reusable template for a specific domain:

1. Create a fully configured project
2. Export it to the templates directory
3. Replace domain-specific values with template variables `{VAR_NAME}`
4. Use the template for new projects

Example template variables:
- `{DOMAIN}` - Domain name (CLABSI, CAUTI, etc.)
- `{INFECTION_TYPE}` - Infection type description
- `{DEVICE_TYPE}` - Device type (central line, catheter, etc.)

## Best Practices

### 1. Rule Library
- Include NHSN references for all rules
- Provide evaluation logic in structured format
- Add examples for complex rules
- Define rule dependencies explicitly

### 2. Knowledge Base
- Keep chunks focused and atomic
- Tag chunks for easy retrieval
- Set appropriate auto-prime flags
- Maintain token counts

### 3. Prompts
- Use variables for reusability
- Keep prompts domain-agnostic where possible
- Document all variables used
- Test prompts with sample data

### 4. Quality Gates
- Set realistic thresholds based on golden corpus
- Start conservative, tune based on performance
- Use `warn` action during development
- Switch to `block` for production

### 5. Golden Corpus
- Include positive, negative, and edge cases
- Document expected outputs clearly
- Update corpus as criteria evolve
- Maintain at least 100 test cases per domain

## Migration from Old Config

The old single-file configuration (`backend/configs/clabsi.json`) has been migrated to the new modular structure (`backend/configs/projects/clabsi/`).

To migrate a custom configuration:

1. Create project directory: `configs/projects/your_project/`
2. Split your configuration into the 9 files
3. Update imports to use ConfigLoader
4. Validate: `ca-factory validate your_project`

## Troubleshooting

### "Project not found"
- Verify project directory exists in `configs/projects/`
- Check `manifest.json` exists and is valid JSON

### "Configuration validation failed"
- Run `ca-factory validate <project>` to see specific errors
- Check required fields in each config file
- Verify JSON syntax (no trailing commas)

### "Agent profile not found"
- Ensure `agent_id` matches in agent_config.json
- Check `agent_type` is valid (retrieval, evaluation, qa, timeline, summary)

## Examples

See the following projects for reference:
- `projects/clabsi/` - Comprehensive CLABSI configuration
- `projects/cauti/` - CAUTI configuration example

## API Reference

### ConfigLoader
- `load_project(project_id, validate=True)` - Load complete project config
- `load_manifest(project_id)` - Load only manifest
- `list_projects()` - List all available projects
- `get_agent_profile(project_id, agent_id)` - Get specific agent
- `get_rule(project_id, rule_id)` - Get specific rule

### ProjectManager
- `create_project(...)` - Create new project
- `create_from_template(...)` - Create from template
- `validate_project(project_id)` - Validate configuration
- `delete_project(project_id, confirm=True)` - Delete project
- `export_project(project_id, output_path)` - Export project

### ConfigValidator
- `validate(config)` - Validate complete configuration
- `validate_compatibility(config, min_version)` - Check version compatibility

## Contributing

When adding new configuration fields:
1. Update the relevant schema documentation
2. Add validation rules in `ConfigValidator`
3. Update the CLI if needed
4. Add examples to existing projects
