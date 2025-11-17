"""
Unit tests for ConfigLoader and TaskFactory
"""

import pytest
from pathlib import Path

from ca_factory.config_loader import ConfigLoader, TaskDefinition, PromptTemplate
from ca_factory.task_factory import TaskFactory, get_task_registry


class TestConfigLoader:
    """Test ConfigLoader functionality"""

    @pytest.fixture
    def config_loader(self):
        """Create config loader for CLABSI domain"""
        config_dir = Path(__file__).parent.parent.parent / 'configs' / 'projects' / 'clabsi'
        return ConfigLoader(config_dir)

    def test_loader_initialization(self, config_loader):
        """Test that config loader initializes successfully"""
        assert config_loader is not None
        assert config_loader.config_dir.exists()

    def test_load_task_definitions(self, config_loader):
        """Test loading task definitions"""
        assert len(config_loader.task_definitions) > 0

        # Check for new task types
        assert 'enrichment' in config_loader.task_definitions
        assert 'abstraction' in config_loader.task_definitions
        assert 'interrogation_explain' in config_loader.task_definitions
        assert 'interrogation_summarize' in config_loader.task_definitions
        assert 'interrogation_validate' in config_loader.task_definitions

    def test_enrichment_task_definition(self, config_loader):
        """Test enrichment task definition structure"""
        task = config_loader.get_task('enrichment')
        assert task is not None
        assert task.task_id == 'clabsi.enrichment'
        assert task.task_type == 'enrichment'
        assert task.mode == 'batch'
        assert task.prompt_version == 'v2024.11.1'
        assert len(task.dependencies) == 0  # No dependencies
        assert task.prompt_template_key == 'enrichment_prompt'

    def test_abstraction_task_definition(self, config_loader):
        """Test abstraction task definition structure"""
        task = config_loader.get_task('abstraction')
        assert task is not None
        assert task.task_id == 'clabsi.abstraction'
        assert task.task_type == 'abstraction'
        assert task.mode == 'interactive'
        assert 'enrichment' in task.dependencies  # Depends on enrichment

    def test_interrogation_tasks(self, config_loader):
        """Test interrogation task definitions"""
        explain_task = config_loader.get_task('interrogation_explain')
        assert explain_task is not None
        assert explain_task.interrogation_mode == 'explain'
        assert explain_task.task_type == 'interrogation'

        summarize_task = config_loader.get_task('interrogation_summarize')
        assert summarize_task is not None
        assert summarize_task.interrogation_mode == 'summarize'

        validate_task = config_loader.get_task('interrogation_validate')
        assert validate_task is not None
        assert validate_task.interrogation_mode == 'validate'

    def test_deprecated_tasks(self, config_loader):
        """Test that legacy tasks are marked as deprecated"""
        legacy_qa = config_loader.get_task('qa_response')
        assert legacy_qa is not None
        assert legacy_qa.deprecated is True
        assert legacy_qa.replacement_task == 'interrogation_explain'

        legacy_eval = config_loader.get_task('rule_evaluation')
        assert legacy_eval is not None
        assert legacy_eval.deprecated is True
        assert legacy_eval.replacement_task == 'abstraction'

    def test_prompt_versions(self, config_loader):
        """Test prompt version loading"""
        assert len(config_loader.prompt_versions) > 0
        version = config_loader.get_prompt_version('v2024.11.1')
        assert version is not None
        assert version.version_date == '2024-11-17'
        assert len(version.changes) > 0

    def test_prompt_templates(self, config_loader):
        """Test prompt template loading"""
        assert len(config_loader.prompt_templates) > 0

        # Check for new prompts
        enrichment = config_loader.get_prompt_template('enrichment_prompt')
        assert enrichment is not None
        assert len(enrichment.template) > 0
        assert 'patient_section' in enrichment.variables

        abstraction = config_loader.get_prompt_template('abstraction_prompt')
        assert abstraction is not None
        assert 'patient_section' in abstraction.variables
        assert 'enrichment_section' in abstraction.variables

    def test_get_tasks_by_type(self, config_loader):
        """Test filtering tasks by type"""
        interrogation_tasks = config_loader.get_tasks_by_type('interrogation')
        assert len(interrogation_tasks) == 3  # explain, summarize, validate

    def test_get_active_tasks(self, config_loader):
        """Test getting only non-deprecated tasks"""
        active_tasks = config_loader.get_active_tasks()
        deprecated_count = sum(1 for t in config_loader.task_definitions.values() if t.deprecated)
        assert len(active_tasks) == len(config_loader.task_definitions) - deprecated_count

    def test_validate_dependencies(self, config_loader):
        """Test dependency validation"""
        # Abstraction depends on enrichment (should be valid)
        assert config_loader.validate_task_dependencies('abstraction') is True

        # Enrichment has no dependencies (should be valid)
        assert config_loader.validate_task_dependencies('enrichment') is True

    def test_execution_order(self, config_loader):
        """Test getting task execution order"""
        order = config_loader.get_task_execution_order()
        assert len(order) > 0

        # Enrichment should come before abstraction
        enrichment_idx = order.index('enrichment')
        abstraction_idx = order.index('abstraction')
        assert enrichment_idx < abstraction_idx


