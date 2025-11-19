/**
 * Prompt Explorer Page (Admin / Internal)
 * Phase 1: Read-only Prompt Store UI
 * Shows Concerns → Tasks → Prompt Versions hierarchy
 */

import React, { useState, useEffect } from 'react';
import { Settings, AlertCircle } from 'lucide-react';
import { promptStoreAPI } from '../../api/promptStore';
import { ConcernDefinition, TaskDefinition, PromptVersion } from '../../types';
import { ConcernList } from '../../components/admin/ConcernList';
import { TaskVersionTable } from '../../components/admin/TaskVersionTable';
import { PromptVersionDrawer } from '../../components/admin/PromptVersionDrawer';
import './PromptExplorerPage.css';

const PromptExplorerPage: React.FC = () => {
  const [concerns, setConcerns] = useState<ConcernDefinition[]>([]);
  const [selectedConcernId, setSelectedConcernId] = useState<string | null>(null);
  const [selectedVersion, setSelectedVersion] = useState<PromptVersion | null>(null);
  const [selectedTask, setSelectedTask] = useState<TaskDefinition | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadConcerns();
  }, []);

  const loadConcerns = async () => {
    setLoading(true);
    try {
      const data = await promptStoreAPI.getConcerns();
      setConcerns(data);
      // Auto-select first concern
      if (data.length > 0) {
        setSelectedConcernId(data[0].concern_id);
      }
    } catch (error) {
      console.error('Failed to load concerns:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleVersionClick = (version: PromptVersion, task: TaskDefinition) => {
    setSelectedVersion(version);
    setSelectedTask(task);
  };

  const handleCloseDrawer = () => {
    setSelectedVersion(null);
    setSelectedTask(null);
  };

  const handleUpdate = async () => {
    // Reload concerns to reflect changes
    await loadConcerns();
    // Keep the drawer open but refresh the version data
    if (selectedTask && selectedVersion) {
      const updatedTask = await promptStoreAPI.getTask(selectedTask.task_id);
      if (updatedTask) {
        const updatedVersion = updatedTask.prompt_versions.find(
          v => v.version_id === selectedVersion.version_id
        );
        if (updatedVersion) {
          setSelectedVersion(updatedVersion);
          setSelectedTask(updatedTask);
        }
      }
    }
  };

  const selectedConcern = concerns.find(c => c.concern_id === selectedConcernId);

  if (loading) {
    return (
      <div className="prompt-explorer-page">
        <div className="loading-state">Loading prompt data...</div>
      </div>
    );
  }

  return (
    <div className="prompt-explorer-page">
      {/* Page Header */}
      <div className="page-header">
        <div className="page-header-content">
          <div className="page-title-section">
            <Settings className="page-icon" size={28} />
            <div>
              <h1 className="page-title">Prompt Explorer</h1>
              <p className="page-subtitle">
                Browse concerns, tasks, and prompt versions across the CA Factory platform
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Phase 1 Notice */}
      <div className="phase1-notice">
        <AlertCircle size={18} />
        <span>
          <strong>Phase 1: Read-Only.</strong> Viewing prompt versions and task configurations.
          Editing and version management will be available in Phase 2.
        </span>
      </div>

      {/* Main Content */}
      <div className="explorer-content">
        {/* Left Panel: Concern List */}
        <div className="explorer-sidebar">
          <ConcernList
            concerns={concerns}
            selectedConcernId={selectedConcernId}
            onConcernSelect={setSelectedConcernId}
          />
        </div>

        {/* Right Panel: Task Tables */}
        <div className="explorer-main">
          {selectedConcern ? (
            <div className="tasks-container">
              <div className="tasks-header">
                <h2 className="tasks-title">{selectedConcern.display_name} Tasks</h2>
                <p className="tasks-subtitle">
                  {selectedConcern.tasks.length} task{selectedConcern.tasks.length !== 1 ? 's' : ''} with {selectedConcern.total_versions} total version{selectedConcern.total_versions !== 1 ? 's' : ''}
                </p>
              </div>

              <div className="tasks-list">
                {selectedConcern.tasks.map(task => (
                  <TaskVersionTable
                    key={task.task_id}
                    task={task}
                    onVersionClick={(version) => handleVersionClick(version, task)}
                  />
                ))}
              </div>
            </div>
          ) : (
            <div className="empty-state">
              <p>Select a concern from the left panel to view its tasks and prompt versions.</p>
            </div>
          )}
        </div>
      </div>

      {/* Prompt Version Drawer */}
      {selectedVersion && selectedTask && (
        <PromptVersionDrawer
          version={selectedVersion}
          task={selectedTask}
          onClose={handleCloseDrawer}
          onUpdate={handleUpdate}
        />
      )}
    </div>
  );
};

export default PromptExplorerPage;
