"""
Project Manager

Manages CA Factory project creation, templates, and lifecycle.
"""

import json
import logging
import shutil
from pathlib import Path
from typing import Dict, Any, Optional, List
from datetime import datetime

from ca_factory.config.loader import ConfigLoader
from ca_factory.config.validator import ConfigValidator

logger = logging.getLogger(__name__)


class ProjectManager:
    """
    Project manager for CA Factory.

    Handles project creation, initialization from templates, and project lifecycle.
    """

    def __init__(self, config_root: Path):
        """
        Initialize project manager.

        Args:
            config_root: Root directory for configurations
        """
        self.config_root = Path(config_root)
        self.projects_dir = self.config_root / "projects"
        self.templates_dir = self.config_root / "templates"

        self.loader = ConfigLoader(config_root)
        self.validator = ConfigValidator()

        # Ensure directories exist
        self.projects_dir.mkdir(parents=True, exist_ok=True)
        self.templates_dir.mkdir(parents=True, exist_ok=True)

        logger.info(f"Project manager initialized with root: {self.config_root}")

    def create_project(
        self,
        project_id: str,
        project_name: str,
        domain: str,
        description: str = "",
        template: str = "default",
        **kwargs
    ) -> Dict[str, Any]:
        """
        Create a new CA Factory project.

        Args:
            project_id: Unique project identifier (e.g., "cauti")
            project_name: Human-readable project name
            domain: Domain name (e.g., "Healthcare-Acquired Conditions")
            description: Project description
            template: Template to use (default: "default")
            **kwargs: Additional project parameters

        Returns:
            Created project manifest
        """
        # Check if project already exists
        project_dir = self.projects_dir / project_id

        if project_dir.exists():
            raise ValueError(f"Project already exists: {project_id}")

        logger.info(f"Creating new project: {project_id}")

        # Create project directory
        project_dir.mkdir(parents=True, exist_ok=True)

        # Load template
        template_dir = self.templates_dir / template

        if template_dir.exists():
            logger.info(f"Using template: {template}")
            self._copy_template(template_dir, project_dir)
        else:
            logger.info(f"Template not found, creating from scratch")
            self._create_default_structure(project_dir)

        # Create manifest
        manifest = self._create_manifest(
            project_id=project_id,
            project_name=project_name,
            domain=domain,
            description=description,
            **kwargs
        )

        # Write manifest
        manifest_path = project_dir / "manifest.json"
        self._write_json(manifest_path, manifest)

        logger.info(f"Project created successfully: {project_id}")

        return manifest

    def create_from_template(
        self,
        project_id: str,
        template: str,
        replacements: Optional[Dict[str, str]] = None
    ) -> Dict[str, Any]:
        """
        Create a new project from a template with variable replacement.

        Args:
            project_id: New project identifier
            template: Template name
            replacements: Variable replacements (e.g., {"DOMAIN": "CAUTI"})

        Returns:
            Created project manifest
        """
        template_dir = self.templates_dir / template

        if not template_dir.exists():
            raise ValueError(f"Template not found: {template}")

        project_dir = self.projects_dir / project_id

        if project_dir.exists():
            raise ValueError(f"Project already exists: {project_id}")

        logger.info(f"Creating project {project_id} from template {template}")

        # Copy template files
        self._copy_template(template_dir, project_dir)

        # Apply replacements
        if replacements:
            self._apply_replacements(project_dir, replacements)

        # Load and return manifest
        manifest = self.loader.load_manifest(project_id)

        logger.info(f"Project created from template: {project_id}")

        return manifest

    def list_projects(self) -> List[Dict[str, Any]]:
        """
        List all available projects.

        Returns:
            List of project manifests
        """
        return self.loader.list_projects()

    def get_project(self, project_id: str) -> Dict[str, Any]:
        """
        Get complete configuration for a project.

        Args:
            project_id: Project identifier

        Returns:
            Complete project configuration
        """
        return self.loader.load_project(project_id)

    def validate_project(self, project_id: str) -> Dict[str, Any]:
        """
        Validate a project configuration.

        Args:
            project_id: Project identifier

        Returns:
            Validation result
        """
        config = self.loader.load_project(project_id, validate=False)
        return self.validator.validate(config)

    def delete_project(
        self,
        project_id: str,
        confirm: bool = False
    ) -> None:
        """
        Delete a project (use with caution).

        Args:
            project_id: Project identifier
            confirm: Must be True to actually delete
        """
        if not confirm:
            raise ValueError("Must set confirm=True to delete project")

        project_dir = self.projects_dir / project_id

        if not project_dir.exists():
            raise ValueError(f"Project not found: {project_id}")

        logger.warning(f"Deleting project: {project_id}")
        shutil.rmtree(project_dir)
        logger.info(f"Project deleted: {project_id}")

    def export_project(
        self,
        project_id: str,
        output_path: Path
    ) -> None:
        """
        Export a project to a directory.

        Args:
            project_id: Project identifier
            output_path: Output directory path
        """
        project_dir = self.projects_dir / project_id

        if not project_dir.exists():
            raise ValueError(f"Project not found: {project_id}")

        output_path = Path(output_path)
        output_path.mkdir(parents=True, exist_ok=True)

        logger.info(f"Exporting project {project_id} to {output_path}")
        shutil.copytree(project_dir, output_path / project_id, dirs_exist_ok=True)
        logger.info("Export complete")

    def _copy_template(self, template_dir: Path, project_dir: Path) -> None:
        """Copy template files to project directory."""
        for item in template_dir.iterdir():
            if item.is_file():
                shutil.copy2(item, project_dir / item.name)
            elif item.is_dir():
                shutil.copytree(item, project_dir / item.name, dirs_exist_ok=True)

    def _create_default_structure(self, project_dir: Path) -> None:
        """Create default project structure."""
        # Create empty config files
        for config_file in ConfigLoader.CONFIG_FILES:
            if config_file != "manifest.json":
                file_path = project_dir / config_file

                # Create minimal structure for each file type
                if config_file == "agent_config.json":
                    content = {
                        "agent_profiles": [],
                        "core_memory_max_tokens": 8000,
                        "quality_gates": {}
                    }
                elif config_file == "prompts.json":
                    content = {
                        "prompt_library": {
                            "system_prompts": {},
                            "task_prompts": {},
                            "output_formats": {}
                        }
                    }
                elif config_file == "tasks.json":
                    content = {"task_definitions": {}}
                elif config_file == "rules.json":
                    content = {"rule_library": {"rules": []}}
                elif config_file == "knowledge_base.json":
                    content = {"knowledge_base": {"chunks": []}}
                elif config_file == "tools.json":
                    content = {"tool_catalog": {"tools": []}}
                elif config_file == "schemas.json":
                    content = {"data_schemas": {}}
                elif config_file == "golden_corpus.json":
                    content = {"golden_corpus": {"test_cases": []}}
                else:
                    content = {}

                self._write_json(file_path, content)

    def _create_manifest(
        self,
        project_id: str,
        project_name: str,
        domain: str,
        description: str = "",
        **kwargs
    ) -> Dict[str, Any]:
        """Create project manifest."""
        manifest = {
            "project_manifest": {
                "project_id": project_id,
                "project_name": project_name,
                "domain": domain,
                "version": "1.0.0",
                "description": description,
                "owner": kwargs.get("owner", ""),
                "created_date": datetime.utcnow().strftime("%Y-%m-%d"),
                "data_sources": kwargs.get("data_sources", []),
                "output_formats": kwargs.get("output_formats", [])
            }
        }

        # Add domain info
        manifest["project_domain"] = project_id.upper()
        manifest["domain_version"] = "2024.1"
        manifest["rca_config_version"] = "1.0.0"

        return manifest

    def _apply_replacements(
        self,
        project_dir: Path,
        replacements: Dict[str, str]
    ) -> None:
        """Apply variable replacements to all JSON files."""
        for file_path in project_dir.glob("*.json"):
            content = self._load_json(file_path)
            replaced = self._replace_variables(content, replacements)
            self._write_json(file_path, replaced)

    def _replace_variables(
        self,
        obj: Any,
        replacements: Dict[str, str]
    ) -> Any:
        """Recursively replace variables in object."""
        if isinstance(obj, str):
            for key, value in replacements.items():
                obj = obj.replace(f"{{{key}}}", value)
            return obj
        elif isinstance(obj, dict):
            return {k: self._replace_variables(v, replacements) for k, v in obj.items()}
        elif isinstance(obj, list):
            return [self._replace_variables(item, replacements) for item in obj]
        else:
            return obj

    def _load_json(self, file_path: Path) -> Dict[str, Any]:
        """Load JSON file."""
        with open(file_path, 'r', encoding='utf-8') as f:
            return json.load(f)

    def _write_json(
        self,
        file_path: Path,
        data: Dict[str, Any],
        indent: int = 2
    ) -> None:
        """Write JSON file."""
        with open(file_path, 'w', encoding='utf-8') as f:
            json.dump(data, f, indent=indent, ensure_ascii=False)
