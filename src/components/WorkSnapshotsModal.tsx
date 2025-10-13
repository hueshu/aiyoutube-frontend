import React, { useState, useEffect } from 'react';
import { X, Clock, Trash2, RotateCcw } from 'lucide-react';
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

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
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
                      <div className="flex items-center gap-4">
                        {/* 保存时间 */}
                        <div className="flex-shrink-0 w-36">
                          <p className="text-xs text-gray-500">保存时间</p>
                          <p className="text-sm text-gray-900">{formatDate(snapshot.createdAt)}</p>
                        </div>

                        {/* 脚本名称 */}
                        <div className="flex-shrink-0 w-44">
                          <p className="text-xs text-gray-500">脚本名称</p>
                          <p className="text-sm text-gray-900 truncate">{snapshot.snapshotName}</p>
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
