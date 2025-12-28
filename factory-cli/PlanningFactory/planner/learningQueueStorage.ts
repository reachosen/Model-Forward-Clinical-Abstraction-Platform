/**
 * Learning Queue Storage
 *
 * Simple JSON file-based storage for learning queue items.
 * In production, this could be replaced with a database.
 */

import * as fs from 'fs';
import * as path from 'path';
import { LearningQueueItem } from '../../models/LearningQueue';

const QUEUE_DIR = path.join(__dirname, '..', 'learning_queue');
const QUEUE_FILE = path.join(QUEUE_DIR, 'queue.json');

/**
 * Ensure learning queue directory exists
 */
function ensureQueueDirectory(): void {
  if (!fs.existsSync(QUEUE_DIR)) {
    fs.mkdirSync(QUEUE_DIR, { recursive: true });
  }
}

/**
 * Load all learning queue items from storage
 */
export function loadLearningQueue(): LearningQueueItem[] {
  ensureQueueDirectory();

  if (!fs.existsSync(QUEUE_FILE)) {
    return [];
  }

  try {
    const content = fs.readFileSync(QUEUE_FILE, 'utf-8');
    const items = JSON.parse(content);
    return Array.isArray(items) ? items : [];
  } catch (error) {
    console.error('Error loading learning queue:', error);
    return [];
  }
}

/**
 * Save learning queue items to storage
 */
export function saveLearningQueue(items: LearningQueueItem[]): void {
  ensureQueueDirectory();

  try {
    const content = JSON.stringify(items, null, 2);
    fs.writeFileSync(QUEUE_FILE, content, 'utf-8');
  } catch (error) {
    console.error('Error saving learning queue:', error);
    throw error;
  }
}

/**
 * Add a new item to the learning queue
 */
export function enqueueLearningItem(item: LearningQueueItem): void {
  const queue = loadLearningQueue();
  queue.push(item);
  saveLearningQueue(queue);
}

/**
 * Update an existing learning queue item
 */
export function updateLearningItem(updatedItem: LearningQueueItem): void {
  const queue = loadLearningQueue();
  const index = queue.findIndex(item => item.id === updatedItem.id);

  if (index === -1) {
    throw new Error(`Learning queue item not found: ${updatedItem.id}`);
  }

  queue[index] = updatedItem;
  saveLearningQueue(queue);
}

/**
 * Find a specific learning queue item by ID
 */
export function findLearningItem(id: string): LearningQueueItem | null {
  const queue = loadLearningQueue();
  return queue.find(item => item.id === id) || null;
}

/**
 * Get learning queue items by status
 */
export function getItemsByStatus(status: LearningQueueItem['status']): LearningQueueItem[] {
  const queue = loadLearningQueue();
  return queue.filter(item => item.status === status);
}

/**
 * Get learning queue items by archetype and domain
 */
export function getItemsByArchetypeAndDomain(archetype: string, domain: string): LearningQueueItem[] {
  const queue = loadLearningQueue();
  return queue.filter(item => item.archetype === archetype && item.domain === domain);
}

/**
 * Delete a learning queue item
 */
export function deleteLearningItem(id: string): void {
  const queue = loadLearningQueue();
  const filtered = queue.filter(item => item.id !== id);

  if (filtered.length === queue.length) {
    throw new Error(`Learning queue item not found: ${id}`);
  }

  saveLearningQueue(filtered);
}

/**
 * Get summary statistics for the learning queue
 */
export function getQueueSummary(): {
  total: number;
  by_status: Record<string, number>;
  by_archetype: Record<string, number>;
} {
  const queue = loadLearningQueue();

  const by_status: Record<string, number> = {
    pending: 0,
    draft_proposed: 0,
    patched: 0,
    discarded: 0,
  };

  const by_archetype: Record<string, number> = {};

  queue.forEach(item => {
    by_status[item.status] = (by_status[item.status] || 0) + 1;
    by_archetype[item.archetype] = (by_archetype[item.archetype] || 0) + 1;
  });

  return {
    total: queue.length,
    by_status,
    by_archetype,
  };
}
