const API_BASE_URL = 'https://aiyoutubebackendprod.email777.org/api/v1';

const getAuthToken = () => localStorage.getItem('token') || '';

export interface VideoPromptItem {
  generatedPrompt: string;
  translatedPrompt: string;
}

export interface VideoPrompt {
  id: number;
  snapshotId: number;
  promptName: string;
  promptsData: VideoPromptItem[];
  createdAt: string;
  updatedAt: string;
}

export interface SnapshotWithPrompts {
  snapshotId: number;
  snapshotName: string;
  customName: string | null;
  createdAt: string;
  prompts: {
    promptId: number;
    promptName: string;
    createdAt: string;
  }[];
}

// Create new video prompt
export async function createVideoPrompt(params: {
  snapshotId: number;
  promptName: string;
  promptsData: VideoPromptItem[];
}): Promise<VideoPrompt> {
  const response = await fetch(`${API_BASE_URL}/video-prompts`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${getAuthToken()}`
    },
    body: JSON.stringify(params)
  });

  if (!response.ok) {
    throw new Error('Failed to create video prompt');
  }

  return await response.json();
}

// Get video prompts by snapshot ID
export async function getVideoPromptsBySnapshot(snapshotId: number): Promise<VideoPrompt[]> {
  const response = await fetch(`${API_BASE_URL}/video-prompts/by-snapshot/${snapshotId}`, {
    headers: {
      'Authorization': `Bearer ${getAuthToken()}`
    }
  });

  if (!response.ok) {
    throw new Error('Failed to get video prompts');
  }

  const data = await response.json();
  return data.prompts;
}

// Get all snapshots with their video prompts
export async function getSnapshotsWithPrompts(): Promise<SnapshotWithPrompts[]> {
  const response = await fetch(`${API_BASE_URL}/video-prompts/snapshots-with-prompts`, {
    headers: {
      'Authorization': `Bearer ${getAuthToken()}`
    }
  });

  if (!response.ok) {
    throw new Error('Failed to get snapshots with prompts');
  }

  const data = await response.json();
  return data.snapshots;
}

// Get specific video prompt by ID
export async function getVideoPromptById(promptId: number): Promise<VideoPrompt> {
  const response = await fetch(`${API_BASE_URL}/video-prompts/${promptId}`, {
    headers: {
      'Authorization': `Bearer ${getAuthToken()}`
    }
  });

  if (!response.ok) {
    throw new Error('Failed to get video prompt');
  }

  return await response.json();
}

// Delete video prompt
export async function deleteVideoPrompt(promptId: number): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/video-prompts/${promptId}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${getAuthToken()}`
    }
  });

  if (!response.ok) {
    throw new Error('Failed to delete video prompt');
  }
}
