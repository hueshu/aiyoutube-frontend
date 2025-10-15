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

export interface HailuoTask {
  taskId: string;
  imageUrls: string[];
  promptCn: string;
  promptEn?: string;
  imageCount: number;
  status: 'pending' | 'locked' | 'processing' | 'completed' | 'failed';
  videoUrl?: string;
  videoSize?: number;
  errorMessage?: string;
  createdAt: string;
  completedAt?: string;
}

/**
 * Upload single image to R2
 */
export async function uploadImage(imageFile: File): Promise<{ imageUrl: string; imageSize: number }> {
  const formData = new FormData();
  formData.append('image', imageFile);

  const response = await api.post('/hailuo-images/upload', formData);

  return response.data;
}

/**
 * Upload multiple images to R2
 */
export async function uploadImagesBatch(imageFiles: File[]): Promise<{
  results: Array<{ imageUrl: string; imageSize: number; originalName: string } | { error: string }>;
  successCount: number;
  totalCount: number;
}> {
  const formData = new FormData();
  imageFiles.forEach((file) => {
    formData.append('images', file);
  });

  const response = await api.post('/hailuo-images/upload-batch', formData);

  return response.data;
}

/**
 * Submit batch video generation tasks
 */
export async function submitBatchTasks(tasks: Array<{
  imageUrls: string[];
  promptCn: string;
  promptEn?: string;
  imageCount: number;
}>): Promise<{
  taskIds: string[];
  totalCount: number;
  message: string;
}> {
  const response = await api.post('/hailuo-tasks/batch', { tasks });
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
  tasks: HailuoTask[];
  total: number;
  hasMore: boolean;
}> {
  const response = await api.get('/hailuo-tasks', { params });
  return response.data;
}

/**
 * Regenerate a task (insert to front of queue)
 */
export async function regenerateTask(params: {
  imageUrls: string[];
  promptCn: string;
  promptEn?: string;
  imageCount: number;
}): Promise<{
  taskId: string;
  message: string;
}> {
  const response = await api.post('/hailuo-tasks/regenerate', params);
  return response.data;
}

/**
 * Poll tasks status by task IDs
 */
export async function pollTasksStatus(taskIds: string[]): Promise<HailuoTask[]> {
  // Get all tasks and filter by taskIds
  const { tasks } = await getUserTasks({ limit: 1000 });
  return tasks.filter(task => taskIds.includes(task.taskId));
}
