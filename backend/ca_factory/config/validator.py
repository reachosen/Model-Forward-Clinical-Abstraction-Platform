"""
Configuration Validator

Validates CA Factory project configurations against expected schemas.
"""

import logging
from typing import Dict, Any, List, Optional

logger = logging.getLogger(__name__)


class ConfigValidator:
    """
    Configuration validator for CA Factory projects.

    Validates that all required fields are present and have valid values.
    """

    # Required top-level fields
    REQUIRED_FIELDS = [
        "project_domain",
        "domain_version",
        "rca_config_version",
        "agent_profiles"
    ]

    # Required fields in manifest
    REQUIRED_MANIFEST_FIELDS = [
        "project_id",
        "project_name",
        "domain",
        "version"
    ]

    # Required fields in agent profile
    REQUIRED_AGENT_FIELDS = [
        "agent_id",
        "agent_type",
        "base_prompt"
    ]

    # Valid agent types
    VALID_AGENT_TYPES = [
        "retrieval",
        "evaluation",
        "qa",
        "timeline",
        "summary"
    ]

    def __init__(self):
        """Initialize validator."""
        logger.debug("Config validator initialized")

    def validate(self, config: Dict[str, Any]) -> Dict[str, Any]:
        """
        Validate complete configuration.

        Args:
            config: Configuration dictionary

        Returns:
            Validation result with errors and warnings
        """
        errors = []
        warnings = []

        # Check required fields
        for field in self.REQUIRED_FIELDS:
            if field not in config:
                errors.append(f"Missing required field: {field}")

        # Validate manifest if present
        if "project_manifest" in config:
            manifest_validation = self._validate_manifest(config["project_manifest"])
            errors.extend(manifest_validation["errors"])
            warnings.extend(manifest_validation["warnings"])

        # Validate agent profiles
        if "agent_profiles" in config:
            agent_validation = self._validate_agent_profiles(config["agent_profiles"])
            errors.extend(agent_validation["errors"])
            warnings.extend(agent_validation["warnings"])

        # Validate rule library if present
        if "rule_library" in config:
            rule_validation = self._validate_rule_library(config["rule_library"])
            errors.extend(rule_validation["errors"])
            warnings.extend(rule_validation["warnings"])

        # Validate quality gates if present
        if "quality_gates" in config:
            quality_validation = self._validate_quality_gates(config["quality_gates"])
            errors.extend(quality_validation["errors"])
            warnings.extend(quality_validation["warnings"])

        # Validate prompt library if present
        if "prompt_library" in config:
            prompt_validation = self._validate_prompt_library(config["prompt_library"])
            errors.extend(prompt_validation["errors"])
            warnings.extend(prompt_validation["warnings"])

        return {
            "valid": len(errors) == 0,
            "errors": errors,
            "warnings": warnings
        }

    def _validate_manifest(self, manifest: Dict[str, Any]) -> Dict[str, Any]:
        """Validate project manifest."""
        errors = []
        warnings = []

        for field in self.REQUIRED_MANIFEST_FIELDS:
            if field not in manifest:
                errors.append(f"Manifest missing required field: {field}")

        # Check version format
        if "version" in manifest:
            version = manifest["version"]
            if not isinstance(version, str) or not self._is_valid_version(version):
                warnings.append(f"Invalid version format: {version}")

        return {"errors": errors, "warnings": warnings}

    def _validate_agent_profiles(
        self,
        profiles: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """Validate agent profiles."""
        errors = []
        warnings = []

        if not isinstance(profiles, list):
            errors.append("agent_profiles must be a list")
            return {"errors": errors, "warnings": warnings}

        if len(profiles) == 0:
            errors.append("At least one agent profile is required")

        agent_ids = set()

        for i, profile in enumerate(profiles):
            # Check required fields
            for field in self.REQUIRED_AGENT_FIELDS:
                if field not in profile:
                    errors.append(f"Agent profile {i} missing required field: {field}")

            # Check agent_id uniqueness
            if "agent_id" in profile:
                agent_id = profile["agent_id"]
                if agent_id in agent_ids:
                    errors.append(f"Duplicate agent_id: {agent_id}")
                agent_ids.add(agent_id)

            # Check agent_type validity
            if "agent_type" in profile:
                agent_type = profile["agent_type"]
                if agent_type not in self.VALID_AGENT_TYPES:
                    errors.append(
                        f"Invalid agent_type: {agent_type}. "
                        f"Must be one of {self.VALID_AGENT_TYPES}"
                    )

            # Check prompts are non-empty
            if "base_prompt" in profile:
                if not profile["base_prompt"] or len(profile["base_prompt"].strip()) == 0:
                    warnings.append(f"Agent {profile.get('agent_id', i)} has empty base_prompt")

            # Check thresholds
            if "min_confidence_threshold" in profile:
                threshold = profile["min_confidence_threshold"]
                if not isinstance(threshold, (int, float)) or not 0 <= threshold <= 1:
                    errors.append(
                        f"Agent {profile.get('agent_id', i)} has invalid "
                        f"min_confidence_threshold: {threshold}"
                    )

        return {"errors": errors, "warnings": warnings}

    def _validate_rule_library(
        self,
        rule_library: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Validate rule library."""
        errors = []
        warnings = []

        if "rules" not in rule_library:
            errors.append("rule_library missing 'rules' field")
            return {"errors": errors, "warnings": warnings}

        rules = rule_library["rules"]

        if not isinstance(rules, list):
            errors.append("rule_library.rules must be a list")
            return {"errors": errors, "warnings": warnings}

        if len(rules) == 0:
            warnings.append("rule_library has no rules defined")

        rule_ids = set()

        for i, rule in enumerate(rules):
            # Check required fields
            required_rule_fields = ["rule_id", "rule_name", "category"]
            for field in required_rule_fields:
                if field not in rule:
                    errors.append(f"Rule {i} missing required field: {field}")

            # Check rule_id uniqueness
            if "rule_id" in rule:
                rule_id = rule["rule_id"]
                if rule_id in rule_ids:
                    errors.append(f"Duplicate rule_id: {rule_id}")
                rule_ids.add(rule_id)

            # Check priority
            if "priority" in rule:
                if rule["priority"] not in ["required", "optional", "supplementary"]:
                    warnings.append(
                        f"Rule {rule.get('rule_id', i)} has non-standard priority: "
                        f"{rule['priority']}"
                    )

        return {"errors": errors, "warnings": warnings}

    def _validate_quality_gates(
        self,
        quality_gates: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Validate quality gates configuration."""
        errors = []
        warnings = []

        # Check metric thresholds are in valid range
        metric_fields = [
            "min_recall_at_5",
            "min_recall_at_10",
            "min_mrr",
            "min_clinical_accuracy",
            "min_citation_quality"
        ]

        for field in metric_fields:
            if field in quality_gates:
                value = quality_gates[field]
                if not isinstance(value, (int, float)) or not 0 <= value <= 1:
                    errors.append(f"Quality gate {field} must be between 0 and 1, got {value}")

        # Check fail action
        if "fail_action" in quality_gates:
            fail_action = quality_gates["fail_action"]
            if fail_action not in ["warn", "block", "log"]:
                warnings.append(f"Unknown fail_action: {fail_action}")

        return {"errors": errors, "warnings": warnings}

    def _validate_prompt_library(
        self,
        prompt_library: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Validate prompt library."""
        errors = []
        warnings = []

        # Check structure
        expected_sections = ["system_prompts", "task_prompts", "output_formats"]

        for section in expected_sections:
            if section not in prompt_library:
                warnings.append(f"prompt_library missing section: {section}")

        # Validate each prompt template
        for section_name, section in prompt_library.items():
            if not isinstance(section, dict):
                continue

            for prompt_name, prompt_data in section.items():
                if isinstance(prompt_data, dict):
                    # Check for template field
                    if "template" not in prompt_data:
                        errors.append(
                            f"Prompt {section_name}.{prompt_name} missing 'template' field"
                        )

                    # Check variables match template
                    if "template" in prompt_data and "variables" in prompt_data:
                        template = prompt_data["template"]
                        variables = prompt_data["variables"]

                        # Extract {variable} from template
                        import re
                        template_vars = set(re.findall(r'\{(\w+)\}', template))
                        declared_vars = set(variables)

                        # Check for undeclared variables
                        undeclared = template_vars - declared_vars
                        if undeclared:
                            warnings.append(
                                f"Prompt {section_name}.{prompt_name} uses undeclared variables: "
                                f"{undeclared}"
                            )

                        # Check for unused declared variables
                        unused = declared_vars - template_vars
                        if unused:
                            warnings.append(
                                f"Prompt {section_name}.{prompt_name} declares unused variables: "
                                f"{unused}"
                            )

        return {"errors": errors, "warnings": warnings}

    def _is_valid_version(self, version: str) -> bool:
        """Check if version string is valid (semantic versioning)."""
        import re
        pattern = r'^\d+\.\d+\.\d+(-[a-zA-Z0-9]+)?$'
        return bool(re.match(pattern, version))

    def validate_compatibility(
        self,
        config: Dict[str, Any],
        min_version: str = "1.0.0"
    ) -> Dict[str, Any]:
        """
        Validate configuration version compatibility.

        Args:
            config: Configuration dictionary
            min_version: Minimum required version

        Returns:
            Compatibility validation result
        """
        errors = []
        warnings = []

        config_version = config.get("rca_config_version", "0.0.0")

        if not self._is_version_compatible(config_version, min_version):
            errors.append(
                f"Configuration version {config_version} is not compatible with "
                f"minimum required version {min_version}"
            )

        return {
            "compatible": len(errors) == 0,
            "errors": errors,
            "warnings": warnings,
            "config_version": config_version,
            "min_version": min_version
        }

    def _is_version_compatible(self, version: str, min_version: str) -> bool:
        """Check if version meets minimum requirement."""
        def parse_version(v: str) -> tuple:
            parts = v.split('-')[0].split('.')
            return tuple(int(p) for p in parts)

        try:
            v_tuple = parse_version(version)
            min_tuple = parse_version(min_version)
            return v_tuple >= min_tuple
        except:
            return False
