import React, { useState, useEffect } from 'react';
import { Plus, X, Play, Download, Tag, Calendar, Loader, Trash2 } from 'lucide-react';
import { API_URL } from '../config/api';

interface BenchmarkVideo {
  id: string;
  url: string;
  title: string;
  description: string;
  tags: string[];
  videoFileUrl: string;
  audioFileUrl?: string;
  previewUrl?: string;
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
  status: 'pending' | 'processing' | 'completed' | 'failed';
  error?: string;
}

const BenchmarkVideoLibrary: React.FC = () => {
  const [videos, setVideos] = useState<BenchmarkVideo[]>([]);
  const [loading, setLoading] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [videoInputs, setVideoInputs] = useState<VideoInput[]>([{ url: '', description: '', tags: '' }]);
  const [submitting, setSubmitting] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [playingVideo, setPlayingVideo] = useState<string | null>(null);
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
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
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
    // 验证输入
    const validInputs = videoInputs.filter(v => v.url.trim() !== '');
    if (validInputs.length === 0) {
      alert('请至少输入一个视频URL');
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch(`${API_URL}/benchmark-videos`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
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

      if (response.status === 202) {
        // 异步处理模式
        const data = await response.json();
        const tasks: VideoTask[] = data.tasks.map((t: any) => ({
          taskId: t.taskId,
          videoUrl: t.videoUrl,
          status: t.status,
        }));

        setProcessingTasks(tasks);
        setShowAddModal(false);
        setShowProcessing(true);
        setVideoInputs([{ url: '', description: '', tags: '' }]);

        // 开始轮询任务状态
        startPollingTasks(tasks.map(t => t.taskId));
      } else if (response.ok) {
        alert('视频添加成功！');
        setShowAddModal(false);
        setVideoInputs([{ url: '', description: '', tags: '' }]);
        fetchVideos();
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
        const response = await fetch(`${API_URL}/benchmark-videos/tasks/status`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ taskIds })
        });

        if (response.ok) {
          const data = await response.json();
          const tasks: VideoTask[] = data.tasks.map((t: any) => ({
            taskId: t.taskId,
            videoUrl: t.videoUrl,
            status: t.status,
            error: t.error,
          }));

          setProcessingTasks(tasks);

          // 检查是否所有任务都已完成
          const allCompleted = tasks.every(t => t.status === 'completed' || t.status === 'failed');
          if (allCompleted) {
            clearInterval(pollInterval);
            fetchVideos(); // 刷新视频列表

            // 显示完成提示
            const completedCount = tasks.filter(t => t.status === 'completed').length;
            const failedCount = tasks.filter(t => t.status === 'failed').length;

            setTimeout(() => {
              alert(`处理完成！成功: ${completedCount}个，失败: ${failedCount}个`);
              setShowProcessing(false);
              setProcessingTasks([]);
            }, 1000);
          }
        }
      } catch (error) {
        console.error('Failed to poll task status:', error);
      }
    }, 2000); // 每2秒轮询一次

    // 5分钟后停止轮询
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
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
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

  const handleDownload = async (fileUrl: string, title: string) => {
    try {
      // 如果是相对路径，加上API_URL前缀
      const fullUrl = fileUrl.startsWith('http') ? fileUrl : `${API_URL.replace('/api/v1', '')}${fileUrl}`;

      // 获取文件扩展名
      const ext = fileUrl.includes('.m4a') ? 'm4a' : 'mp4';

      // 使用fetch下载文件
      const response = await fetch(fullUrl);
      const blob = await response.blob();

      // 创建blob URL并触发下载
      const blobUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = `${title}.${ext}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      // 释放blob URL
      URL.revokeObjectURL(blobUrl);
    } catch (error) {
      console.error('Download failed:', error);
      alert('下载失败，请重试');
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
    const grouped = groupVideosByDate();
    return Object.keys(grouped).sort((a, b) => {
      return new Date(b).getTime() - new Date(a).getTime();
    });
  };

  // 分页逻辑
  const getPaginatedDates = () => {
    const allDates = getAllDates();
    const startIndex = (currentPage - 1) * DAYS_PER_PAGE;
    const endIndex = startIndex + DAYS_PER_PAGE;
    return allDates.slice(startIndex, endIndex);
  };

  const getTotalPages = () => {
    const allDates = getAllDates();
    return Math.ceil(allDates.length / DAYS_PER_PAGE);
  };

  const groupedVideos = groupVideosByDate();
  const paginatedDates = getPaginatedDates();
  const totalPages = getTotalPages();

  return (
    <div className="max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">对标视频库</h1>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-5 h-5" />
          <span>添加视频</span>
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center items-center py-12">
          <Loader className="w-8 h-8 animate-spin text-blue-600" />
        </div>
      ) : (
        <>
          {paginatedDates.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              暂无视频，点击右上角添加视频
            </div>
          ) : (
            <div className="space-y-8">
              {paginatedDates.map(date => (
                <div key={date} className="bg-white rounded-lg shadow-md p-6">
                  <div className="flex items-center space-x-2 mb-4 pb-2 border-b">
                    <Calendar className="w-5 h-5 text-gray-600" />
                    <h2 className="text-lg font-semibold">{date}</h2>
                    <span className="text-sm text-gray-500">({groupedVideos[date].length} 个视频)</span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {groupedVideos[date].map(video => (
                      <div key={video.id} className="border rounded-lg p-4 hover:shadow-lg transition-shadow">
                        {/* 视频预览或封面 */}
                        {playingVideo === video.id ? (
                          <div className="relative mb-3">
                            <video
                              src={video.videoFileUrl.startsWith('http') ? video.videoFileUrl : `${API_URL.replace('/api/v1', '')}${video.videoFileUrl}`}
                              controls
                              autoPlay
                              className="w-full rounded-lg"
                              style={{ maxHeight: '200px' }}
                            />
                          </div>
                        ) : (
                          <div className="relative mb-3 bg-gray-100 rounded-lg overflow-hidden" style={{ height: '150px' }}>
                            {video.previewUrl ? (
                              <img
                                src={video.previewUrl}
                                alt={video.title}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="flex items-center justify-center h-full">
                                <Play className="w-12 h-12 text-gray-400" />
                              </div>
                            )}
                          </div>
                        )}

                        {/* 视频信息 */}
                        <h3 className="font-semibold text-sm mb-2 line-clamp-2">{video.title}</h3>
                        {video.description && (
                          <p className="text-xs text-gray-600 mb-2 line-clamp-2">{video.description}</p>
                        )}

                        {/* 标签 */}
                        {video.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1 mb-3">
                            {video.tags.map((tag, index) => (
                              <span
                                key={index}
                                className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-blue-100 text-blue-700"
                              >
                                <Tag className="w-3 h-3 mr-1" />
                                {tag}
                              </span>
                            ))}
                          </div>
                        )}

                        {/* 操作按钮 */}
                        <div className="space-y-2">
                          <div className="flex space-x-2">
                            <button
                              onClick={() => setPlayingVideo(playingVideo === video.id ? null : video.id)}
                              className="flex-1 flex items-center justify-center space-x-1 px-3 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition-colors text-sm"
                            >
                              <Play className="w-4 h-4" />
                              <span>{playingVideo === video.id ? '收起' : '播放'}</span>
                            </button>
                            <button
                              onClick={() => handleDownload(video.videoFileUrl, video.title)}
                              className="flex-1 flex items-center justify-center space-x-1 px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors text-sm"
                            >
                              <Download className="w-4 h-4" />
                              <span>视频</span>
                            </button>
                            {video.audioFileUrl && (
                              <button
                                onClick={() => handleDownload(video.audioFileUrl!, `${video.title}-audio`)}
                                className="flex-1 flex items-center justify-center space-x-1 px-3 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 transition-colors text-sm"
                              >
                                <Download className="w-4 h-4" />
                                <span>音频</span>
                              </button>
                            )}
                            <button
                              onClick={() => handleDelete(video.id)}
                              className="px-3 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>

                        {/* 原始URL */}
                        <a
                          href={video.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-blue-600 hover:underline mt-2 block truncate"
                        >
                          查看原视频
                        </a>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* 分页 */}
          {totalPages > 1 && (
            <div className="flex justify-center items-center space-x-2 mt-6">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="px-4 py-2 border rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
              >
                上一页
              </button>
              <span className="text-sm text-gray-600">
                第 {currentPage} / {totalPages} 页
              </span>
              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="px-4 py-2 border rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
              >
                下一页
              </button>
            </div>
          )}
        </>
      )}

      {/* 处理进度显示 */}
      {showProcessing && (
        <div className="fixed bottom-4 right-4 bg-white rounded-lg shadow-xl p-6 max-w-md z-50 border-2 border-blue-500">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">视频处理中...</h3>
            <Loader className="w-5 h-5 animate-spin text-blue-600" />
          </div>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {processingTasks.map((task) => (
              <div key={task.taskId} className="flex items-center space-x-2 text-sm">
                <div className="flex-1 truncate">{task.videoUrl}</div>
                {task.status === 'pending' && (
                  <span className="text-gray-500">等待中...</span>
                )}
                {task.status === 'processing' && (
                  <Loader className="w-4 h-4 animate-spin text-blue-600" />
                )}
                {task.status === 'completed' && (
                  <span className="text-green-600">✓ 完成</span>
                )}
                {task.status === 'failed' && (
                  <span className="text-red-600" title={task.error}>✗ 失败</span>
                )}
              </div>
            ))}
          </div>
          <div className="mt-4 text-sm text-gray-600">
            {processingTasks.filter(t => t.status === 'completed').length} / {processingTasks.length} 已完成
          </div>
        </div>
      )}

      {/* 添加视频模态框 */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b px-6 py-4 flex justify-between items-center">
              <h2 className="text-xl font-semibold">添加对标视频</h2>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {videoInputs.map((input, index) => (
                <div key={index} className="border rounded-lg p-4 relative">
                  {videoInputs.length > 1 && (
                    <button
                      onClick={() => removeVideoInput(index)}
                      className="absolute top-2 right-2 text-red-600 hover:text-red-700"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  )}

                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm font-medium mb-1">
                        视频URL <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={input.url}
                        onChange={(e) => updateVideoInput(index, 'url', e.target.value)}
                        placeholder="请输入视频链接"
                        className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-1">说明</label>
                      <textarea
                        value={input.description}
                        onChange={(e) => updateVideoInput(index, 'description', e.target.value)}
                        placeholder="添加视频说明（可选）"
                        rows={2}
                        className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-1">标签</label>
                      <input
                        type="text"
                        value={input.tags}
                        onChange={(e) => updateVideoInput(index, 'tags', e.target.value)}
                        placeholder="多个标签用逗号分隔，如：搞笑,剧情,热门"
                        className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                  </div>
                </div>
              ))}

              <button
                onClick={addVideoInput}
                className="w-full flex items-center justify-center space-x-2 px-4 py-3 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors"
              >
                <Plus className="w-5 h-5" />
                <span>再添加一个视频</span>
              </button>
            </div>

            <div className="sticky bottom-0 bg-gray-50 px-6 py-4 flex justify-end space-x-3 border-t">
              <button
                onClick={() => setShowAddModal(false)}
                className="px-4 py-2 border rounded-lg hover:bg-gray-100 transition-colors"
              >
                取消
              </button>
              <button
                onClick={handleSubmit}
                disabled={submitting}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
              >
                {submitting && <Loader className="w-4 h-4 animate-spin" />}
                <span>{submitting ? '提交中...' : '提交'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BenchmarkVideoLibrary;
