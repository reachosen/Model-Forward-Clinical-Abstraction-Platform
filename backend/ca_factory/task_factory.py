"""
Task Factory for CA Factory
Dynamically creates and registers tasks based on configuration
"""

from typing import Dict, Any, Callable, Optional, List
from dataclasses import dataclass
from datetime import datetime
import uuid

from .config_loader import ConfigLoader, TaskDefinition, get_config_loader


@dataclass
class TaskMetadata:
    """Task execution metadata"""
    task_id: str
    task_type: str
    prompt_version: str
    mode: str
    executed_at: str
    executed_by: str
    status: str
    duration_ms: Optional[int] = None
    token_count: Optional[int] = None


class TaskRegistry:
    """Registry for task handlers"""

    def __init__(self):
        self._handlers: Dict[str, Callable] = {}
        self._config_loader: Optional[ConfigLoader] = None

    def register(self, task_type: str, handler: Callable):
        """
        Register a handler for a task type

        Args:
            task_type: Type of task (enrichment, abstraction, interrogation, etc.)
            handler: Function to handle task execution
        """
        self._handlers[task_type] = handler

    def get_handler(self, task_type: str) -> Optional[Callable]:
        """Get handler for a task type"""
        return self._handlers.get(task_type)

    def set_config_loader(self, loader: ConfigLoader):
        """Set the config loader"""
        self._config_loader = loader

    def get_config_loader(self) -> ConfigLoader:
        """Get the config loader"""
        if self._config_loader is None:
            self._config_loader = get_config_loader()
        return self._config_loader

    def list_handlers(self) -> List[str]:
        """List all registered task types"""
        return list(self._handlers.keys())


# Global task registry
_task_registry = TaskRegistry()


def get_task_registry() -> TaskRegistry:
    """Get the global task registry"""
    return _task_registry


def register_task(task_type: str):
    """
    Decorator to register a task handler

    Usage:
        @register_task('enrichment')
        def handle_enrichment(task_def, inputs):
            # ... implementation
            return outputs
    """
    def decorator(func: Callable):
        _task_registry.register(task_type, func)
        return func
    return decorator


