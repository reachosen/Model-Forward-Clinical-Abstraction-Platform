"""
Configuration Validator (Refactored)

Validates CA Factory project configurations using Pydantic schemas.
"""

import logging
import re
from typing import Dict, Any, List, Optional, Literal
from pydantic import (
    BaseModel, 
    Field, 
    field_validator, 
    model_validator, 
    ValidationError
)

logger = logging.getLogger(__name__)

# --- Pydantic Models ---

class ProjectManifest(BaseModel):
    project_id: str
    project_name: str
    domain: str
    version: str

    @field_validator('version')
    @classmethod
    def validate_version_format(cls, v: str) -> str:
        # Semantic versioning regex (e.g., 1.0.0 or 1.0.0-beta)
        pattern = r'^\d+\.\d+\.\d+(-[a-zA-Z0-9]+)?$'
        if not re.match(pattern, v):
            raise ValueError(f"Invalid version format: {v}")
        return v

class AgentProfile(BaseModel):
    agent_id: str
    agent_type: Literal["retrieval", "evaluation", "qa", "timeline", "summary"]
    base_prompt: str = Field(..., min_length=1)
    min_confidence_threshold: float = Field(default=0.7, ge=0.0, le=1.0)

    @field_validator('base_prompt')
    @classmethod
    def prompt_not_empty(cls, v: str) -> str:
        if not v.strip():
            raise ValueError("base_prompt cannot be empty or whitespace")
        return v

class Rule(BaseModel):
    rule_id: str
    rule_name: str
    category: str
    priority: Literal["required", "optional", "supplementary"] = "required"

class RuleLibrary(BaseModel):
    rules: List[Rule]

    @field_validator('rules')
    @classmethod
    def unique_rule_ids(cls, v: List[Rule]) -> List[Rule]:
        ids = [r.rule_id for r in v]
        if len(ids) != len(set(ids)):
            duplicates = set([x for x in ids if ids.count(x) > 1])
            raise ValueError(f"Duplicate rule_ids found: {duplicates}")
        return v

class QualityGates(BaseModel):
    min_recall_at_5: Optional[float] = Field(None, ge=0.0, le=1.0)
    min_recall_at_10: Optional[float] = Field(None, ge=0.0, le=1.0)
    min_mrr: Optional[float] = Field(None, ge=0.0, le=1.0)
    min_clinical_accuracy: Optional[float] = Field(None, ge=0.0, le=1.0)
    min_citation_quality: Optional[float] = Field(None, ge=0.0, le=1.0)
    fail_action: Literal["warn", "block", "log"] = "warn"

class PromptTemplate(BaseModel):
    template: str
    variables: List[str] = []

    @model_validator(mode='after')
    def check_variables(self) -> 'PromptTemplate':
        # Extract variables like {var_name} from template string
        found_vars = set(re.findall(r'\{(\w+)\}', self.template))
        declared_vars = set(self.variables)
        
        undeclared = found_vars - declared_vars
        if undeclared:
            raise ValueError(f"Template uses undeclared variables: {undeclared}")
        
        return self

class PromptLibrary(BaseModel):
    system_prompts: Dict[str, PromptTemplate] = {}
    task_prompts: Dict[str, PromptTemplate] = {}
    output_formats: Dict[str, PromptTemplate] = {}

class ProjectConfig(BaseModel):
    """Master configuration schema"""
    project_domain: str
    domain_version: str
    rca_config_version: str
    
    # Required sections
    agent_profiles: List[AgentProfile] = Field(..., min_length=1)
    
    # Optional sections
    project_manifest: Optional[ProjectManifest] = None
    rule_library: Optional[RuleLibrary] = None
    quality_gates: Optional[QualityGates] = None
    prompt_library: Optional[PromptLibrary] = None

    @field_validator('agent_profiles')
    @classmethod
    def unique_agent_ids(cls, v: List[AgentProfile]) -> List[AgentProfile]:
        ids = [a.agent_id for a in v]
        if len(ids) != len(set(ids)):
            duplicates = set([x for x in ids if ids.count(x) > 1])
            raise ValueError(f"Duplicate agent_ids found: {duplicates}")
        return v


# --- Legacy Validator Wrapper ---

class ConfigValidator:
    """
    Configuration validator for CA Factory projects.
    Wraps Pydantic models to maintain backward compatibility.
    """

    def __init__(self):
        logger.debug("Config validator initialized (Pydantic-backed)")

    def validate(self, config: Dict[str, Any]) -> Dict[str, Any]:
        """
        Validate complete configuration.

        Args:
            config: Configuration dictionary

        Returns:
            Validation result with 'valid' (bool), 'errors' (list), 'warnings' (list)
        """
        errors = []
        warnings = []

        try:
            # Validate using the master Pydantic model
            ProjectConfig.model_validate(config)
            
            # Custom logic for warnings (things Pydantic considers valid but we want to warn about)
            # Example: Checking for unused variables in prompts
            if "prompt_library" in config:
                self._check_unused_variables(config["prompt_library"], warnings)

        except ValidationError as e:
            # format Pydantic errors into readable strings
            for err in e.errors():
                loc = " -> ".join([str(x) for x in err['loc']])
                msg = err['msg']
                errors.append(f"Field '{loc}': {msg}")
        except Exception as e:
            errors.append(f"Unexpected validation error: {str(e)}")

        return {
            "valid": len(errors) == 0,
            "errors": errors,
            "warnings": warnings
        }

    def _check_unused_variables(self, prompt_lib: Dict[str, Any], warnings: List[str]):
        """Helper to generate warnings for unused variables (non-blocking issues)."""
        for section_name, section in prompt_lib.items():
            if not isinstance(section, dict): continue
            for prompt_name, data in section.items():
                if "template" in data and "variables" in data:
                    template_vars = set(re.findall(r'\{(\w+)\}', data["template"]))
                    declared_vars = set(data["variables"])
                    unused = declared_vars - template_vars
                    if unused:
                        warnings.append(
                            f"Prompt {section_name}.{prompt_name} declares unused variables: {unused}"
                        )

    def validate_compatibility(
        self,
        config: Dict[str, Any],
        min_version: str = "1.0.0"
    ) -> Dict[str, Any]:
        """
        Validate configuration version compatibility.
        Kept for backward compatibility.
        """
        errors = []
        config_version = config.get("rca_config_version", "0.0.0")

        if not self._is_version_compatible(config_version, min_version):
            errors.append(
                f"Configuration version {config_version} is not compatible with "
                f"minimum required version {min_version}"
            )

        return {
            "compatible": len(errors) == 0,
            "errors": errors,
            "warnings": [],
            "config_version": config_version,
            "min_version": min_version
        }

    def _is_version_compatible(self, version: str, min_version: str) -> bool:
        """Check if version meets minimum requirement."""
        def parse_version(v: str) -> tuple:
            try:
                parts = v.split('-')[0].split('.')
                return tuple(int(p) for p in parts)
            except (ValueError, IndexError):
                return (0, 0, 0)

        v_tuple = parse_version(version)
        min_tuple = parse_version(min_version)
        return v_tuple >= min_tuple