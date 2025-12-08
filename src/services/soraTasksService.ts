import axios from 'axios';
import { API_URL } from '../config/api';

// Get auth token
const getAuthToken = () => {
  return localStorage.getItem('token') || '';
};

// Create axios instance with auth
const api = axios.create({
  baseURL: API_URL
});

// Add auth token to requests
api.interceptors.request.use((config) => {
  const token = getAuthToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  // Only set Content-Type for JSON requests
  if (config.data && !(config.data instanceof FormData)) {
    config.headers['Content-Type'] = 'application/json';
  }

  return config;
});

export interface SoraTask {
  taskId: string;
  imageUrl: string;
  prompt: string;
  aspectRatio: '16x9' | '9x16';
  status: 'processing' | 'completed' | 'failed';
  videoUrl?: string;
  errorMessage?: string;
  createdAt: string;
  completedAt?: string;
}

/**
 * Submit batch video generation tasks to Sora API
 * Sora only supports single image, so tasks only have imageUrl (not imageUrls array)
 */
export async function submitBatchTasks(
  tasks: Array<{
    imageUrl?: string;  // Optional: support text-only generation
    promptCn: string;
    promptEn?: string;
  }>,
  aspectRatio: '16x9' | '9x16'
): Promise<{
  taskIds: string[];
  totalCount: number;
  message: string;
}> {
  const response = await api.post('/sora-tasks/batch', { tasks, aspectRatio });
  return response.data;
}

/**
 * Get user's Sora tasks
 */
export async function getUserTasks(params?: {
  limit?: number;
  offset?: number;
}): Promise<{
  tasks: SoraTask[];
  total: number;
}> {
  const response = await api.get('/sora-tasks', { params });
  return response.data;
}

/**
 * Poll task statuses (used for periodic polling)
 */
export async function pollTasksStatus(taskIds: string[]): Promise<SoraTask[]> {
  // Get all tasks and filter by taskIds
  const { tasks } = await getUserTasks({ limit: 1000 });
  return tasks.filter(task => taskIds.includes(task.taskId));
}

/**
 * Regenerate a task (create a new task with same parameters)
 * Note: Sora only supports single image
 */
export async function regenerateTask(params: {
  imageUrl: string;
  promptCn: string;
  promptEn?: string;
  aspectRatio: '16x9' | '9x16';
}): Promise<{ taskId: string }> {
  // Submit as a single task batch
  const response = await api.post('/sora-tasks/batch', {
    tasks: [{
      imageUrl: params.imageUrl,
      promptCn: params.promptCn,
      promptEn: params.promptEn
    }],
    aspectRatio: params.aspectRatio
  });

  // Return the first (and only) task ID
  return { taskId: response.data.taskIds[0] };
}