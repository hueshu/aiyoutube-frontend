import React, { useState, useEffect } from 'react';
import { Video, Clock, User, Download, Play, X, RefreshCw } from 'lucide-react';
import { API_URL } from '../config/api';

interface HailuoTask {
  taskId: string;
  username: string;
  imageUrls: string[];
  promptCn: string;
  promptEn: string | null;
  status: 'pending' | 'locked' | 'processing' | 'completed' | 'failed';
  videoUrl: string | null;
  createdAt: string | null;
  lockedAt: string | null;
  hailuoSubmittedAt: string | null;
  completedAt: string | null;
  totalDuration: number | null; // seconds
  generationDuration: number | null; // seconds
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

const AdminHailuoMonitor: React.FC = () => {
  const [tasks, setTasks] = useState<HailuoTask[]>([]);
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    limit: 30,
    total: 0,
    totalPages: 0
  });
  const [loading, setLoading] = useState(false);
  const [currentGenerationTime, setCurrentGenerationTime] = useState<number | null>(null);

  // Filter states
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [usernameFilter, setUsernameFilter] = useState<string>('');

  // Modal states
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [selectedVideo, setSelectedVideo] = useState<string | null>(null);

  useEffect(() => {
    fetchTasks();
    fetchCurrentGenerationTime();
  }, [pagination.page, statusFilter, usernameFilter]);

  const fetchTasks = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
        status: statusFilter,
        username: usernameFilter
      });

      const response = await fetch(`${API_URL}/admin/hailuo-monitor/tasks?${params}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setTasks(data.tasks || []);
        setPagination(data.pagination);
      } else {
        console.error('Failed to fetch tasks, status:', response.status);
        const errorText = await response.text();
        console.error('Error response:', errorText);
      }
    } catch (error) {
      console.error('Failed to fetch tasks:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchCurrentGenerationTime = async () => {
    try {
      const response = await fetch(`${API_URL}/admin/hailuo-monitor/current-generation-time`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setCurrentGenerationTime(data.currentGenerationTime);
      }
    } catch (error) {
      console.error('Failed to fetch current generation time:', error);
    }
  };

  const formatDuration = (seconds: number | null): string => {
    if (seconds === null) return '-';
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes}分${secs}秒`;
  };

  const formatDateTime = (isoString: string | null): string => {
    if (!isoString) return '-';
    const date = new Date(isoString);
    return date.toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    });
  };

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { bg: string; text: string; label: string }> = {
      pending: { bg: 'bg-gray-100', text: 'text-gray-600', label: '待处理' },
      locked: { bg: 'bg-yellow-100', text: 'text-yellow-600', label: '已锁定' },
      processing: { bg: 'bg-blue-100', text: 'text-blue-600', label: '处理中' },
      completed: { bg: 'bg-green-100', text: 'text-green-600', label: '已完成' },
      failed: { bg: 'bg-red-100', text: 'text-red-600', label: '失败' }
    };

    const config = statusConfig[status] || statusConfig.pending;
    return (
      <span className={`px-2 py-1 rounded text-xs ${config.bg} ${config.text}`}>
        {config.label}
      </span>
    );
  };

  const handlePageChange = (newPage: number) => {
    setPagination({ ...pagination, page: newPage });
  };

  const handleFilterChange = () => {
    setPagination({ ...pagination, page: 1 });
    fetchTasks();
  };

  const handleRefresh = () => {
    fetchTasks();
    fetchCurrentGenerationTime();
  };

  return (
    <div className="space-y-4">
      {/* Top filters and metrics */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold flex items-center">
            <Video className="w-5 h-5 mr-2" />
            海螺视频任务监控
          </h3>
          {currentGenerationTime !== null && (
            <div className="flex items-center bg-blue-50 px-4 py-2 rounded">
              <Clock className="w-4 h-4 mr-2 text-blue-600" />
              <span className="text-sm text-gray-700">当前生成耗时：</span>
              <span className="text-sm font-semibold text-blue-600 ml-1">
                {formatDuration(currentGenerationTime)}
              </span>
            </div>
          )}
        </div>

        {/* Filters */}
        <div className="flex gap-4 items-end">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-1">用户名</label>
            <input
              type="text"
              value={usernameFilter}
              onChange={(e) => setUsernameFilter(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleFilterChange()}
              placeholder="输入用户名筛选"
              className="w-full border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="w-40">
            <label className="block text-sm font-medium text-gray-700 mb-1">状态</label>
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPagination({ ...pagination, page: 1 });
              }}
              className="w-full border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">全部</option>
              <option value="pending">待处理</option>
              <option value="locked">已锁定</option>
              <option value="processing">处理中</option>
              <option value="completed">已完成</option>
              <option value="failed">失败</option>
            </select>
          </div>
          <button
            onClick={handleFilterChange}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            筛选
          </button>
          <button
            onClick={handleRefresh}
            disabled={loading}
            className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            title="刷新数据"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            刷新
          </button>
        </div>
      </div>

      {/* Tasks table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {loading ? (
          <div className="flex justify-center items-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
          </div>
        ) : tasks.length === 0 ? (
          <div className="text-center py-20 text-gray-500">
            <Video className="w-12 h-12 mx-auto mb-4 text-gray-300" />
            <p>暂无任务数据</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left p-3 font-medium text-gray-700">Task ID</th>
                  <th className="text-left p-3 font-medium text-gray-700">用户</th>
                  <th className="text-left p-3 font-medium text-gray-700">图片</th>
                  <th className="text-left p-3 font-medium text-gray-700">Prompt</th>
                  <th className="text-left p-3 font-medium text-gray-700">状态</th>
                  <th className="text-left p-3 font-medium text-gray-700">视频</th>
                  <th className="text-left p-3 font-medium text-gray-700">入库时间</th>
                  <th className="text-left p-3 font-medium text-gray-700">提交海螺时间</th>
                  <th className="text-left p-3 font-medium text-gray-700">完成时间</th>
                  <th className="text-left p-3 font-medium text-gray-700">生成耗时</th>
                  <th className="text-left p-3 font-medium text-gray-700">总耗时</th>
                </tr>
              </thead>
              <tbody>
                {tasks.map((task) => (
                  <tr key={task.taskId} className="border-t hover:bg-gray-50">
                    <td className="p-3">
                      <span className="text-xs font-mono text-gray-600">
                        {task.taskId.substring(0, 8)}...
                      </span>
                    </td>
                    <td className="p-3">
                      <div className="flex items-center">
                        <User className="w-3 h-3 mr-1 text-gray-400" />
                        <span className="text-xs">{task.username}</span>
                      </div>
                    </td>
                    <td className="p-3">
                      {task.imageUrls.length > 0 && (
                        <div className="flex gap-1">
                          {task.imageUrls.slice(0, 2).map((url, idx) => (
                            <img
                              key={idx}
                              src={url}
                              alt="preview"
                              className="w-10 h-10 object-cover rounded cursor-pointer hover:opacity-75"
                              onClick={() => setSelectedImage(url)}
                            />
                          ))}
                          {task.imageUrls.length > 2 && (
                            <div className="w-10 h-10 bg-gray-100 rounded flex items-center justify-center text-xs text-gray-600">
                              +{task.imageUrls.length - 2}
                            </div>
                          )}
                        </div>
                      )}
                    </td>
                    <td className="p-3 max-w-xs">
                      <div className="text-xs text-gray-600 truncate" title={task.promptCn}>
                        {task.promptCn}
                      </div>
                      {task.promptEn && (
                        <div className="text-xs text-gray-400 truncate" title={task.promptEn}>
                          {task.promptEn}
                        </div>
                      )}
                    </td>
                    <td className="p-3">{getStatusBadge(task.status)}</td>
                    <td className="p-3">
                      {task.videoUrl ? (
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => setSelectedVideo(task.videoUrl!)}
                            className="p-1 bg-blue-100 text-blue-600 rounded hover:bg-blue-200"
                            title="播放视频"
                          >
                            <Play className="w-4 h-4" />
                          </button>
                          <a
                            href={task.videoUrl}
                            download
                            className="p-1 bg-green-100 text-green-600 rounded hover:bg-green-200"
                            title="下载视频"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <Download className="w-4 h-4" />
                          </a>
                        </div>
                      ) : (
                        <span className="text-xs text-gray-400">-</span>
                      )}
                    </td>
                    <td className="p-3 text-xs text-gray-600">{formatDateTime(task.createdAt)}</td>
                    <td className="p-3 text-xs text-gray-600">{formatDateTime(task.hailuoSubmittedAt)}</td>
                    <td className="p-3 text-xs text-gray-600">{formatDateTime(task.completedAt)}</td>
                    <td className="p-3 text-xs font-medium text-blue-600">
                      {formatDuration(task.generationDuration)}
                    </td>
                    <td className="p-3 text-xs font-medium text-gray-700">
                      {formatDuration(task.totalDuration)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <div className="border-t p-4 flex items-center justify-between">
            <div className="text-sm text-gray-600">
              共 {pagination.total} 条记录，第 {pagination.page} / {pagination.totalPages} 页
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => handlePageChange(pagination.page - 1)}
                disabled={pagination.page === 1}
                className="px-3 py-1 border rounded hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                上一页
              </button>
              <button
                onClick={() => handlePageChange(pagination.page + 1)}
                disabled={pagination.page >= pagination.totalPages}
                className="px-3 py-1 border rounded hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                下一页
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Image modal */}
      {selectedImage && (
        <div
          className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-50 p-4"
          onClick={() => setSelectedImage(null)}
        >
          <div className="relative max-w-4xl max-h-full" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => setSelectedImage(null)}
              className="absolute -top-10 right-0 text-white hover:text-gray-300"
            >
              <X className="w-6 h-6" />
            </button>
            <img
              src={selectedImage}
              alt="Full size"
              className="max-w-full max-h-[90vh] object-contain rounded"
            />
          </div>
        </div>
      )}

      {/* Video modal */}
      {selectedVideo && (
        <div
          className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-50 p-4"
          onClick={() => setSelectedVideo(null)}
        >
          <div className="relative max-w-6xl w-full" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => setSelectedVideo(null)}
              className="absolute -top-10 right-0 text-white hover:text-gray-300"
            >
              <X className="w-6 h-6" />
            </button>
            <video
              src={selectedVideo}
              controls
              autoPlay
              className="w-full max-h-[90vh] rounded"
              style={{ maxHeight: '720px' }}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminHailuoMonitor;
