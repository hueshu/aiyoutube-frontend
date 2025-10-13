import React, { useState, useEffect } from 'react';
import { Clock, ChevronDown, ChevronUp, Trash2, Plus, Link as LinkIcon, X, RotateCcw } from 'lucide-react';
import { adminSnapshotService, type AdminSnapshot, type YouTubeLink } from '../services/snapshotService';
import VideoUploader from './VideoUploader';

const AdminWorkSnapshots: React.FC = () => {
  const [snapshots, setSnapshots] = useState<AdminSnapshot[]>([]);
  const [loading, setLoading] = useState(false);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [filters, setFilters] = useState({
    userId: '',
    startDate: '',
    endDate: ''
  });
  const [addYoutubeLinkModal, setAddYoutubeLinkModal] = useState<{
    isOpen: boolean;
    snapshotId: number | null;
  }>({ isOpen: false, snapshotId: null });
  const [youtubeForm, setYoutubeForm] = useState({
    youtubeUrl: '',
    notes: ''
  });
  const [restoreLoading, setRestoreLoading] = useState<number | null>(null);

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
    if (!addYoutubeLinkModal.snapshotId || !youtubeForm.youtubeUrl) {
      alert('请输入 YouTube 链接');
      return;
    }

    try {
      await adminSnapshotService.addYouTubeLink(
        addYoutubeLinkModal.snapshotId,
        youtubeForm.youtubeUrl,
        youtubeForm.notes
      );

      // Reload snapshots to get updated data
      await loadSnapshots();

      // Close modal and reset form
      setAddYoutubeLinkModal({ isOpen: false, snapshotId: null });
      setYoutubeForm({ youtubeUrl: '', notes: '' });

      alert('YouTube 链接添加成功!');
    } catch (error) {
      console.error('Failed to add YouTube link:', error);
      alert(error instanceof Error ? error.message : '添加失败');
    }
  };

  const handleDeleteYouTubeLink = async (snapshotId: number, linkId: number) => {
    if (!confirm('确定删除此 YouTube 链接吗？')) return;

    try {
      await adminSnapshotService.deleteYouTubeLink(snapshotId, linkId);
      await loadSnapshots();
      alert('删除成功!');
    } catch (error) {
      console.error('Failed to delete YouTube link:', error);
      alert(error instanceof Error ? error.message : '删除失败');
    }
  };

  const handleRestore = async (snapshotId: number) => {
    if (!confirm('确定要恢复此工作状态吗？这将影响该用户的工作区。')) {
      return;
    }

    setRestoreLoading(snapshotId);
    try {
      const snapshot = await adminSnapshotService.getSnapshot(snapshotId);
      if (snapshot.snapshotData) {
        // Admin restore is informational only - we just show the data
        alert('工作状态数据已加载，请在用户界面中应用。\n\n提示：管理员查看功能，实际恢复需在用户端操作。');
      }
    } catch (error) {
      console.error('Failed to restore snapshot:', error);
      alert(error instanceof Error ? error.message : '恢复失败');
    } finally {
      setRestoreLoading(null);
    }
  };

  const handleVideoUploadSuccess = (snapshotId: number, video: any) => {
    setSnapshots(snapshots.map(s => {
      if (s.id === snapshotId) {
        return {
          ...s,
          videos: [...(s.videos || []), video]
        };
      }
      return s;
    }));
  };

  const handleVideoDeleteSuccess = (snapshotId: number, videoId: number) => {
    setSnapshots(snapshots.map(s => {
      if (s.id === snapshotId) {
        return {
          ...s,
          videos: (s.videos || []).filter(v => v.id !== videoId)
        };
      }
      return s;
    }));
  };

  const toggleExpand = (snapshotId: number) => {
    setExpandedId(expandedId === snapshotId ? null : snapshotId);
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
          <div className="space-y-4">
            {snapshots.map((snapshot) => {
              const isExpanded = expandedId === snapshot.id;
              const isRestoring = restoreLoading === snapshot.id;

              return (
                <div
                  key={snapshot.id}
                  className="border border-gray-200 rounded-lg overflow-hidden"
                >
                  {/* Snapshot Header */}
                  <div className="bg-gray-50 px-4 py-3">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3">
                          <h4 className="font-medium text-gray-900">
                            {snapshot.snapshotName}
                          </h4>
                          <span className="text-sm text-gray-600 bg-white px-2 py-1 rounded">
                            {snapshot.username}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600 mt-1">
                          {formatDate(snapshot.createdAt)}
                        </p>
                        {snapshot.scriptPreview && (
                          <p className="text-sm text-gray-500 mt-2 line-clamp-2">
                            {snapshot.scriptPreview}...
                          </p>
                        )}
                        <div className="flex items-center space-x-4 mt-2 text-xs text-gray-500">
                          <span>视频: {snapshot.videosCount || snapshot.videos?.length || 0}</span>
                          <span>YouTube: {snapshot.youtubeLinksCount || snapshot.youtubeLinks?.length || 0}</span>
                        </div>
                      </div>

                      <div className="flex items-center space-x-2 ml-4">
                        <button
                          onClick={() => handleRestore(snapshot.id)}
                          disabled={isRestoring}
                          className="flex items-center px-3 py-1.5 text-sm font-medium text-blue-600 hover:bg-blue-50 rounded disabled:opacity-50"
                          title="查看工作状态"
                        >
                          <RotateCcw className={`w-4 h-4 mr-1 ${isRestoring ? 'animate-spin' : ''}`} />
                          {isRestoring ? '加载中...' : '查看'}
                        </button>
                        <button
                          onClick={() => toggleExpand(snapshot.id)}
                          className="p-1.5 text-gray-400 hover:text-gray-600"
                          title={isExpanded ? '收起' : '展开'}
                        >
                          {isExpanded ? (
                            <ChevronUp className="w-5 h-5" />
                          ) : (
                            <ChevronDown className="w-5 h-5" />
                          )}
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Expanded Content */}
                  {isExpanded && (
                    <div className="px-4 py-4 border-t border-gray-200 space-y-4">
                      {/* Videos Section */}
                      <div>
                        <h5 className="text-sm font-semibold mb-2">用户上传的视频</h5>
                        <VideoUploader
                          snapshotId={snapshot.id}
                          videos={snapshot.videos || []}
                          onUploadSuccess={(video) => handleVideoUploadSuccess(snapshot.id, video)}
                          onDeleteSuccess={(videoId) => handleVideoDeleteSuccess(snapshot.id, videoId)}
                        />
                      </div>

                      {/* YouTube Links Section */}
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <h5 className="text-sm font-semibold">YouTube 链接（仅管理员可见）</h5>
                          <button
                            onClick={() => setAddYoutubeLinkModal({ isOpen: true, snapshotId: snapshot.id })}
                            className="flex items-center px-3 py-1 text-sm text-green-600 hover:bg-green-50 rounded border border-green-300"
                          >
                            <Plus className="w-3 h-3 mr-1" />
                            添加链接
                          </button>
                        </div>

                        {snapshot.youtubeLinks && snapshot.youtubeLinks.length > 0 ? (
                          <div className="space-y-2">
                            {snapshot.youtubeLinks.map((link: YouTubeLink) => (
                              <div
                                key={link.id}
                                className="flex items-start justify-between p-3 bg-gray-50 rounded border border-gray-200"
                              >
                                <div className="flex-1 min-w-0">
                                  <a
                                    href={link.youtubeUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-blue-600 hover:underline truncate block"
                                  >
                                    <LinkIcon className="w-3 h-3 inline mr-1" />
                                    {link.youtubeUrl}
                                  </a>
                                  {link.notes && (
                                    <p className="text-xs text-gray-600 mt-1">{link.notes}</p>
                                  )}
                                  <p className="text-xs text-gray-500 mt-1">
                                    添加于: {formatDate(link.addedAt)}
                                    {link.addedByUsername && ` · ${link.addedByUsername}`}
                                  </p>
                                </div>
                                <button
                                  onClick={() => handleDeleteYouTubeLink(snapshot.id, link.id)}
                                  className="ml-2 p-1 text-red-600 hover:bg-red-50 rounded"
                                  title="删除链接"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-sm text-gray-500">暂无 YouTube 链接</p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Add YouTube Link Modal */}
      {addYoutubeLinkModal.isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold">添加 YouTube 链接</h3>
              <button onClick={() => {
                setAddYoutubeLinkModal({ isOpen: false, snapshotId: null });
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
                    setAddYoutubeLinkModal({ isOpen: false, snapshotId: null });
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
