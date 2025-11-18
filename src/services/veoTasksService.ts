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

export interface VeoTask {
  taskId: string;
  imageUrls: string[];
  prompt: string;
  aspectRatio: '16x9' | '9x16';
  imageCount: number;
  status: 'processing' | 'completed' | 'failed';
  videoUrl?: string;
  errorMessage?: string;
  createdAt: string;
  completedAt?: string;
}

/**
 * Submit batch video generation tasks to Veo API
 */
export async function submitBatchTasks(
  tasks: Array<{
    imageUrls: string[];
    promptCn: string;
    promptEn?: string;
    imageCount: number;
  }>,
  aspectRatio: '16x9' | '9x16'
): Promise<{
  taskIds: string[];
  totalCount: number;
  message: string;
}> {
  const response = await api.post('/veo-tasks/batch', { tasks, aspectRatio });
  return response.data;
}

/**
 * Get user's Veo tasks
 */
export async function getUserTasks(params?: {
  limit?: number;
  offset?: number;
}): Promise<{
  tasks: VeoTask[];
  total: number;
}> {
  const response = await api.get('/veo-tasks', { params });
  return response.data;
}

/**
 * Poll task statuses (used for periodic polling)
 */
export async function pollTasksStatus(taskIds: string[]): Promise<VeoTask[]> {
  // Get all tasks and filter by taskIds
  const { tasks } = await getUserTasks({ limit: 1000 });
  return tasks.filter(task => taskIds.includes(task.taskId));
}

/**
 * Regenerate a task (create a new task with same parameters)
 */
export async function regenerateTask(params: {
  imageUrls: string[];
  promptCn: string;
  promptEn?: string;
  imageCount: number;
  aspectRatio: '16x9' | '9x16';
}): Promise<{ taskId: string }> {
  // Submit as a single task batch
  const response = await api.post('/veo-tasks/batch', {
    tasks: [{
      imageUrls: params.imageUrls,
      promptCn: params.promptCn,
      promptEn: params.promptEn,
      imageCount: params.imageCount
    }],
    aspectRatio: params.aspectRatio
  });

  // Return the first (and only) task ID
  return { taskId: response.data.taskIds[0] };
}