class TestTaskFactory:
    """Test TaskFactory functionality"""

    @pytest.fixture
    def task_factory(self):
        """Create task factory for CLABSI domain"""
        return TaskFactory(domain='clabsi')

    def test_factory_initialization(self, task_factory):
        """Test that factory initializes successfully"""
        assert task_factory is not None
        assert task_factory.domain == 'clabsi'
        assert task_factory.config_loader is not None

    def test_get_task_definition(self, task_factory):
        """Test getting task definition via factory"""
        task = task_factory.get_task_definition('enrichment')
        assert task is not None
        assert task.task_id == 'clabsi.enrichment'

    def test_list_tasks(self, task_factory):
        """Test listing tasks"""
        tasks = task_factory.list_tasks(include_deprecated=False)
        assert len(tasks) > 0
        assert 'enrichment' in tasks
        assert 'abstraction' in tasks

        # Check that deprecated tasks are excluded by default
        tasks_no_deprecated = task_factory.list_tasks(include_deprecated=False)
        tasks_with_deprecated = task_factory.list_tasks(include_deprecated=True)
        assert len(tasks_with_deprecated) > len(tasks_no_deprecated)

    def test_get_pipeline_tasks(self, task_factory):
        """Test getting pipeline tasks"""
        pipeline = task_factory.get_pipeline_tasks()
        assert pipeline == ['enrichment', 'abstraction']

    def test_get_interrogation_modes(self, task_factory):
        """Test getting interrogation modes"""
        modes = task_factory.get_interrogation_modes()
        assert 'explain' in modes
        assert 'summarize' in modes
        assert 'validate' in modes

    def test_create_task_metadata(self, task_factory):
        """Test creating task metadata"""
        task_def = task_factory.get_task_definition('enrichment')
        metadata = task_factory.create_task_metadata(task_def, executed_by='test_user')

        assert metadata.task_id == 'clabsi.enrichment'
        assert metadata.task_type == 'enrichment'
        assert metadata.executed_by == 'test_user'
        assert metadata.status == 'completed'
        assert metadata.prompt_version == 'v2024.11.1'

    def test_execute_task_validation(self, task_factory):
        """Test task execution validation"""
        # Try to execute deprecated task
        with pytest.raises(ValueError, match="deprecated"):
            task_factory.execute_task('qa_response', {'patient_id': 'test', 'question': 'test'})

        # Try to execute non-existent task
        with pytest.raises(ValueError, match="not found"):
            task_factory.execute_task('non_existent_task', {})

    def test_task_registry(self):
        """Test task registry"""
        registry = get_task_registry()
        assert registry is not None

        # Check that handlers are registered
        handlers = registry.list_handlers()
        assert 'enrichment' in handlers
        assert 'abstraction' in handlers
        assert 'interrogation' in handlers
