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

export interface JiMengTask {
  taskId: string;
  imageUrls: string[];
  promptCn: string;
  promptEn?: string;
  imageCount: number;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  videoUrl?: string;
  videoSize?: number;
  errorMessage?: string;
  createdAt: string;
  completedAt?: string;
}

/**
 * Submit batch video generation tasks
 */
export async function submitBatchTasks(
  tasks: Array<{
    imageUrls: string[];
    promptCn: string;
    promptEn?: string;
    imageCount: number;
  }>,
  provider?: 'official' | 'yunwu'
): Promise<{
  taskIds: string[];
  totalCount: number;
  message: string;
}> {
  const response = await api.post('/jimeng-tasks/batch', { tasks, provider });
  return response.data;
}

/**
 * Get user's tasks
 */
export async function getUserTasks(params?: {
  status?: string;
  limit?: number;
  offset?: number;
}): Promise<{
  tasks: JiMengTask[];
  total: number;
  hasMore: boolean;
}> {
  const response = await api.get('/jimeng-tasks', { params });
  return response.data;
}

/**
 * Regenerate a task
 */
export async function regenerateTask(params: {
  imageUrls: string[];
  promptCn: string;
  promptEn?: string;
  imageCount: number;
  provider?: 'official' | 'yunwu';
}): Promise<{
  taskId: string;
  message: string;
}> {
  const response = await api.post('/jimeng-tasks/regenerate', params);
  return response.data;
}

/**
 * Poll tasks status by task IDs
 */
export async function pollTasksStatus(taskIds: string[]): Promise<JiMengTask[]> {
  // Get all tasks and filter by taskIds
  const { tasks } = await getUserTasks({ limit: 1000 });
  return tasks.filter(task => taskIds.includes(task.taskId));
}