class TaskFactory:
    """Factory for creating and executing tasks"""

    def __init__(self, domain: str = 'clabsi'):
        """
        Initialize task factory

        Args:
            domain: Domain name (clabsi, cauti, etc.)
        """
        self.domain = domain
        self.config_loader = get_config_loader(domain)
        self.registry = get_task_registry()
        self.registry.set_config_loader(self.config_loader)

    def create_task_metadata(
        self,
        task_def: TaskDefinition,
        executed_by: str = 'system',
        status: str = 'completed'
    ) -> TaskMetadata:
        """
        Create task metadata

        Args:
            task_def: Task definition
            executed_by: Who executed the task
            status: Task status (completed, in_progress, failed)

        Returns:
            TaskMetadata instance
        """
        return TaskMetadata(
            task_id=task_def.task_id,
            task_type=task_def.task_type,
            prompt_version=task_def.prompt_version,
            mode=task_def.mode,
            executed_at=datetime.utcnow().isoformat() + 'Z',
            executed_by=executed_by,
            status=status
        )

    def execute_task(
        self,
        task_name: str,
        inputs: Dict[str, Any],
        executed_by: str = 'system'
    ) -> Dict[str, Any]:
        """
        Execute a task by name

        Args:
            task_name: Name of task to execute
            inputs: Input data for task
            executed_by: Who is executing the task

        Returns:
            Task outputs including task_metadata

        Raises:
            ValueError: If task not found or handler not registered
        """
        # Get task definition
        task_def = self.config_loader.get_task(task_name)
        if not task_def:
            raise ValueError(f"Task not found: {task_name}")

        # Check if deprecated
        if task_def.deprecated:
            replacement = task_def.replacement_task or 'unknown'
            raise ValueError(
                f"Task '{task_name}' is deprecated. Use '{replacement}' instead."
            )

        # Validate dependencies
        if not self.config_loader.validate_task_dependencies(task_name):
            raise ValueError(f"Task '{task_name}' has missing dependencies")

        # Get handler
        handler = self.registry.get_handler(task_def.task_type)
        if not handler:
            raise ValueError(
                f"No handler registered for task type '{task_def.task_type}'. "
                f"Available types: {self.registry.list_handlers()}"
            )

        # Validate inputs (basic validation)
        self._validate_inputs(task_def, inputs)

        # Execute handler
        start_time = datetime.utcnow()
        try:
            outputs = handler(task_def, inputs, self.config_loader)
            status = 'completed'
        except Exception as e:
            status = 'failed'
            raise

        # Calculate duration
        end_time = datetime.utcnow()
        duration_ms = int((end_time - start_time).total_seconds() * 1000)

        # Create task metadata
        task_metadata = self.create_task_metadata(task_def, executed_by, status)
        task_metadata.duration_ms = duration_ms

        # Add metadata to outputs
        if isinstance(outputs, dict):
            outputs['task_metadata'] = task_metadata.__dict__
        else:
            outputs = {
                'result': outputs,
                'task_metadata': task_metadata.__dict__
            }

        return outputs

    def execute_interrogation(
        self,
        mode: str,
        task_id: str,
        question: str,
        interrogation_context: Dict[str, Any],
        executed_by: str = 'user'
    ) -> Dict[str, Any]:
        """
        Execute an interrogation task

        Args:
            mode: Interrogation mode (explain, summarize, validate)
            task_id: ID of task being interrogated
            question: Question to answer
            interrogation_context: Context for interrogation
            executed_by: Who is asking the question

        Returns:
            QA history entry with answer and metadata
        """
        # Get appropriate interrogation task
        task_name = f'interrogation_{mode}'
        task_def = self.config_loader.get_task(task_name)
        if not task_def:
            raise ValueError(f"Interrogation mode not supported: {mode}")

        # Build inputs
        inputs = {
            'task_id': task_id,
            'question': question,
            'interrogation_context': interrogation_context
        }

        # Execute task
        return self.execute_task(task_name, inputs, executed_by)

    def _validate_inputs(self, task_def: TaskDefinition, inputs: Dict[str, Any]):
        """
        Validate task inputs against definition

        Args:
            task_def: Task definition
            inputs: Input data

        Raises:
            ValueError: If validation fails
        """
        for input_name, input_spec in task_def.inputs.items():
            is_required = input_spec.get('required', False)
            if is_required and input_name not in inputs:
                raise ValueError(
                    f"Required input missing for task '{task_def.task_id}': {input_name}"
                )

    def get_task_definition(self, task_name: str) -> Optional[TaskDefinition]:
        """Get task definition by name"""
        return self.config_loader.get_task(task_name)

    def list_tasks(self, include_deprecated: bool = False) -> List[str]:
        """
        List available tasks

        Args:
            include_deprecated: Whether to include deprecated tasks

        Returns:
            List of task names
        """
        tasks = []
        for name, task_def in self.config_loader.task_definitions.items():
            if include_deprecated or not task_def.deprecated:
                tasks.append(name)
        return tasks

    def get_pipeline_tasks(self) -> List[str]:
        """Get tasks for the standard pipeline (enrichment -> abstraction)"""
        return ['enrichment', 'abstraction']

    def get_interrogation_modes(self) -> List[str]:
        """Get available interrogation modes"""
        tasks = self.config_loader.get_interrogation_tasks()
        return list(tasks.keys())


# Example task handlers (to be implemented)

@register_task('enrichment')
def handle_enrichment_task(
    task_def: TaskDefinition,
    inputs: Dict[str, Any],
    config_loader: ConfigLoader
) -> Dict[str, Any]:
    """
    Handle enrichment task

    NOTE: This is a placeholder. Real implementation would call AI model.
    """
    # This would call the actual enrichment logic
    # For now, return a placeholder structure
    return {
        'signal_groups': [],
        'timeline_phases': [],
        'summary': {
            'signals_identified': 0,
            'key_findings': [],
            'confidence': 0.0
        }
    }


@register_task('abstraction')
def handle_abstraction_task(
    task_def: TaskDefinition,
    inputs: Dict[str, Any],
    config_loader: ConfigLoader
) -> Dict[str, Any]:
    """
    Handle abstraction task

    NOTE: This is a placeholder. Real implementation would call AI model.
    """
    # This would call the actual abstraction logic
    return {
        'narrative': '',
        'criteria_evaluation': {
            'determination': 'CLABSI_POSSIBLE',
            'confidence': 0.0,
            'criteria_met': {},
            'total_criteria': 0,
            'criteria_met_count': 0
        },
        'exclusion_analysis': []
    }


@register_task('interrogation')
def handle_interrogation_task(
    task_def: TaskDefinition,
    inputs: Dict[str, Any],
    config_loader: ConfigLoader
) -> Dict[str, Any]:
    """
    Handle interrogation task (explain, summarize, validate)

    NOTE: This is a placeholder. Real implementation would call AI model.
    """
    # Generate unique QA ID
    qa_id = f"qa-{uuid.uuid4().hex[:12]}"

    # Get interrogation context
    context = inputs.get('interrogation_context', {})

    # This would call the actual interrogation logic
    qa_entry = {
        'qa_id': qa_id,
        'question': inputs.get('question', ''),
        'answer': 'Placeholder answer. Real implementation would call AI model.',
        'interrogation_context': context,
        'citations': [],
        'confidence': 0.85
    }

    return {'qa_entry': qa_entry}
