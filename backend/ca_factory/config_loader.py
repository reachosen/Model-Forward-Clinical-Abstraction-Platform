"""
Configuration Loader for CA Factory
Loads and validates task definitions, prompts, and prompt versions
"""

import json
from pathlib import Path
from typing import Dict, Any, List, Optional
from dataclasses import dataclass


@dataclass
class TaskDefinition:
    """Represents a task definition from config"""
    task_id: str
    task_type: str
    description: str
    mode: str
    prompt_version: str
    inputs: Dict[str, Any]
    outputs: Dict[str, Any]
    success_criteria: Dict[str, Any]
    dependencies: List[str]
    prompt_template_key: str
    deprecated: bool = False
    replacement_task: Optional[str] = None
    interrogation_mode: Optional[str] = None

    @classmethod
    def from_dict(cls, task_name: str, data: Dict[str, Any]) -> 'TaskDefinition':
        """Create TaskDefinition from config dictionary"""
        return cls(
            task_id=data.get('task_id', f'unknown.{task_name}'),
            task_type=data.get('task_type', 'unknown'),
            description=data.get('description', ''),
            mode=data.get('mode', 'batch'),
            prompt_version=data.get('prompt_version', 'v1.0.0'),
            inputs=data.get('inputs', {}),
            outputs=data.get('outputs', {}),
            success_criteria=data.get('success_criteria', {}),
            dependencies=data.get('dependencies', []),
            prompt_template_key=data.get('prompt_template_key', ''),
            deprecated=data.get('deprecated', False),
            replacement_task=data.get('replacement_task'),
            interrogation_mode=data.get('interrogation_mode')
        )


@dataclass
class PromptTemplate:
    """Represents a prompt template from config"""
    template: str
    variables: List[str]
    schema: Optional[Dict[str, Any]] = None

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'PromptTemplate':
        """Create PromptTemplate from config dictionary"""
        return cls(
            template=data.get('template', ''),
            variables=data.get('variables', []),
            schema=data.get('schema')
        )


@dataclass
class PromptVersion:
    """Represents a prompt version metadata"""
    version: str
    version_date: str
    description: str
    changes: List[str]

    @classmethod
    def from_dict(cls, version: str, data: Dict[str, Any]) -> 'PromptVersion':
        """Create PromptVersion from config dictionary"""
        return cls(
            version=version,
            version_date=data.get('version_date', ''),
            description=data.get('description', ''),
            changes=data.get('changes', [])
        )


