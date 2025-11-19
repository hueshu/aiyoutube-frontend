const API_BASE_URL = 'https://aiyoutubebackendprod.email777.org/api/v1';

export interface WorkSnapshotData {
  projectId: number;
  projectName: string;
  script: any; // Can be string or array of frames
  characters: any[];
  frames: any[];
  canvasState: {
    ratioTemplate: string;
    filledImages: Record<string, string>;
  };
  model?: string; // AI model selection
}

export interface UserYouTubeLink {
  id: number;
  youtubeUrl: string;
  notes?: string;
  addedAt: string;
}

export interface VideoPromptSummary {
  id: number;
  promptName: string;
  createdAt: string;
}

export interface WorkSnapshot {
  id: number;
  projectId: number;
  snapshotName: string;
  customName?: string;
  snapshotData?: WorkSnapshotData;
  createdAt: string;
  updatedAt?: string;
  scriptPreview?: string;
  videos: SnapshotVideo[];
  videosCount?: number;
  userYoutubeLinks?: UserYouTubeLink[];
  videoPrompts?: VideoPromptSummary[];
}

export interface SnapshotVideo {
  id: number;
  videoUrl: string;
  videoSize: number;
  uploadedAt: string;
}

export interface YouTubeLink {
  id: number;
  videoId: number;
  youtubeUrl: string;
  addedBy: number;
  addedByUsername?: string;
  addedAt: string;
  notes?: string;
}

export interface AdminSnapshot extends WorkSnapshot {
  userId: number;
  username: string;
  youtubeLinks?: YouTubeLink[];
  youtubeLinksCount?: number;
}

// User APIs
export const snapshotService = {
  // Create a new snapshot
  async createSnapshot(
    projectId: number,
    snapshotName: string,
    snapshotData: WorkSnapshotData,
    customName?: string | null
  ): Promise<{ id: number; message: string }> {
    const response = await fetch(`${API_BASE_URL}/snapshots`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      },
      body: JSON.stringify({
        projectId,
        snapshotName,
        snapshotData,
        customName
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to create snapshot');
    }

    return response.json();
  },

  // Get all snapshots for current user
  async getSnapshots(projectId?: number): Promise<WorkSnapshot[]> {
    const url = projectId
      ? `${API_BASE_URL}/snapshots?projectId=${projectId}`
      : `${API_BASE_URL}/snapshots`;

    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to fetch snapshots');
    }

    const data = await response.json();
    return data.snapshots;
  },

  // Get snapshot details
  async getSnapshot(snapshotId: number): Promise<WorkSnapshot> {
    const response = await fetch(`${API_BASE_URL}/snapshots/${snapshotId}`, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to fetch snapshot');
    }

    return response.json();
  },

  // Delete snapshot
  async deleteSnapshot(snapshotId: number): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/snapshots/${snapshotId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to delete snapshot');
    }
  },

  // Upload video to snapshot
  async uploadVideo(
    snapshotId: number,
    videoFile: File,
    onProgress?: (progress: number) => void
  ): Promise<SnapshotVideo> {
    return new Promise((resolve, reject) => {
      const formData = new FormData();
      formData.append('video', videoFile);

      const xhr = new XMLHttpRequest();

      // Track upload progress
      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable && onProgress) {
          const progress = (e.loaded / e.total) * 100;
          onProgress(progress);
        }
      });

      xhr.addEventListener('load', () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          resolve(JSON.parse(xhr.responseText));
        } else {
          try {
            const error = JSON.parse(xhr.responseText);
            reject(new Error(error.error || 'Failed to upload video'));
          } catch {
            reject(new Error('Failed to upload video'));
          }
        }
      });

      xhr.addEventListener('error', () => {
        reject(new Error('Network error during upload'));
      });

      xhr.open('POST', `${API_BASE_URL}/snapshots/${snapshotId}/videos`);
      xhr.setRequestHeader('Authorization', `Bearer ${localStorage.getItem('token')}`);
      xhr.send(formData);
    });
  },

  // Delete video
  async deleteVideo(snapshotId: number, videoId: number): Promise<void> {
    const response = await fetch(
      `${API_BASE_URL}/snapshots/${snapshotId}/videos/${videoId}`,
      {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to delete video');
    }
  },

  // Add user YouTube link to snapshot
  async addUserYouTubeLink(
    snapshotId: number,
    youtubeUrl: string,
    notes?: string
  ): Promise<UserYouTubeLink> {
    const response = await fetch(
      `${API_BASE_URL}/snapshots/${snapshotId}/user-youtube-links`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ youtubeUrl, notes })
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to add YouTube link');
    }

    return response.json();
  },

  // Delete user YouTube link
  async deleteUserYouTubeLink(snapshotId: number, linkId: number): Promise<void> {
    const response = await fetch(
      `${API_BASE_URL}/snapshots/${snapshotId}/user-youtube-links/${linkId}`,
      {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to delete YouTube link');
    }
  }
};

// Admin APIs
export const adminSnapshotService = {
  // Get all snapshots (admin only)
  async getSnapshots(params?: {
    userId?: string;
    startDate?: string;
    endDate?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ snapshots: AdminSnapshot[]; pagination: any }> {
    const searchParams = new URLSearchParams();
    if (params?.userId) searchParams.append('userId', params.userId);
    if (params?.startDate) searchParams.append('startDate', params.startDate);
    if (params?.endDate) searchParams.append('endDate', params.endDate);
    if (params?.limit) searchParams.append('limit', params.limit.toString());
    if (params?.offset) searchParams.append('offset', params.offset.toString());

    const url = `${API_BASE_URL}/admin/snapshots?${searchParams}`;

    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to fetch admin snapshots');
    }

    return response.json();
  },

  // Get snapshot details (admin only)
  async getSnapshot(snapshotId: number): Promise<AdminSnapshot> {
    const response = await fetch(`${API_BASE_URL}/admin/snapshots/${snapshotId}`, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to fetch snapshot');
    }

    return response.json();
  },

  // Add YouTube link to a video
  async addYouTubeLink(
    videoId: number,
    youtubeUrl: string,
    notes?: string
  ): Promise<YouTubeLink> {
    const response = await fetch(
      `${API_BASE_URL}/admin/snapshots/videos/${videoId}/youtube-link`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ youtubeUrl, notes })
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to add YouTube link');
    }

    return response.json();
  },

  // Delete YouTube link from a video
  async deleteYouTubeLink(videoId: number): Promise<void> {
    const response = await fetch(
      `${API_BASE_URL}/admin/snapshots/videos/${videoId}/youtube-link`,
      {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to delete YouTube link');
    }
  }
};
