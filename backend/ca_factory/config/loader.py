"""
Configuration Loader

Loads and merges all configuration files for a CA Factory project.
"""

import json
import logging
from pathlib import Path
from typing import Dict, Any, Optional, List

logger = logging.getLogger(__name__)


class ConfigLoader:
    """
    Configuration loader for CA Factory projects.

    Loads all configuration files from a project directory and merges them
    into a complete configuration object.
    """

    # Expected config files in order of loading
    CONFIG_FILES = [
        "manifest.json",
        "agent_config.json",
        "prompts.json",
        "tasks.json",
        "rules.json",
        "knowledge_base.json",
        "tools.json",
        "schemas.json",
        "golden_corpus.json"
    ]

    def __init__(self, config_root: Path):
        """
        Initialize config loader.

        Args:
            config_root: Root directory containing project configs
        """
        self.config_root = Path(config_root)
        self._cache: Dict[str, Dict[str, Any]] = {}

        logger.info(f"Config loader initialized with root: {self.config_root}")

    def load_project(
        self,
        project_id: str,
        validate: bool = True
    ) -> Dict[str, Any]:
        """
        Load complete configuration for a project.

        Args:
            project_id: Project identifier (e.g., "clabsi", "cauti")
            validate: Whether to validate configuration

        Returns:
            Complete merged configuration
        """
        project_dir = self.config_root / "projects" / project_id

        if not project_dir.exists():
            raise ValueError(f"Project directory not found: {project_dir}")

        logger.info(f"Loading project configuration: {project_id}")

        # Check cache
        if project_id in self._cache:
            logger.debug(f"Returning cached config for {project_id}")
            return self._cache[project_id]

        config = {}

        # Load each config file
        for config_file in self.CONFIG_FILES:
            file_path = project_dir / config_file

            if file_path.exists():
                try:
                    file_config = self._load_json(file_path)
                    config = self._merge_config(config, file_config)
                    logger.debug(f"Loaded {config_file}")
                except Exception as e:
                    logger.error(f"Failed to load {config_file}: {str(e)}")
                    raise
            else:
                logger.warning(f"Config file not found: {config_file}")

        # Add metadata
        config["_metadata"] = {
            "project_id": project_id,
            "config_root": str(self.config_root),
            "loaded_files": [f for f in self.CONFIG_FILES if (project_dir / f).exists()]
        }

        # Validate if requested
        if validate:
            from ca_factory.config.validator import ConfigValidator
            validator = ConfigValidator()
            validation_result = validator.validate(config)

            if not validation_result["valid"]:
                logger.error(f"Configuration validation failed: {validation_result['errors']}")
                raise ValueError(f"Invalid configuration: {validation_result['errors']}")

        # Cache the config
        self._cache[project_id] = config

        logger.info(f"Successfully loaded configuration for {project_id}")

        return config

    def load_manifest(self, project_id: str) -> Dict[str, Any]:
        """
        Load only the project manifest.

        Args:
            project_id: Project identifier

        Returns:
            Project manifest
        """
        manifest_path = self.config_root / "projects" / project_id / "manifest.json"

        if not manifest_path.exists():
            raise ValueError(f"Manifest not found for project: {project_id}")

        return self._load_json(manifest_path)

    def list_projects(self) -> List[Dict[str, Any]]:
        """
        List all available projects.

        Returns:
            List of project manifests
        """
        projects_dir = self.config_root / "projects"

        if not projects_dir.exists():
            return []

        projects = []

        for project_dir in projects_dir.iterdir():
            if project_dir.is_dir():
                manifest_path = project_dir / "manifest.json"

                if manifest_path.exists():
                    try:
                        manifest = self._load_json(manifest_path)
                        projects.append(manifest)
                    except Exception as e:
                        logger.warning(f"Failed to load manifest for {project_dir.name}: {str(e)}")

        return projects

    def reload_project(self, project_id: str) -> Dict[str, Any]:
        """
        Reload project configuration (clear cache and reload).

        Args:
            project_id: Project identifier

        Returns:
            Reloaded configuration
        """
        if project_id in self._cache:
            del self._cache[project_id]

        return self.load_project(project_id)

    def clear_cache(self) -> None:
        """Clear all cached configurations."""
        self._cache.clear()
        logger.info("Configuration cache cleared")

    def _load_json(self, file_path: Path) -> Dict[str, Any]:
        """Load JSON file."""
        with open(file_path, 'r', encoding='utf-8') as f:
            return json.load(f)

    def _merge_config(
        self,
        base: Dict[str, Any],
        overlay: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Merge two configuration dictionaries.

        Args:
            base: Base configuration
            overlay: Configuration to overlay

        Returns:
            Merged configuration
        """
        merged = base.copy()

        for key, value in overlay.items():
            if key in merged and isinstance(merged[key], dict) and isinstance(value, dict):
                # Recursively merge nested dictionaries
                merged[key] = self._merge_config(merged[key], value)
            else:
                # Override or add new key
                merged[key] = value

        return merged

    def get_agent_profile(
        self,
        project_id: str,
        agent_id: str
    ) -> Optional[Dict[str, Any]]:
        """
        Get specific agent profile from project config.

        Args:
            project_id: Project identifier
            agent_id: Agent identifier

        Returns:
            Agent profile or None
        """
        config = self.load_project(project_id)

        agent_profiles = config.get("agent_profiles", [])

        for profile in agent_profiles:
            if profile.get("agent_id") == agent_id:
                return profile

        return None

    def get_rule(
        self,
        project_id: str,
        rule_id: str
    ) -> Optional[Dict[str, Any]]:
        """
        Get specific rule from rule library.

        Args:
            project_id: Project identifier
            rule_id: Rule identifier

        Returns:
            Rule definition or None
        """
        config = self.load_project(project_id)

        rule_library = config.get("rule_library", {})
        rules = rule_library.get("rules", [])

        for rule in rules:
            if rule.get("rule_id") == rule_id:
                return rule

        return None

    def get_prompt_template(
        self,
        project_id: str,
        template_type: str,
        template_name: str
    ) -> Optional[str]:
        """
        Get prompt template from prompt library.

        Args:
            project_id: Project identifier
            template_type: Type (system_prompts, task_prompts, output_formats)
            template_name: Template name

        Returns:
            Template string or None
        """
        config = self.load_project(project_id)

        prompt_library = config.get("prompt_library", {})
        templates = prompt_library.get(template_type, {})

        template = templates.get(template_name)

        if template and isinstance(template, dict):
            return template.get("template")

        return None
