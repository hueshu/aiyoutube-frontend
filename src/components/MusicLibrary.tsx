import React, { useState, useEffect, useRef } from 'react';
import { Upload, Download, Edit, Trash2, Play, Pause, Plus, X, Music } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { API_URL } from '../config/api';

interface Music {
  id: number;
  name: string;
  category: string;
  file_path: string;
  file_size: number;
  duration?: string;
  created_at: string;
  updated_at: string;
  owner_name?: string;
  isOwner?: boolean;
  user_id?: number;
}

export default function MusicLibrary() {
  const { user } = useAuthStore();
  const [music, setMusic] = useState<Music[]>([]);
  const [categories, setCategories] = useState<string[]>(['全部']);
  const [selectedCategory, setSelectedCategory] = useState('全部');
  const [libraryScope, setLibraryScope] = useState<'mine' | 'system'>('mine');
  const [canAccessSystem, setCanAccessSystem] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [editingMusic, setEditingMusic] = useState<Music | null>(null);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [newCategory, setNewCategory] = useState('');
  const [editingCategory, setEditingCategory] = useState<string | null>(null);
  const [editingCategoryName, setEditingCategoryName] = useState('');

  // Audio player state
  const [playingId, setPlayingId] = useState<number | null>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const audioRef = useRef<HTMLAudioElement>(null);

  // Form states for upload
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadName, setUploadName] = useState('');
  const [uploadCategory, setUploadCategory] = useState('');

  useEffect(() => {
    const loadData = async () => {
      setInitialLoading(true);
      await Promise.all([
        fetchMusic(),
        fetchCategories()
      ]);
      setInitialLoading(false);
    };
    loadData();
  }, []);

  useEffect(() => {
    // Check if user can access system library
    if (user) {
      const canAccess = user.role === 'admin' ||
                       user.role === 'employee' ||
                       user.can_access_system_library === true;
      setCanAccessSystem(canAccess);
    }
  }, [user]);

  useEffect(() => {
    // Reload music when scope changes
    if (!initialLoading) {
      fetchMusicWithScope(libraryScope);
    }
  }, [libraryScope]);

  useEffect(() => {
    if (audioRef.current) {
      const audio = audioRef.current;
      const updateTime = () => setCurrentTime(audio.currentTime);
      const updateDuration = () => setDuration(audio.duration);
      const handleEnded = () => setPlayingId(null);

      audio.addEventListener('timeupdate', updateTime);
      audio.addEventListener('loadedmetadata', updateDuration);
      audio.addEventListener('ended', handleEnded);

      return () => {
        audio.removeEventListener('timeupdate', updateTime);
        audio.removeEventListener('loadedmetadata', updateDuration);
        audio.removeEventListener('ended', handleEnded);
      };
    }
  }, [playingId]);

  const fetchMusicWithScope = async (scope: 'mine' | 'system') => {
    try {
      const response = await fetch(`${API_URL}/music?scope=${scope}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      if (response.ok) {
        const data = await response.json();
        setMusic(data.music || []);
      }
    } catch (error) {
      console.error('Failed to fetch music:', error);
    }
  };

  const fetchMusic = async () => {
    await fetchMusicWithScope(libraryScope);
  };

  const fetchCategories = async () => {
    try {
      const response = await fetch(`${API_URL}/music/categories/list`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      if (response.ok) {
        const data = await response.json();
        const filteredCategories = data.categories.filter((cat: string) => cat !== '未分类');
        setCategories(['全部', ...filteredCategories, '未分类']);
      }
    } catch (error) {
      console.error('Failed to fetch categories:', error);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setUploadFile(file);

      if (!uploadName) {
        const nameWithoutExt = file.name.replace(/\.[^/.]+$/, '');
        setUploadName(nameWithoutExt);
      }
    }
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadFile) return;

    setLoading(true);
    const formData = new FormData();
    formData.append('file', uploadFile);
    formData.append('name', uploadName);
    formData.append('category', uploadCategory || '未分类');

    try {
      const response = await fetch(`${API_URL}/music`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: formData
      });

      if (response.ok) {
        setShowUploadModal(false);
        resetUploadForm();
        await fetchMusic();
        await fetchCategories();
        alert('上传成功！');
      } else {
        const data = await response.json();
        alert(data.error || '上传失败');
      }
    } catch (error) {
      console.error('Upload failed:', error);
      alert('上传失败: ' + (error as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const resetUploadForm = () => {
    setUploadFile(null);
    setUploadName('');
    setUploadCategory('');
  };

  const handleEdit = (music: Music) => {
    setEditingMusic(music);
    setShowEditModal(true);
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingMusic) return;

    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/music/${editingMusic.id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: editingMusic.name,
          category: editingMusic.category
        })
      });

      if (response.ok) {
        setShowEditModal(false);
        setEditingMusic(null);
        await fetchMusic();
        await fetchCategories();
      }
    } catch (error) {
      console.error('Update failed:', error);
      alert('更新失败');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('确定要删除这个音乐吗？')) return;

    try {
      const response = await fetch(`${API_URL}/music/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        if (playingId === id) {
          setPlayingId(null);
          if (audioRef.current) {
            audioRef.current.pause();
          }
        }
        await fetchMusic();
      }
    } catch (error) {
      console.error('Delete failed:', error);
      alert('删除失败');
    }
  };

  const handleDownload = async (music: Music) => {
    try {
      const response = await fetch(`${API_URL}/music/${music.id}/download`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${music.name}.mp3`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
      }
    } catch (error) {
      console.error('Download failed:', error);
      alert('下载失败');
    }
  };

  const handlePlay = async (musicItem: Music) => {
    if (playingId === musicItem.id) {
      // Pause if clicking on currently playing music
      if (audioRef.current) {
        audioRef.current.pause();
      }
      setPlayingId(null);
    } else {
      // Play new music
      setPlayingId(musicItem.id);
      if (audioRef.current) {
        try {
          const response = await fetch(`${API_URL}/music/${musicItem.id}/stream`, {
            headers: {
              'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
          });
          if (response.ok) {
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            audioRef.current.src = url;
            audioRef.current.play();
          }
        } catch (error) {
          console.error('Failed to play music:', error);
          setPlayingId(null);
        }
      }
    }
  };

  const handleAddCategory = async () => {
    if (!newCategory || categories.includes(newCategory)) {
      if (categories.includes(newCategory)) {
        alert('该分类已存在');
      }
      return;
    }

    try {
      const response = await fetch(`${API_URL}/music/categories`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ name: newCategory })
      });

      if (response.ok) {
        setCategories([...categories.slice(0, -1), newCategory, '未分类']);
        setNewCategory('');
        alert('分类添加成功');
      } else {
        const data = await response.json();
        alert(data.error || '添加失败');
      }
    } catch (error) {
      console.error('Failed to add category:', error);
      alert('添加失败');
    }
  };

  const handleRenameCategory = async (oldName: string) => {
    if (!editingCategoryName || editingCategoryName === oldName) {
      setEditingCategory(null);
      setEditingCategoryName('');
      return;
    }

    if (categories.includes(editingCategoryName)) {
      alert('该分类名已存在');
      return;
    }

    try {
      const response = await fetch(`${API_URL}/music/categories/${encodeURIComponent(oldName)}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ newName: editingCategoryName })
      });

      if (response.ok) {
        const updatedCategories = categories.map(c =>
          c === oldName ? editingCategoryName : c
        );
        setCategories(updatedCategories);
        if (selectedCategory === oldName) {
          setSelectedCategory(editingCategoryName);
        }
        setEditingCategory(null);
        setEditingCategoryName('');
        await fetchMusic();
        alert('分类重命名成功');
      } else {
        const data = await response.json();
        alert(data.error || '重命名失败');
      }
    } catch (error) {
      console.error('Failed to rename category:', error);
      alert('重命名失败');
    }
  };

  const handleDeleteCategory = async (categoryName: string) => {
    if (!confirm(`确定要删除分类"${categoryName}"吗？该分类下的所有音乐将被移至"未分类"。`)) {
      return;
    }

    try {
      const response = await fetch(`${API_URL}/music/categories/${encodeURIComponent(categoryName)}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        const updatedCategories = categories.filter(c => c !== categoryName);
        setCategories(updatedCategories);
        if (selectedCategory === categoryName) {
          setSelectedCategory('全部');
        }
        await fetchMusic();
        alert('分类删除成功');
      } else {
        const data = await response.json();
        alert(data.error || '删除失败');
      }
    } catch (error) {
      console.error('Failed to delete category:', error);
      alert('删除失败');
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const filteredMusic = selectedCategory === '全部'
    ? music
    : music.filter((m: Music) => m.category === selectedCategory || (selectedCategory === '未分类' && !m.category));

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-4">
          <h2 className="text-2xl font-bold text-gray-900">音乐库</h2>
          {canAccessSystem && (
            <div className="flex bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => setLibraryScope('mine')}
                className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                  libraryScope === 'mine'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                我的音乐库
              </button>
              <button
                onClick={() => setLibraryScope('system')}
                className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                  libraryScope === 'system'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                系统音乐库
              </button>
            </div>
          )}
        </div>
        <button
          onClick={() => setShowUploadModal(true)}
          className="flex items-center space-x-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
          disabled={libraryScope === 'system'}
        >
          <Upload className="w-4 h-4" />
          <span>上传音乐</span>
        </button>
      </div>

      {/* Category tabs */}
      <div className="mb-6 flex items-center space-x-4 border-b">
        {categories.map((category) => (
          <button
            key={category}
            onClick={() => setSelectedCategory(category)}
            className={`pb-2 px-1 border-b-2 transition-colors ${
              selectedCategory === category
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-600 hover:text-blue-600'
            }`}
          >
            {category}
          </button>
        ))}
        <button
          onClick={() => setShowCategoryModal(true)}
          className="pb-2 px-1 text-gray-400 hover:text-gray-600"
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>

      {/* Music list */}
      {initialLoading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">加载中...</p>
        </div>
      ) : filteredMusic.length === 0 ? (
        <div className="text-center py-12">
          <Music className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600">暂无音乐</p>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">播放</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">名称</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">分类</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">大小</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">上传时间</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredMusic.map((item) => (
                <tr key={item.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => handlePlay(item)}
                        className="text-blue-500 hover:text-blue-700 transition-colors"
                      >
                        {playingId === item.id ? (
                          <Pause className="w-5 h-5" />
                        ) : (
                          <Play className="w-5 h-5" />
                        )}
                      </button>
                      <button
                        onClick={() => handleDownload(item)}
                        className="text-gray-600 hover:text-blue-600 transition-colors"
                        title="下载"
                      >
                        <Download className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex flex-col">
                      <div className="flex items-center">
                        <Music className="w-4 h-4 text-gray-400 mr-2" />
                        <span className="text-gray-900">{item.name}</span>
                      </div>
                      {libraryScope === 'system' && item.owner_name && (
                        <span className="text-xs text-indigo-600 ml-6">所有者: {item.owner_name}</span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded">
                      {item.category || '未分类'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-gray-500">
                    {formatFileSize(item.file_size)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-gray-500">
                    {new Date(item.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {(libraryScope === 'mine' || item.isOwner) && (
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => handleEdit(item)}
                          className="text-gray-600 hover:text-blue-600 transition-colors"
                          title="编辑"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(item.id)}
                          className="text-gray-600 hover:text-red-600 transition-colors"
                          title="删除"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Audio player */}
      <audio ref={audioRef} className="hidden" />

      {playingId && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t shadow-lg p-4">
          <div className="container mx-auto flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => {
                  if (audioRef.current) {
                    audioRef.current.pause();
                  }
                  setPlayingId(null);
                }}
                className="text-gray-600 hover:text-gray-800"
              >
                <X className="w-5 h-5" />
              </button>
              <Music className="w-5 h-5 text-gray-400" />
              <span className="font-medium">
                {music.find(m => m.id === playingId)?.name}
              </span>
            </div>
            <div className="flex-1 mx-8">
              <div className="flex items-center space-x-4">
                <span className="text-sm text-gray-600">{formatTime(currentTime)}</span>
                <div className="flex-1 bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-blue-500 h-2 rounded-full"
                    style={{ width: `${(currentTime / duration) * 100 || 0}%` }}
                  />
                </div>
                <span className="text-sm text-gray-600">{formatTime(duration)}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-96">
            <h3 className="text-lg font-semibold mb-4">上传音乐</h3>
            <form onSubmit={handleUpload}>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  选择文件
                </label>
                <input
                  type="file"
                  accept="audio/*"
                  onChange={handleFileSelect}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  required
                />
                {uploadFile && (
                  <p className="mt-2 text-sm text-gray-600">
                    已选择: {uploadFile.name} ({formatFileSize(uploadFile.size)})
                  </p>
                )}
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  名称
                </label>
                <input
                  type="text"
                  value={uploadName}
                  onChange={(e) => setUploadName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  placeholder="输入音乐名称"
                  required
                />
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  分类
                </label>
                <select
                  value={uploadCategory}
                  onChange={(e) => setUploadCategory(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">选择分类</option>
                  {categories.filter(c => c !== '全部').map((cat) => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowUploadModal(false);
                    resetUploadForm();
                  }}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800"
                >
                  取消
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
                >
                  {loading ? '上传中...' : '上传'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {showEditModal && editingMusic && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-96">
            <h3 className="text-lg font-semibold mb-4">编辑音乐</h3>
            <form onSubmit={handleUpdate}>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  名称
                </label>
                <input
                  type="text"
                  value={editingMusic.name}
                  onChange={(e) => setEditingMusic({ ...editingMusic, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  分类
                </label>
                <select
                  value={editingMusic.category}
                  onChange={(e) => setEditingMusic({ ...editingMusic, category: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                >
                  {categories.filter(c => c !== '全部').map((cat) => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowEditModal(false);
                    setEditingMusic(null);
                  }}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800"
                >
                  取消
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
                >
                  {loading ? '保存中...' : '保存'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Category Management Modal */}
      {showCategoryModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-96">
            <h3 className="text-lg font-semibold mb-4">管理分类</h3>

            <div className="mb-4">
              <div className="flex space-x-2">
                <input
                  type="text"
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                  placeholder="输入新分类名称"
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
                <button
                  onClick={handleAddCategory}
                  className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                >
                  添加
                </button>
              </div>
            </div>

            <div className="space-y-2 max-h-64 overflow-y-auto">
              {categories.filter(c => c !== '全部' && c !== '未分类').map((cat) => (
                <div key={cat} className="flex items-center justify-between p-2 hover:bg-gray-50 rounded">
                  {editingCategory === cat ? (
                    <input
                      type="text"
                      value={editingCategoryName}
                      onChange={(e) => setEditingCategoryName(e.target.value)}
                      onBlur={() => handleRenameCategory(cat)}
                      onKeyPress={(e) => {
                        if (e.key === 'Enter') {
                          handleRenameCategory(cat);
                        }
                      }}
                      className="flex-1 px-2 py-1 border border-gray-300 rounded"
                      autoFocus
                    />
                  ) : (
                    <>
                      <span className="flex-1">{cat}</span>
                      <div className="flex space-x-1">
                        <button
                          onClick={() => {
                            setEditingCategory(cat);
                            setEditingCategoryName(cat);
                          }}
                          className="p-1 text-gray-600 hover:text-blue-600"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteCategory(cat)}
                          className="p-1 text-gray-600 hover:text-red-600"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>

            <div className="mt-4 flex justify-end">
              <button
                onClick={() => setShowCategoryModal(false)}
                className="px-4 py-2 text-gray-600 hover:text-gray-800"
              >
                关闭
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}