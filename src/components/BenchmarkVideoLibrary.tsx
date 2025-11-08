import React, { useState, useEffect } from 'react';
import { Plus, X, Play, Calendar, Loader, AlertCircle } from 'lucide-react';
import { API_URL } from '../config/api';
import { useAuthStore } from '../store/authStore';

interface BenchmarkVideo {
  id: string;
  url: string;
  title: string;
  description: string;
  tags: string[];
  videoFileUrl: string;
  audioFileUrl?: string;
  videoInfoUrl?: string;
  clipsUrl?: string;
  keyframesUrl?: string;
  shotsInfoUrl?: string;
  createdAt: string;
  createdBy: string;
}

interface VideoInput {
  url: string;
  description: string;
  tags: string;
}

interface VideoTask {
  taskId: string;
  videoUrl: string;
  status: 'pending' | 'locked' | 'processing' | 'completed' | 'failed';
  error?: string;
}

const BenchmarkVideoLibrary: React.FC = () => {
  const { user } = useAuthStore();
  const isAdmin = user?.role === 'admin';

  const [videos, setVideos] = useState<BenchmarkVideo[]>([]);
  const [loading, setLoading] = useState(false);

  // 添加视频模态框
  const [showAddModal, setShowAddModal] = useState(false);
  const [videoInputs, setVideoInputs] = useState<VideoInput[]>([{ url: '', description: '', tags: '' }]);
  const [submitting, setSubmitting] = useState(false);


  // 编辑模态框
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingVideo, setEditingVideo] = useState<BenchmarkVideo | null>(null);
  const [editForm, setEditForm] = useState({
    description: '',
    tags: '',
  });
  const [editing, setEditing] = useState(false);

  // 分页和播放
  const [currentPage, setCurrentPage] = useState(1);
  const [playingVideo, setPlayingVideo] = useState<string | null>(null);

  // 任务处理
  const [processingTasks, setProcessingTasks] = useState<VideoTask[]>([]);
  const [showProcessing, setShowProcessing] = useState(false);

  const DAYS_PER_PAGE = 7;

  useEffect(() => {
    fetchVideos();
  }, []);

  const fetchVideos = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/benchmark-videos`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      if (response.ok) {
        const data = await response.json();
        setVideos(data.videos || []);
      }
    } catch (error) {
      console.error('Failed to fetch videos:', error);
    } finally {
      setLoading(false);
    }
  };

  const addVideoInput = () => {
    setVideoInputs([...videoInputs, { url: '', description: '', tags: '' }]);
  };

  const removeVideoInput = (index: number) => {
    if (videoInputs.length > 1) {
      setVideoInputs(videoInputs.filter((_, i) => i !== index));
    }
  };

  const updateVideoInput = (index: number, field: keyof VideoInput, value: string) => {
    const updated = [...videoInputs];
    updated[index][field] = value;
    setVideoInputs(updated);
  };

  const handleSubmit = async () => {
    const validInputs = videoInputs.filter(v => v.url.trim() !== '');
    if (validInputs.length === 0) {
      alert('请至少输入一个视频URL');
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch(`${API_URL}/benchmark-video-tasks/submit`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          videos: validInputs.map(v => ({
            url: v.url.trim(),
            description: v.description.trim(),
            tags: v.tags.split(',').map(t => t.trim()).filter(t => t !== '')
          }))
        })
      });

      if (response.ok) {
        const data = await response.json();
        const taskIds = data.taskIds || [];

        // Initialize task list
        const tasks: VideoTask[] = taskIds.map((taskId: string) => ({
          taskId,
          videoUrl: '',
          status: 'pending' as const,
        }));

        setProcessingTasks(tasks);
        setShowAddModal(false);
        setShowProcessing(true);
        setVideoInputs([{ url: '', description: '', tags: '' }]);
        startPollingTasks(taskIds);
      } else {
        const error = await response.json();
        alert(`添加失败: ${error.error || '未知错误'}`);
      }
    } catch (error) {
      console.error('Failed to add videos:', error);
      alert('添加失败，请重试');
    } finally {
      setSubmitting(false);
    }
  };

  const startPollingTasks = (taskIds: string[]) => {
    const pollInterval = setInterval(async () => {
      try {
        // Query each task individually
        const taskPromises = taskIds.map(taskId =>
          fetch(`${API_URL}/benchmark-video-tasks/${taskId}`, {
            headers: {
              'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
          }).then(res => res.ok ? res.json() : null)
        );

        const taskResults = await Promise.all(taskPromises);
        const tasks: VideoTask[] = taskResults
          .filter(result => result && result.task)
          .map((result: any) => ({
            taskId: result.task.taskId,
            videoUrl: result.task.videoUrl,
            status: result.task.status,
            error: result.task.errorMessage,
          }));

        // Only update when status actually changes
        setProcessingTasks(prevTasks => {
          const hasChanged = tasks.some((newTask, index) => {
            const prevTask = prevTasks[index];
            return !prevTask || prevTask.status !== newTask.status;
          });
          return hasChanged ? tasks : prevTasks;
        });

        const allCompleted = tasks.every(t =>
          t.status === 'completed' ||
          t.status === 'failed'
        );

        if (allCompleted) {
          clearInterval(pollInterval);
          fetchVideos();

          const completedCount = tasks.filter(t => t.status === 'completed').length;
          const failedCount = tasks.filter(t => t.status === 'failed').length;

          setTimeout(() => {
            let message = `处理完成！成功: ${completedCount}个`;
            if (failedCount > 0) message += `，失败: ${failedCount}个`;
            alert(message);
            setShowProcessing(false);
              setProcessingTasks([]);
            }, 1000);
          }
        }
      } catch (error) {
        console.error('Failed to poll task status:', error);
      }
    }, 2000);

    setTimeout(() => {
      clearInterval(pollInterval);
    }, 5 * 60 * 1000);
  };

  const handleDelete = async (videoId: string) => {
    if (!confirm('确定要删除这个视频吗？')) {
      return;
    }

    try {
      const response = await fetch(`${API_URL}/benchmark-videos/${videoId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        alert('删除成功');
        fetchVideos();
      } else {
        alert('删除失败');
      }
    } catch (error) {
      console.error('Failed to delete video:', error);
      alert('删除失败，请重试');
    }
  };

  const openEditModal = (video: BenchmarkVideo) => {
    setEditingVideo(video);
    setEditForm({
      description: video.description || '',
      tags: video.tags.join(', '),
    });
    setShowEditModal(true);
  };

  const handleEdit = async () => {
    if (!editingVideo) return;

    setEditing(true);
    try {
      const response = await fetch(`${API_URL}/benchmark-videos/${editingVideo.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          description: editForm.description,
          tags: editForm.tags.split(',').map(t => t.trim()).filter(Boolean),
        })
      });

      if (response.ok) {
        alert('更新成功');
        setShowEditModal(false);
        setEditingVideo(null);
        fetchVideos();
      } else {
        alert('更新失败');
      }
    } catch (error) {
      console.error('Failed to update video:', error);
      alert('更新失败，请重试');
    } finally {
      setEditing(false);
    }
  };

  const openUploadModalForFailed = (video: BenchmarkVideo) => {
    setUploadModalData({ mode: '补传', videoId: video.id, title: video.title });
    setUploadForm({
      videoFile: null,
      audioFile: null,
      title: video.title,
      description: video.description,
      tags: video.tags.join(', '),
      url: video.url,
    });
    setShowUploadModal(true);
  };

  const handleDownload = async (fileUrl: string, title: string) => {
    try {
      const fullUrl = fileUrl.startsWith('http') ? fileUrl : `${API_URL.replace('/api/v1', '')}${fileUrl}`;
      const ext = fileUrl.includes('.m4a') ? 'm4a' : 'mp4';

      const response = await fetch(fullUrl);
      const blob = await response.blob();

      const blobUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = `${title}.${ext}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(blobUrl);
    } catch (error) {
      console.error('Download failed:', error);
      alert('下载失败，请重试');
    }
  };

  const handleUpload = async () => {
    if (!uploadForm.videoFile) {
      alert('请选择视频文件');
      return;
    }

    if (uploadModalData.mode === 'new' && !uploadForm.title) {
      alert('请输入标题');
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('video', uploadForm.videoFile);
      if (uploadForm.audioFile) {
        formData.append('audio', uploadForm.audioFile);
      }

      if (uploadModalData.mode === 'new') {
        formData.append('title', uploadForm.title);
        formData.append('description', uploadForm.description);
        formData.append('tags', uploadForm.tags);
        formData.append('url', uploadForm.url);
      }

      const url = uploadModalData.mode === 'new'
        ? `${API_URL}/benchmark-videos/upload`
        : `${API_URL}/benchmark-videos/upload/${uploadModalData.videoId}`;

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: formData
      });

      if (response.ok) {
        alert(uploadModalData.mode === 'new' ? '上传成功！' : '补传成功！');
        setShowUploadModal(false);
        fetchVideos();
      } else {
        const error = await response.json();
        alert(`上传失败: ${error.error || '未知错误'}`);
      }
    } catch (error) {
      console.error('Upload failed:', error);
      alert('上传失败，请重试');
    } finally {
      setUploading(false);
    }
  };

  // 按日期分组视频
  const groupVideosByDate = () => {
    const grouped: { [key: string]: BenchmarkVideo[] } = {};
    videos.forEach(video => {
      const date = new Date(video.createdAt).toLocaleDateString('zh-CN');
      if (!grouped[date]) {
        grouped[date] = [];
      }
      grouped[date].push(video);
    });
    return grouped;
  };

  // 获取所有日期（倒序）
  const getAllDates = () => {
    const dates = Object.keys(groupVideosByDate());
    return dates.sort((a, b) => new Date(b).getTime() - new Date(a).getTime());
  };

  // 分页处理
  const getPaginatedDates = () => {
    const allDates = getAllDates();
    const startIndex = (currentPage - 1) * DAYS_PER_PAGE;
    const endIndex = startIndex + DAYS_PER_PAGE;
    return allDates.slice(startIndex, endIndex);
  };

  const totalPages = Math.ceil(getAllDates().length / DAYS_PER_PAGE);
  const groupedVideos = groupVideosByDate();
  const paginatedDates = getPaginatedDates();

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="w-full">
        {/* 标题栏 */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">对标视频库</h1>
            {/* 调试信息 - 临时显示 */}
            <div className="text-xs text-gray-500 mt-1">
              调试: isAdmin = {String(isAdmin)}
            </div>
          </div>
          {isAdmin && (
            <button
              onClick={() => setShowAddModal(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
            >
              <Plus className="w-5 h-5" />
              <span>添加视频</span>
            </button>
          )}
        </div>

        {/* 加载状态 */}
        {loading ? (
          <div className="flex justify-center items-center py-12">
            <Loader className="w-8 h-8 animate-spin text-blue-600" />
          </div>
        ) : videos.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            暂无视频
          </div>
        ) : (
          <>
            {/* 视频列表 - 按日期分组 */}
            <div className="space-y-8">
              {paginatedDates.map(date => (
                <div key={date} className="bg-white rounded-lg shadow-sm overflow-hidden">
                  {/* 日期标题 */}
                  <div className="bg-gray-100 px-6 py-3 border-b flex items-center gap-2">
                    <Calendar className="w-5 h-5 text-gray-600" />
                    <span className="font-semibold text-gray-700">{date}</span>
                    <span className="text-sm text-gray-500">({groupedVideos[date].length}个视频)</span>
                  </div>

                  {/* 表格 */}
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-50 border-b">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-16">序号</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">视频</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">下载</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">操作说明</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">标题</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">标签</th>
                          {isAdmin && (
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">操作</th>
                          )}
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {groupedVideos[date].map((video) => {
                          // 计算全局序号：找到这个视频在所有视频中的位置（从最老的开始）
                          const globalIndex = videos.length - videos.findIndex(v => v.id === video.id);
                          return (
                          <tr key={video.id} className="hover:bg-gray-50">
                            {/* 序号列 */}
                            <td className="px-4 py-4 text-center">
                              <span className="text-sm font-medium text-gray-700">{globalIndex}</span>
                            </td>

                            {/* 视频列 */}
                            <td className="px-6 py-4">
                              <button
                                onClick={() => setPlayingVideo(video.id)}
                                className="relative w-40 h-24 bg-gray-900 rounded overflow-hidden hover:opacity-90 transition-opacity cursor-pointer group"
                              >
                                <video
                                  src={video.videoFileUrl.startsWith('http')
                                    ? video.videoFileUrl
                                    : `${API_URL.replace('/api/v1', '')}${video.videoFileUrl}`}
                                  className="w-full h-full object-contain"
                                  muted
                                  preload="metadata"
                                />
                                <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-all">
                                  <Play className="w-8 h-8 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                                </div>
                              </button>
                            </td>

                            {/* 下载列 */}
                            <td className="px-6 py-4">
                              <div className="flex flex-col gap-1 text-sm">
                                <button
                                  onClick={() => handleDownload(video.videoFileUrl, video.title)}
                                  className="text-green-600 hover:text-green-800 hover:underline text-left"
                                >
                                  下载视频
                                </button>
                                {video.audioFileUrl && (
                                  <button
                                    onClick={() => handleDownload(video.audioFileUrl!, `${video.title}_audio`)}
                                    className="text-purple-600 hover:text-purple-800 hover:underline text-left"
                                  >
                                    下载音频
                                  </button>
                                )}
                                {video.videoInfoUrl && (
                                  <button
                                    onClick={() => handleDownload(video.videoInfoUrl!, `${video.title}_video_info`)}
                                    className="text-blue-600 hover:text-blue-800 hover:underline text-left"
                                  >
                                    视频信息
                                  </button>
                                )}
                                {video.clipsUrl && (
                                  <button
                                    onClick={() => handleDownload(video.clipsUrl!, `${video.title}_clips`)}
                                    className="text-orange-600 hover:text-orange-800 hover:underline text-left"
                                  >
                                    分镜片段
                                  </button>
                                )}
                                {video.keyframesUrl && (
                                  <button
                                    onClick={() => handleDownload(video.keyframesUrl!, `${video.title}_keyframes`)}
                                    className="text-indigo-600 hover:text-indigo-800 hover:underline text-left"
                                  >
                                    关键帧
                                  </button>
                                )}
                                {video.shotsInfoUrl && (
                                  <button
                                    onClick={() => handleDownload(video.shotsInfoUrl!, `${video.title}_shots_info`)}
                                    className="text-teal-600 hover:text-teal-800 hover:underline text-left"
                                  >
                                    镜头信息
                                  </button>
                                )}
                              </div>
                            </td>

                            {/* 操作说明列 */}
                            <td className="px-6 py-4">
                              <p className="text-sm text-gray-700">{video.description || '-'}</p>
                            </td>

                            {/* 标题列 */}
                            <td className="px-6 py-4">
                              <p className="text-sm font-medium text-gray-900">{video.title}</p>
                              {isAdmin && video.url && (
                                <a
                                  href={video.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-xs text-blue-600 hover:underline mt-1 block"
                                >
                                  查看原视频
                                </a>
                              )}
                            </td>

                            {/* 标签列 */}
                            <td className="px-6 py-4">
                              <div className="flex flex-wrap gap-1">
                                {video.tags.map((tag, index) => (
                                  <span
                                    key={index}
                                    className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full"
                                  >
                                    {tag}
                                  </span>
                                ))}
                              </div>
                            </td>

                            {/* 操作列（仅管理员） */}
                            {isAdmin && (
                              <td className="px-6 py-4">
                                <div className="flex flex-wrap gap-2 text-sm">
                                  {/* 如果是下载失败的视频，显示上传按钮 */}
                                  {video.uploadType === 'failed_pending_upload' && (
                                    <button
                                      onClick={() => openUploadModalForFailed(video)}
                                      className="text-orange-600 hover:text-orange-800 hover:underline"
                                    >
                                      上传
                                    </button>
                                  )}
                                  <button
                                    onClick={() => openEditModal(video)}
                                    className="text-blue-600 hover:text-blue-800 hover:underline"
                                  >
                                    编辑
                                  </button>
                                  <button
                                    onClick={() => handleDelete(video.id)}
                                    className="text-red-600 hover:text-red-800 hover:underline"
                                  >
                                    删除
                                  </button>
                                </div>
                              </td>
                            )}
                          </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))}
            </div>

            {/* 分页控制 */}
            {totalPages > 1 && (
              <div className="flex justify-center items-center gap-4 mt-8">
                <button
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="px-4 py-2 bg-white border rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  上一页
                </button>
                <span className="text-gray-700">
                  第 {currentPage} / {totalPages} 页
                </span>
                <button
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="px-4 py-2 bg-white border rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  下一页
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* 添加视频模态框 */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-bold">添加对标视频</h2>
                <button onClick={() => setShowAddModal(false)} className="text-gray-400 hover:text-gray-600">
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="space-y-4">
                {videoInputs.map((input, index) => (
                  <div key={index} className="border rounded-lg p-4 space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="font-medium">视频 {index + 1}</span>
                      {videoInputs.length > 1 && (
                        <button
                          onClick={() => removeVideoInput(index)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <X className="w-5 h-5" />
                        </button>
                      )}
                    </div>
                    <input
                      type="text"
                      placeholder="视频URL *"
                      value={input.url}
                      onChange={(e) => updateVideoInput(index, 'url', e.target.value)}
                      className="w-full px-3 py-2 border rounded-lg"
                    />
                    <input
                      type="text"
                      placeholder="操作说明"
                      value={input.description}
                      onChange={(e) => updateVideoInput(index, 'description', e.target.value)}
                      className="w-full px-3 py-2 border rounded-lg"
                    />
                    <input
                      type="text"
                      placeholder="标签（逗号分隔）"
                      value={input.tags}
                      onChange={(e) => updateVideoInput(index, 'tags', e.target.value)}
                      className="w-full px-3 py-2 border rounded-lg"
                    />
                  </div>
                ))}
              </div>

              <button
                onClick={addVideoInput}
                className="mt-4 w-full px-4 py-2 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-blue-500 hover:text-blue-600 transition-colors"
              >
                + 添加更多视频
              </button>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={handleSubmit}
                  disabled={submitting}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {submitting ? '提交中...' : '提交'}
                </button>
                <button
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                >
                  取消
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 上传视频模态框 */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-bold">
                  {uploadModalData.mode === 'new' ? '上传视频' : `补传视频：${uploadModalData.title}`}
                </h2>
                <button onClick={() => setShowUploadModal(false)} className="text-gray-400 hover:text-gray-600">
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">视频文件 *</label>
                  <input
                    type="file"
                    accept="video/*"
                    onChange={(e) => setUploadForm({ ...uploadForm, videoFile: e.target.files?.[0] || null })}
                    className="w-full"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">音频文件（可选）</label>
                  <input
                    type="file"
                    accept="audio/*"
                    onChange={(e) => setUploadForm({ ...uploadForm, audioFile: e.target.files?.[0] || null })}
                    className="w-full"
                  />
                </div>

                {uploadModalData.mode === 'new' && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">标题 *</label>
                      <input
                        type="text"
                        value={uploadForm.title}
                        onChange={(e) => setUploadForm({ ...uploadForm, title: e.target.value })}
                        className="w-full px-3 py-2 border rounded-lg"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">操作说明</label>
                      <input
                        type="text"
                        value={uploadForm.description}
                        onChange={(e) => setUploadForm({ ...uploadForm, description: e.target.value })}
                        className="w-full px-3 py-2 border rounded-lg"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">标签（逗号分隔）</label>
                      <input
                        type="text"
                        value={uploadForm.tags}
                        onChange={(e) => setUploadForm({ ...uploadForm, tags: e.target.value })}
                        className="w-full px-3 py-2 border rounded-lg"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">原视频URL（可选）</label>
                      <input
                        type="text"
                        value={uploadForm.url}
                        onChange={(e) => setUploadForm({ ...uploadForm, url: e.target.value })}
                        className="w-full px-3 py-2 border rounded-lg"
                      />
                    </div>
                  </>
                )}
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={handleUpload}
                  disabled={uploading}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {uploading ? '上传中...' : '上传'}
                </button>
                <button
                  onClick={() => setShowUploadModal(false)}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                >
                  取消
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 处理进度浮窗 */}
      {showProcessing && processingTasks.length > 0 && (
        <div className="fixed bottom-4 right-4 bg-white rounded-lg shadow-lg p-4 max-w-md z-50 transition-all duration-300 ease-in-out">
          <div className="flex justify-between items-center mb-3">
            <h3 className="font-semibold">处理进度</h3>
            <button
              onClick={() => setShowProcessing(false)}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="space-y-2 max-h-60 overflow-y-auto">
            {processingTasks.map(task => (
              <div key={task.taskId} className="flex items-center gap-2 text-sm">
                {task.status === 'completed' ? (
                  <span className="text-green-600">✓</span>
                ) : task.status === 'failed' ? (
                  <span className="text-red-600">✗</span>
                ) : task.status === 'failed_pending_upload' ? (
                  <span className="text-yellow-600">⚠</span>
                ) : (
                  <Loader className="w-4 h-4 animate-spin text-blue-600" />
                )}
                <span className="flex-1 truncate">{task.videoUrl}</span>
                <span className="text-xs text-gray-500">
                  {task.status === 'pending' && '等待中'}
                  {task.status === 'processing' && '处理中'}
                  {task.status === 'completed' && '完成'}
                  {task.status === 'failed' && '失败'}
                  {task.status === 'failed_pending_upload' && '待上传'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 视频播放弹窗 */}
      {playingVideo && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-8"
          onClick={() => setPlayingVideo(null)}
        >
          <div
            className="relative bg-white rounded-lg shadow-2xl max-w-3xl w-full overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setPlayingVideo(null)}
              className="absolute top-2 right-2 z-10 bg-gray-800 bg-opacity-75 text-white hover:bg-opacity-100 rounded-full p-1.5 transition-all"
            >
              <X className="w-5 h-5" />
            </button>
            <video
              src={(() => {
                const video = videos.find(v => v.id === playingVideo);
                if (!video) return '';
                return video.videoFileUrl.startsWith('http')
                  ? video.videoFileUrl
                  : `${API_URL.replace('/api/v1', '')}${video.videoFileUrl}`;
              })()}
              controls
              autoPlay
              className="w-full aspect-video bg-black"
            />
          </div>
        </div>
      )}

      {/* 编辑模态框 */}
      {showEditModal && editingVideo && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-bold">编辑视频信息</h2>
                <button onClick={() => setShowEditModal(false)} className="text-gray-500 hover:text-gray-700">
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    标题（不可编辑）
                  </label>
                  <input
                    type="text"
                    value={editingVideo.title}
                    disabled
                    className="w-full px-3 py-2 border rounded-lg bg-gray-100 text-gray-600"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    操作说明
                  </label>
                  <textarea
                    value={editForm.description}
                    onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    rows={3}
                    placeholder="描述这个视频的用途、特点等"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    标签（用逗号分隔）
                  </label>
                  <input
                    type="text"
                    value={editForm.tags}
                    onChange={(e) => setEditForm({ ...editForm, tags: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="例如: 动作, 特效, 转场"
                  />
                  <p className="text-sm text-gray-500 mt-1">
                    当前标签: {editForm.tags.split(',').map(t => t.trim()).filter(Boolean).join(', ')}
                  </p>
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-6">
                <button
                  onClick={() => setShowEditModal(false)}
                  className="px-4 py-2 border rounded-lg hover:bg-gray-50"
                  disabled={editing}
                >
                  取消
                </button>
                <button
                  onClick={handleEdit}
                  disabled={editing}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
                >
                  {editing ? (
                    <>
                      <Loader className="w-4 h-4 animate-spin" />
                      <span>保存中...</span>
                    </>
                  ) : (
                    <span>保存</span>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BenchmarkVideoLibrary;
