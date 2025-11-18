import React, { useState, useEffect } from 'react';
import { X, Clock, Trash2, RotateCcw, Plus, ExternalLink } from 'lucide-react';
import { snapshotService, type WorkSnapshot, type WorkSnapshotData } from '../services/snapshotService';
import VideoUploader from './VideoUploader';

interface WorkSnapshotsModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectId: number;
  onRestore: (snapshotData: WorkSnapshotData) => void;
}

const WorkSnapshotsModal: React.FC<WorkSnapshotsModalProps> = ({
  isOpen,
  onClose,
  projectId,
  onRestore
}) => {
  const [snapshots, setSnapshots] = useState<WorkSnapshot[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingSnapshotId, setLoadingSnapshotId] = useState<number | null>(null);
  const [addingLinkSnapshotId, setAddingLinkSnapshotId] = useState<number | null>(null);
  const [newYoutubeUrl, setNewYoutubeUrl] = useState('');

  useEffect(() => {
    if (isOpen) {
      loadSnapshots();
    }
  }, [isOpen, projectId]);

  const loadSnapshots = async () => {
    setLoading(true);
    try {
      const data = await snapshotService.getSnapshots(projectId);
      setSnapshots(data);
    } catch (error) {
      console.error('Failed to load snapshots:', error);
      alert(error instanceof Error ? error.message : '加载失败');
    } finally {
      setLoading(false);
    }
  };

  const handleRestore = async (snapshotId: number) => {
    if (!confirm('恢复此工作将覆盖当前工作状态，确定继续吗？')) {
      return;
    }

    setLoadingSnapshotId(snapshotId);
    try {
      const snapshot = await snapshotService.getSnapshot(snapshotId);
      if (snapshot.snapshotData) {
        onRestore(snapshot.snapshotData);
        onClose();
      }
    } catch (error) {
      console.error('Failed to restore snapshot:', error);
      alert(error instanceof Error ? error.message : '恢复失败');
    } finally {
      setLoadingSnapshotId(null);
    }
  };

  const handleDelete = async (snapshotId: number) => {
    const snapshot = snapshots.find(s => s.id === snapshotId);
    const videoCount = snapshot?.videos?.length || 0;

    const message = videoCount > 0
      ? `该快照包含 ${videoCount} 个视频，删除后无法恢复。确定删除吗？`
      : '删除后无法恢复，确定删除吗？';

    if (!confirm(message)) {
      return;
    }

    try {
      await snapshotService.deleteSnapshot(snapshotId);
      setSnapshots(snapshots.filter(s => s.id !== snapshotId));
    } catch (error) {
      console.error('Failed to delete snapshot:', error);
      alert(error instanceof Error ? error.message : '删除失败');
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

  const handleAddYoutubeLink = async (snapshotId: number) => {
    if (!newYoutubeUrl.trim()) {
      alert('请输入YouTube链接');
      return;
    }

    try {
      const link = await snapshotService.addUserYouTubeLink(snapshotId, newYoutubeUrl.trim());
      setSnapshots(snapshots.map(s => {
        if (s.id === snapshotId) {
          return {
            ...s,
            userYoutubeLinks: [...(s.userYoutubeLinks || []), link]
          };
        }
        return s;
      }));
      setNewYoutubeUrl('');
      setAddingLinkSnapshotId(null);
    } catch (error) {
      console.error('Failed to add YouTube link:', error);
      alert(error instanceof Error ? error.message : '添加失败');
    }
  };

  const handleDeleteYoutubeLink = async (snapshotId: number, linkId: number) => {
    if (!confirm('确定删除这个YouTube链接吗？')) return;

    try {
      await snapshotService.deleteUserYouTubeLink(snapshotId, linkId);
      setSnapshots(snapshots.map(s => {
        if (s.id === snapshotId) {
          return {
            ...s,
            userYoutubeLinks: (s.userYoutubeLinks || []).filter(link => link.id !== linkId)
          };
        }
        return s;
      }));
    } catch (error) {
      console.error('Failed to delete YouTube link:', error);
      alert(error instanceof Error ? error.message : '删除失败');
    }
  };

  const extractTimeFromSnapshotName = (snapshotName: string): string => {
    // Extract time from snapshot name format: "ScriptName-YYYY-MM-DD HH:MM:SS"
    const match = snapshotName.match(/(\d{4}-\d{2}-\d{2}\s+\d{1,2}:\d{1,2})/);
    if (match) {
      // Convert format from "YYYY-MM-DD HH:MM" to "YYYY/MM/DD HH:MM"
      return match[1].replace(/(\d{4})-(\d{2})-(\d{2})/, '$1/$2/$3');
    }
    return snapshotName;
  };

  const extractScriptNameOnly = (snapshotName: string): string => {
    // Extract script name from format: "ScriptName-YYYY-MM-DD HH:MM:SS"
    const match = snapshotName.match(/^(.+?)-\d{4}-\d{2}-\d{2}/);
    if (match) {
      return match[1];
    }
    return snapshotName;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        {/* Background overlay */}
        <div
          className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75"
          onClick={onClose}
        />

        {/* Modal panel */}
        <div className="inline-block w-full max-w-6xl my-8 overflow-hidden text-left align-middle transition-all transform bg-white rounded-lg shadow-xl">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">工作记录</h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-500"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Content */}
          <div className="px-6 py-4 max-h-[70vh] overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500" />
              </div>
            ) : snapshots.length === 0 ? (
              <div className="text-center py-12">
                <Clock className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                <p className="text-gray-500 mb-2">暂无工作记录</p>
                <p className="text-sm text-gray-400">点击"保存工作"按钮可保存当前工作状态</p>
              </div>
            ) : (
              <div className="space-y-2">
                {snapshots.map((snapshot) => {
                  const isRestoring = loadingSnapshotId === snapshot.id;

                  return (
                    <div
                      key={snapshot.id}
                      className="border border-gray-200 rounded p-3 hover:bg-gray-50"
                    >
                      <div className="space-y-2">
                        {/* 第一行：基本信息和操作按钮 */}
                        <div className="flex items-center gap-4">
                          {/* 保存时间 */}
                          <div className="flex-shrink-0 w-36">
                            <p className="text-xs text-gray-500">保存时间</p>
                            <p className="text-sm text-gray-900">{extractTimeFromSnapshotName(snapshot.snapshotName)}</p>
                          </div>

                          {/* 记录名称 */}
                          <div className="flex-shrink-0 w-44">
                            <p className="text-xs text-gray-500">记录名称</p>
                            <p className="text-sm text-gray-900 truncate">
                              {snapshot.customName || '(无)'}
                            </p>
                          </div>

                          {/* 脚本名称 */}
                          <div className="flex-shrink-0 w-44">
                            <p className="text-xs text-gray-500">脚本名称</p>
                            <p className="text-sm text-gray-900 truncate">{extractScriptNameOnly(snapshot.snapshotName)}</p>
                          </div>

                          {/* 视频上传和列表 */}
                          <div className="flex-1 min-w-0">
                            <VideoUploader
                              snapshotId={snapshot.id}
                              videos={snapshot.videos || []}
                              onUploadSuccess={(video) => handleVideoUploadSuccess(snapshot.id, video)}
                              onDeleteSuccess={(videoId) => handleVideoDeleteSuccess(snapshot.id, videoId)}
                            />
                          </div>

                          {/* 操作按钮 */}
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <button
                              onClick={() => handleRestore(snapshot.id)}
                              disabled={isRestoring}
                              className="flex items-center px-3 py-1.5 text-sm font-medium text-blue-600 hover:bg-blue-50 rounded disabled:opacity-50"
                              title="恢复工作状态"
                            >
                              <RotateCcw className={`w-4 h-4 mr-1 ${isRestoring ? 'animate-spin' : ''}`} />
                              {isRestoring ? '恢复中...' : '恢复'}
                            </button>
                            <button
                              onClick={() => handleDelete(snapshot.id)}
                              className="p-1.5 text-red-600 hover:bg-red-50 rounded"
                              title="删除"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>

                        {/* 第二行：YouTube链接管理 */}
                        <div className="flex items-center gap-2 flex-wrap pl-2 pt-1 border-t border-gray-100">
                          <span className="text-xs text-gray-500">YouTube链接:</span>

                          {/* 已有的链接列表 */}
                          {(snapshot.userYoutubeLinks || []).map((link) => (
                            <div
                              key={link.id}
                              className="flex items-center gap-1 px-2 py-1 bg-blue-50 rounded text-xs"
                            >
                              <a
                                href={link.youtubeUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-600 hover:underline flex items-center gap-1"
                                title={link.notes || link.youtubeUrl}
                              >
                                <ExternalLink className="w-3 h-3" />
                                {link.youtubeUrl.length > 30
                                  ? link.youtubeUrl.substring(0, 30) + '...'
                                  : link.youtubeUrl}
                              </a>
                              <button
                                onClick={() => handleDeleteYoutubeLink(snapshot.id, link.id)}
                                className="ml-1 text-red-600 hover:text-red-800"
                                title="删除链接"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                          ))}

                          {/* 添加链接按钮或输入框 */}
                          {addingLinkSnapshotId === snapshot.id ? (
                            <div className="flex items-center gap-1">
                              <input
                                type="text"
                                value={newYoutubeUrl}
                                onChange={(e) => setNewYoutubeUrl(e.target.value)}
                                placeholder="输入YouTube链接"
                                className="px-2 py-1 text-xs border border-gray-300 rounded w-64"
                                onKeyPress={(e) => {
                                  if (e.key === 'Enter') {
                                    handleAddYoutubeLink(snapshot.id);
                                  }
                                }}
                                autoFocus
                              />
                              <button
                                onClick={() => handleAddYoutubeLink(snapshot.id)}
                                className="px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700"
                              >
                                确定
                              </button>
                              <button
                                onClick={() => {
                                  setAddingLinkSnapshotId(null);
                                  setNewYoutubeUrl('');
                                }}
                                className="px-2 py-1 text-xs bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
                              >
                                取消
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => setAddingLinkSnapshotId(snapshot.id)}
                              className="flex items-center gap-1 px-2 py-1 text-xs text-blue-600 hover:bg-blue-50 rounded border border-blue-200"
                            >
                              <Plus className="w-3 h-3" />
                              添加链接
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
            <button
              onClick={onClose}
              className="w-full px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
            >
              关闭
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WorkSnapshotsModal;