class ConfigLoader:
    """Loads and manages CA Factory configuration"""

    def __init__(self, config_dir: Path):
        """
        Initialize config loader

        Args:
            config_dir: Path to configs/projects/{domain}/ directory
        """
        self.config_dir = Path(config_dir)
        self.tasks_config: Dict[str, Any] = {}
        self.prompts_config: Dict[str, Any] = {}
        self.manifest: Dict[str, Any] = {}

        # Loaded data
        self.task_definitions: Dict[str, TaskDefinition] = {}
        self.prompt_templates: Dict[str, PromptTemplate] = {}
        self.prompt_versions: Dict[str, PromptVersion] = {}

        # Load all configs
        self._load_configs()

    def _load_configs(self):
        """Load all configuration files"""
        # Load tasks
        tasks_file = self.config_dir / 'tasks.json'
        if tasks_file.exists():
            with open(tasks_file, 'r') as f:
                self.tasks_config = json.load(f)
            self._parse_tasks()

        # Load prompts
        prompts_file = self.config_dir / 'prompts.json'
        if prompts_file.exists():
            with open(prompts_file, 'r') as f:
                self.prompts_config = json.load(f)
            self._parse_prompts()

        # Load manifest
        manifest_file = self.config_dir / 'manifest.json'
        if manifest_file.exists():
            with open(manifest_file, 'r') as f:
                self.manifest = json.load(f)

    def _parse_tasks(self):
        """Parse task definitions from config"""
        task_defs = self.tasks_config.get('task_definitions', {})
        for task_name, task_data in task_defs.items():
            self.task_definitions[task_name] = TaskDefinition.from_dict(task_name, task_data)

        # Parse prompt versions
        prompt_versions = self.tasks_config.get('prompt_versions', {})
        for version, version_data in prompt_versions.items():
            self.prompt_versions[version] = PromptVersion.from_dict(version, version_data)

    def _parse_prompts(self):
        """Parse prompt templates from config"""
        prompt_lib = self.prompts_config.get('prompt_library', {})

        # System prompts
        system_prompts = prompt_lib.get('system_prompts', {})
        for name, data in system_prompts.items():
            self.prompt_templates[f'system.{name}'] = PromptTemplate.from_dict(data)

        # Task prompts
        task_prompts = prompt_lib.get('task_prompts', {})
        for name, data in task_prompts.items():
            self.prompt_templates[name] = PromptTemplate.from_dict(data)

        # Output formats
        output_formats = prompt_lib.get('output_formats', {})
        for name, data in output_formats.items():
            self.prompt_templates[f'output.{name}'] = PromptTemplate.from_dict(data)

    def get_task(self, task_name: str) -> Optional[TaskDefinition]:
        """Get task definition by name"""
        return self.task_definitions.get(task_name)

    def get_prompt_template(self, template_key: str) -> Optional[PromptTemplate]:
        """Get prompt template by key"""
        return self.prompt_templates.get(template_key)

    def get_prompt_version(self, version: str) -> Optional[PromptVersion]:
        """Get prompt version metadata"""
        return self.prompt_versions.get(version)

    def get_tasks_by_type(self, task_type: str) -> List[TaskDefinition]:
        """Get all tasks of a specific type"""
        return [
            task for task in self.task_definitions.values()
            if task.task_type == task_type
        ]

    def get_tasks_by_version(self, version: str) -> List[TaskDefinition]:
        """Get all tasks using a specific prompt version"""
        return [
            task for task in self.task_definitions.values()
            if task.prompt_version == version
        ]

    def get_active_tasks(self) -> List[TaskDefinition]:
        """Get all non-deprecated tasks"""
        return [
            task for task in self.task_definitions.values()
            if not task.deprecated
        ]

    def get_interrogation_tasks(self) -> Dict[str, TaskDefinition]:
        """Get all interrogation tasks grouped by mode"""
        tasks = {}
        for task in self.task_definitions.values():
            if task.task_type == 'interrogation' and task.interrogation_mode:
                tasks[task.interrogation_mode] = task
        return tasks

    def validate_task_dependencies(self, task_name: str) -> bool:
        """Validate that all task dependencies exist"""
        task = self.get_task(task_name)
        if not task:
            return False

        for dep in task.dependencies:
            if dep not in self.task_definitions:
                return False
        return True

    def get_task_execution_order(self) -> List[str]:
        """Get task names in dependency-aware execution order"""
        visited = set()
        order = []

        def visit(task_name: str):
            if task_name in visited:
                return
            visited.add(task_name)

            task = self.get_task(task_name)
            if task:
                for dep in task.dependencies:
                    visit(dep)
            order.append(task_name)

        for task_name in self.task_definitions.keys():
            visit(task_name)

        return order

    def render_prompt(self, template_key: str, variables: Dict[str, Any]) -> str:
        """Render a prompt template with variables"""
        template = self.get_prompt_template(template_key)
        if not template:
            raise ValueError(f"Prompt template not found: {template_key}")

        # Simple variable substitution
        rendered = template.template
        for var_name, var_value in variables.items():
            placeholder = f'{{{var_name}}}'
            rendered = rendered.replace(placeholder, str(var_value))

        return rendered

    def get_config_version(self) -> str:
        """Get overall config version"""
        return self.tasks_config.get('version', '1.0.0')

    def get_project_info(self) -> Dict[str, Any]:
        """Get project manifest information"""
        return self.manifest.get('project_manifest', {})


# Global config loader instance
_config_loader: Optional[ConfigLoader] = None


def get_config_loader(domain: str = 'clabsi') -> ConfigLoader:
    """
    Get or create config loader instance

    Args:
        domain: Domain name (clabsi, cauti, etc.)

    Returns:
        ConfigLoader instance
    """
    global _config_loader
    if _config_loader is None:
        config_dir = Path(__file__).parent.parent / 'configs' / 'projects' / domain
        _config_loader = ConfigLoader(config_dir)
    return _config_loader


def reload_config(domain: str = 'clabsi') -> ConfigLoader:
    """
    Force reload of configuration

    Args:
        domain: Domain name

    Returns:
        New ConfigLoader instance
    """
    global _config_loader
    config_dir = Path(__file__).parent.parent / 'configs' / 'projects' / domain
    _config_loader = ConfigLoader(config_dir)
    return _config_loader
