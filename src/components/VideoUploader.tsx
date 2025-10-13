import React, { useState, useRef } from 'react';
import { Upload, Trash2 } from 'lucide-react';
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

  const handleDownloadVideo = async (videoUrl: string) => {
    try {
      const response = await fetch(videoUrl);
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        const urlParts = videoUrl.split('/');
        const filename = decodeURIComponent(urlParts[urlParts.length - 1]) || 'video.mp4';
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
      } else {
        alert(`下载失败 (错误代码: ${response.status})`);
      }
    } catch (error) {
      console.error('Video download failed:', error);
      alert('视频下载失败，请稍后重试');
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
    <div className="flex items-center gap-2 flex-wrap">
      {/* Upload Button */}
      <div className="flex items-center gap-2">
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
          className={`inline-flex items-center px-3 py-1.5 border border-gray-300 rounded text-xs font-medium ${
            uploading
              ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
              : 'bg-white text-gray-700 hover:bg-gray-50 cursor-pointer'
          }`}
        >
          <Upload className="w-3 h-3 mr-1" />
          {uploading ? `上传中 ${uploadProgress.toFixed(0)}%` : '上传视频'}
        </label>

        {/* Error Message - Inline */}
        {error && (
          <span className="text-xs text-red-600" title={error}>
            {error}
          </span>
        )}
      </div>

      {/* Videos List - Horizontal */}
      {videos.length > 0 && (
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs text-gray-500">视频({videos.length}):</span>
          {videos.map((video) => (
            <div
              key={video.id}
              className="flex items-center gap-1 px-2 py-1 bg-gray-100 rounded text-xs"
            >
              <button
                onClick={() => handleDownloadVideo(video.videoUrl)}
                className="text-blue-600 hover:underline truncate max-w-[120px] text-left"
                title={`${video.videoUrl.split('/').pop()}\n${formatFileSize(video.videoSize)} · ${formatDate(video.uploadedAt)}`}
              >
                {video.videoUrl.split('/').pop()}
              </button>
              <span className="text-gray-400">·</span>
              <span className="text-gray-500">{formatDate(video.uploadedAt)}</span>
              <button
                onClick={() => handleDelete(video.id)}
                className="ml-1 text-red-600 hover:text-red-800"
                title="删除视频"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default VideoUploader;
