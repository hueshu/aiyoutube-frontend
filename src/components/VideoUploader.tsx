import React, { useState, useRef } from 'react';
import { Upload, X, Download, Trash2 } from 'lucide-react';
import { snapshotService, type SnapshotVideo } from '../services/snapshotService';

interface VideoUploaderProps {
  snapshotId: number;
  videos: SnapshotVideo[];
  onUploadSuccess: (video: SnapshotVideo) => void;
  onDeleteSuccess: (videoId: number) => void;
}

const VideoUploader: React.FC<VideoUploaderProps> = ({
  snapshotId,
  videos,
  onUploadSuccess,
  onDeleteSuccess
}) => {
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check file size (100MB limit)
    const MAX_SIZE = 100 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      setError('视频大小不能超过 100MB');
      return;
    }

    // Reset states
    setError(null);
    setUploading(true);
    setUploadProgress(0);

    try {
      const video = await snapshotService.uploadVideo(
        snapshotId,
        file,
        (progress) => {
          setUploadProgress(progress);
        }
      );

      onUploadSuccess(video);
      setUploading(false);
      setUploadProgress(0);

      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '上传失败');
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const handleDelete = async (videoId: number) => {
    if (!confirm('确定要删除这个视频吗？')) return;

    try {
      await snapshotService.deleteVideo(snapshotId, videoId);
      onDeleteSuccess(videoId);
    } catch (err) {
      alert(err instanceof Error ? err.message : '删除失败');
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
  };

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="space-y-4">
      {/* Upload Button */}
      <div>
        <input
          ref={fileInputRef}
          type="file"
          accept="video/*"
          onChange={handleFileSelect}
          disabled={uploading}
          className="hidden"
          id={`video-upload-${snapshotId}`}
        />
        <label
          htmlFor={`video-upload-${snapshotId}`}
          className={`inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium ${
            uploading
              ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
              : 'bg-white text-gray-700 hover:bg-gray-50 cursor-pointer'
          }`}
        >
          <Upload className="w-4 h-4 mr-2" />
          {uploading ? '上传中...' : '上传视频'}
        </label>
        <span className="ml-2 text-xs text-gray-500">最大 100MB</span>
      </div>

      {/* Upload Progress */}
      {uploading && (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm text-gray-600">
            <span>上传进度</span>
            <span>{uploadProgress.toFixed(0)}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-blue-500 h-2 rounded-full transition-all duration-300"
              style={{ width: `${uploadProgress}%` }}
            />
          </div>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="flex items-center p-3 bg-red-50 border border-red-200 rounded-md">
          <X className="w-4 h-4 text-red-500 mr-2" />
          <span className="text-sm text-red-700">{error}</span>
          <button
            onClick={() => setError(null)}
            className="ml-auto text-red-500 hover:text-red-700"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Videos List */}
      {videos.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-gray-700">已上传的视频</h4>
          <div className="space-y-2">
            {videos.map((video) => (
              <div
                key={video.id}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-md border border-gray-200"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2">
                    <div className="w-12 h-12 bg-gray-200 rounded flex items-center justify-center">
                      <svg
                        className="w-6 h-6 text-gray-400"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"
                        />
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                      </svg>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-gray-900 truncate">
                        {video.videoUrl.split('/').pop()}
                      </div>
                      <div className="text-xs text-gray-500">
                        {formatFileSize(video.videoSize)} · {formatDate(video.uploadedAt)}
                      </div>
                    </div>
                  </div>
                </div>
                <div className="flex items-center space-x-2 ml-4">
                  <a
                    href={video.videoUrl}
                    download
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 text-blue-600 hover:bg-blue-50 rounded"
                    title="下载视频"
                  >
                    <Download className="w-4 h-4" />
                  </a>
                  <button
                    onClick={() => handleDelete(video.id)}
                    className="p-2 text-red-600 hover:bg-red-50 rounded"
                    title="删除视频"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default VideoUploader;
