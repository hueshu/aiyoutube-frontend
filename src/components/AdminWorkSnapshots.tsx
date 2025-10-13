import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Clock, Trash2, Plus, X, RotateCcw } from 'lucide-react';
import { adminSnapshotService, type AdminSnapshot, type YouTubeLink } from '../services/snapshotService';

const AdminWorkSnapshots: React.FC = () => {
  const navigate = useNavigate();
  const [snapshots, setSnapshots] = useState<AdminSnapshot[]>([]);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState({
    userId: '',
    startDate: '',
    endDate: ''
  });
  const [addYoutubeLinkModal, setAddYoutubeLinkModal] = useState<{
    isOpen: boolean;
    videoId: number | null;
  }>({ isOpen: false, videoId: null });
  const [youtubeForm, setYoutubeForm] = useState({
    youtubeUrl: '',
    notes: ''
  });
  const [restoreLoading, setRestoreLoading] = useState<number | null>(null);
  const [viewModal, setViewModal] = useState<{
    isOpen: boolean;
    snapshot: AdminSnapshot | null;
  }>({ isOpen: false, snapshot: null });

  useEffect(() => {
    loadSnapshots();
  }, []);

  const loadSnapshots = async () => {
    setLoading(true);
    try {
      const params: any = {};
      if (filters.userId) params.userId = filters.userId;
      if (filters.startDate) params.startDate = filters.startDate;
      if (filters.endDate) params.endDate = filters.endDate;

      const data = await adminSnapshotService.getSnapshots(params);
      setSnapshots(data.snapshots);
    } catch (error) {
      console.error('Failed to load snapshots:', error);
      alert(error instanceof Error ? error.message : '加载失败');
    } finally {
      setLoading(false);
    }
  };

  const handleAddYouTubeLink = async () => {
    if (!addYoutubeLinkModal.videoId || !youtubeForm.youtubeUrl) {
      alert('请输入 YouTube 链接');
      return;
    }

    try {
      await adminSnapshotService.addYouTubeLink(
        addYoutubeLinkModal.videoId,
        youtubeForm.youtubeUrl,
        youtubeForm.notes
      );

      // Reload snapshots to get updated data
      await loadSnapshots();

      // Close modal and reset form
      setAddYoutubeLinkModal({ isOpen: false, videoId: null });
      setYoutubeForm({ youtubeUrl: '', notes: '' });

      alert('YouTube 链接添加成功!');
    } catch (error) {
      console.error('Failed to add YouTube link:', error);
      alert(error instanceof Error ? error.message : '添加失败');
    }
  };

  const handleDeleteYouTubeLink = async (videoId: number) => {
    if (!confirm('确定删除此 YouTube 链接吗？')) return;

    try {
      await adminSnapshotService.deleteYouTubeLink(videoId);
      await loadSnapshots();
      alert('删除成功!');
    } catch (error) {
      console.error('Failed to delete YouTube link:', error);
      alert(error instanceof Error ? error.message : '删除失败');
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

  const handleViewSnapshot = async (snapshotId: number) => {
    setRestoreLoading(snapshotId);
    try {
      const snapshot = await adminSnapshotService.getSnapshot(snapshotId);
      setViewModal({ isOpen: true, snapshot });
    } catch (error) {
      console.error('Failed to load snapshot:', error);
      alert(error instanceof Error ? error.message : '加载失败');
    } finally {
      setRestoreLoading(null);
    }
  };

  const handleRestoreToWorkspace = async (snapshotId: number) => {
    try {
      // Fetch snapshot data
      const snapshot = await adminSnapshotService.getSnapshot(snapshotId);

      if (!snapshot.snapshotData) {
        alert('快照数据为空');
        return;
      }

      // Store snapshot data in localStorage
      localStorage.setItem('pendingSnapshotRestore', JSON.stringify(snapshot.snapshotData));

      // Navigate to workspace
      navigate('/workspace');
    } catch (error) {
      console.error('Failed to restore snapshot:', error);
      alert(error instanceof Error ? error.message : '恢复失败');
    }
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
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-2xl font-bold mb-4 flex items-center">
          <Clock className="w-6 h-6 mr-2" />
          工作记录管理
        </h2>

        {/* Filters */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div>
            <label className="block text-sm font-medium mb-2">用户 ID</label>
            <input
              type="text"
              placeholder="输入用户 ID"
              value={filters.userId}
              onChange={(e) => setFilters({ ...filters, userId: e.target.value })}
              className="w-full border rounded px-3 py-2"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">开始日期</label>
            <input
              type="date"
              value={filters.startDate}
              onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
              className="w-full border rounded px-3 py-2"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">结束日期</label>
            <input
              type="date"
              value={filters.endDate}
              onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
              className="w-full border rounded px-3 py-2"
            />
          </div>
          <div className="flex items-end">
            <button
              onClick={loadSnapshots}
              disabled={loading}
              className="w-full bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 disabled:opacity-50"
            >
              {loading ? '加载中...' : '查询'}
            </button>
          </div>
        </div>

        {/* Snapshots List */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500" />
          </div>
        ) : snapshots.length === 0 ? (
          <div className="text-center py-12">
            <Clock className="w-12 h-12 mx-auto mb-4 text-gray-300" />
            <p className="text-gray-500">暂无工作记录</p>
          </div>
        ) : (
          <div className="space-y-2">
            {snapshots.map((snapshot) => {
              const isRestoring = restoreLoading === snapshot.id;

              return (
                <div
                  key={snapshot.id}
                  className="border border-gray-200 rounded p-3 hover:bg-gray-50"
                >
                  <div className="flex items-center gap-4">
                    {/* 用户名 */}
                    <div className="flex-shrink-0 w-24">
                      <p className="text-xs text-gray-500">用户</p>
                      <p className="text-sm text-gray-900 truncate">{snapshot.username}</p>
                    </div>

                    {/* 保存时间 */}
                    <div className="flex-shrink-0 w-32">
                      <p className="text-xs text-gray-500">保存时间</p>
                      <p className="text-sm text-gray-900">{formatDate(snapshot.createdAt)}</p>
                    </div>

                    {/* 脚本名称 */}
                    <div className="flex-shrink-0 w-40">
                      <p className="text-xs text-gray-500">脚本名称</p>
                      <p className="text-sm text-gray-900 truncate">{snapshot.snapshotName}</p>
                    </div>

                    {/* 视频列表与YouTube链接 */}
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-gray-500 mb-1">视频与YouTube链接</p>
                      <div className="space-y-1">
                        {snapshot.videos && snapshot.videos.length > 0 ? (
                          snapshot.videos.map((video: any) => {
                            // Find YouTube link for this video
                            const youtubeLink = snapshot.youtubeLinks?.find((link: YouTubeLink) => link.videoId === video.id);

                            return (
                              <div key={video.id} className="flex items-center gap-2 text-xs">
                                {/* Video download button */}
                                <div className="flex items-center gap-1 px-2 py-1 bg-gray-100 rounded">
                                  <button
                                    onClick={() => handleDownloadVideo(video.videoUrl)}
                                    className="text-blue-600 hover:underline truncate max-w-[100px] text-left"
                                    title={`${video.videoUrl.split('/').pop()}\n${formatDate(video.uploadedAt)}`}
                                  >
                                    {video.videoUrl.split('/').pop()?.substring(0, 15)}...
                                  </button>
                                  <span className="text-gray-400">·</span>
                                  <span className="text-gray-500">{formatDate(video.uploadedAt)}</span>
                                </div>

                                {/* YouTube link or Add button */}
                                {youtubeLink ? (
                                  <div className="flex items-center gap-1 px-2 py-1 bg-blue-50 rounded">
                                    <a
                                      href={youtubeLink.youtubeUrl}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-blue-600 hover:underline truncate max-w-[120px]"
                                      title={`${youtubeLink.youtubeUrl}\n${formatDate(youtubeLink.addedAt)}`}
                                    >
                                      {youtubeLink.youtubeUrl.substring(0, 25)}...
                                    </a>
                                    <button
                                      onClick={() => handleDeleteYouTubeLink(video.id)}
                                      className="ml-1 text-red-600 hover:text-red-800"
                                      title="删除链接"
                                    >
                                      <Trash2 className="w-3 h-3" />
                                    </button>
                                  </div>
                                ) : (
                                  <button
                                    onClick={() => setAddYoutubeLinkModal({ isOpen: true, videoId: video.id })}
                                    className="flex items-center px-2 py-1 text-xs text-green-600 hover:bg-green-50 rounded border border-green-300"
                                  >
                                    <Plus className="w-3 h-3 mr-1" />
                                    添加YouTube链接
                                  </button>
                                )}
                              </div>
                            );
                          })
                        ) : (
                          <span className="text-xs text-gray-400">无视频</span>
                        )}
                      </div>
                    </div>

                    {/* 操作按钮 */}
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <button
                        onClick={() => handleViewSnapshot(snapshot.id)}
                        disabled={isRestoring}
                        className="flex items-center px-2 py-1 text-xs font-medium text-blue-600 hover:bg-blue-50 rounded disabled:opacity-50"
                        title="查看工作状态"
                      >
                        <RotateCcw className={`w-3 h-3 mr-1 ${isRestoring ? 'animate-spin' : ''}`} />
                        {isRestoring ? '加载...' : '查看'}
                      </button>
                      <button
                        onClick={() => handleRestoreToWorkspace(snapshot.id)}
                        className="flex items-center px-2 py-1 text-xs font-medium text-green-600 hover:bg-green-50 rounded border border-green-300"
                        title="恢复到我的工作区"
                      >
                        <RotateCcw className="w-3 h-3 mr-1" />
                        恢复
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* View Snapshot Details Modal */}
      {viewModal.isOpen && viewModal.snapshot?.snapshotData && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-4xl w-full mx-4 max-h-[80vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold">工作快照详情</h3>
              <button onClick={() => setViewModal({ isOpen: false, snapshot: null })}>
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              {/* Basic Info */}
              <div className="grid grid-cols-2 gap-4 pb-4 border-b">
                <div>
                  <label className="text-sm font-medium text-gray-500">用户</label>
                  <p className="text-sm">{viewModal.snapshot.username}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">保存时间</label>
                  <p className="text-sm">{formatDate(viewModal.snapshot.createdAt)}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">项目名称</label>
                  <p className="text-sm">{viewModal.snapshot.snapshotData.projectName}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">AI模型</label>
                  <p className="text-sm">{viewModal.snapshot.snapshotData.model || '未设置'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">画布比例</label>
                  <p className="text-sm">{viewModal.snapshot.snapshotData.canvasState?.ratioTemplate || '未设置'}</p>
                </div>
              </div>

              {/* Characters */}
              {viewModal.snapshot.snapshotData.characters && viewModal.snapshot.snapshotData.characters.length > 0 && (
                <div>
                  <h4 className="font-medium mb-2">角色映射 ({viewModal.snapshot.snapshotData.characters.length})</h4>
                  <div className="grid grid-cols-2 gap-2">
                    {viewModal.snapshot.snapshotData.characters.map((char: any, idx: number) => (
                      <div key={idx} className="flex items-center gap-2 p-2 bg-gray-50 rounded text-sm">
                        <span className="font-medium">{char.scriptCharacter}</span>
                        <span className="text-gray-400">→</span>
                        <span>{char.characterName}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Frames */}
              {viewModal.snapshot.snapshotData.frames && viewModal.snapshot.snapshotData.frames.length > 0 && (
                <div>
                  <h4 className="font-medium mb-2">分镜信息 ({viewModal.snapshot.snapshotData.frames.length})</h4>
                  <div className="space-y-2">
                    {viewModal.snapshot.snapshotData.frames.slice(0, 5).map((frame: any) => (
                      <div key={frame.frame_number} className="p-2 bg-gray-50 rounded text-sm">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium">分镜 {frame.frame_number}</span>
                          {frame.generated_image && (
                            <span className="text-xs text-green-600">已生成图片</span>
                          )}
                        </div>
                        {frame.generated_images && frame.generated_images.length > 0 && (
                          <div className="text-xs text-gray-500">
                            历史图片: {frame.generated_images.length} 张
                          </div>
                        )}
                      </div>
                    ))}
                    {viewModal.snapshot.snapshotData.frames.length > 5 && (
                      <p className="text-sm text-gray-500 text-center">
                        还有 {viewModal.snapshot.snapshotData.frames.length - 5} 个分镜...
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Script Preview */}
              {viewModal.snapshot.snapshotData.script && viewModal.snapshot.snapshotData.script.length > 0 && (
                <div>
                  <h4 className="font-medium mb-2">脚本内容 ({viewModal.snapshot.snapshotData.script.length})</h4>
                  <div className="space-y-2">
                    {viewModal.snapshot.snapshotData.script.slice(0, 3).map((item: any) => (
                      <div key={item.frame_number} className="p-2 bg-gray-50 rounded text-sm">
                        <div className="font-medium mb-1">分镜 {item.frame_number}</div>
                        <div className="text-xs text-gray-600 line-clamp-2">
                          {item.prompt?.substring(0, 100)}...
                        </div>
                      </div>
                    ))}
                    {viewModal.snapshot.snapshotData.script.length > 3 && (
                      <p className="text-sm text-gray-500 text-center">
                        还有 {viewModal.snapshot.snapshotData.script.length - 3} 个脚本...
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setViewModal({ isOpen: false, snapshot: null })}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
              >
                关闭
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add YouTube Link Modal */}
      {addYoutubeLinkModal.isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold">添加 YouTube 链接</h3>
              <button onClick={() => {
                setAddYoutubeLinkModal({ isOpen: false, videoId: null });
                setYoutubeForm({ youtubeUrl: '', notes: '' });
              }}>
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">YouTube URL *</label>
                <input
                  type="url"
                  placeholder="https://youtube.com/watch?v=..."
                  value={youtubeForm.youtubeUrl}
                  onChange={(e) => setYoutubeForm({ ...youtubeForm, youtubeUrl: e.target.value })}
                  className="w-full border rounded px-3 py-2"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">备注（可选）</label>
                <textarea
                  placeholder="添加一些备注..."
                  value={youtubeForm.notes}
                  onChange={(e) => setYoutubeForm({ ...youtubeForm, notes: e.target.value })}
                  className="w-full border rounded px-3 py-2"
                  rows={3}
                />
              </div>

              <div className="flex justify-end space-x-2">
                <button
                  onClick={() => {
                    setAddYoutubeLinkModal({ isOpen: false, videoId: null });
                    setYoutubeForm({ youtubeUrl: '', notes: '' });
                  }}
                  className="px-4 py-2 border rounded hover:bg-gray-100"
                >
                  取消
                </button>
                <button
                  onClick={handleAddYouTubeLink}
                  disabled={!youtubeForm.youtubeUrl}
                  className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
                >
                  添加
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminWorkSnapshots;
