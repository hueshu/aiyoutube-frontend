import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../store/authStore';
import { Users, BarChart, UserPlus, Trash2, Edit, Shield, Activity, Eye, EyeOff, CheckCircle, XCircle, AlertCircle, RefreshCw } from 'lucide-react';

interface User {
  id: number;
  username: string;
  role: 'admin' | 'user';
  created_at: string;
  last_login?: string;
  is_active: boolean;
  usage_limit: number;
  usage_count: number;
  stats?: {
    scripts: number;
    characters: number;
    generations: number;
  };
}

interface SystemStats {
  overview: {
    total_users: number;
    total_scripts: number;
    total_characters: number;
    total_projects: number;
    total_generations: number;
    successful_generations: number;
    failed_generations: number;
    total_images_generated: number;
  };
  daily_stats: Array<{
    date: string;
    count: number;
    prompts: number;
  }>;
  top_users: Array<{
    username: string;
    generation_count: number;
    total_prompts: number;
  }>;
}

// Toast组件
const Toast: React.FC<{ message: string; type: 'success' | 'error' | 'info'; onClose: () => void }> = ({ message, type, onClose }) => {
  useEffect(() => {
    const timer = setTimeout(onClose, 3000);
    return () => clearTimeout(timer);
  }, [onClose]);

  const icons = {
    success: <CheckCircle className="w-5 h-5" />,
    error: <XCircle className="w-5 h-5" />,
    info: <AlertCircle className="w-5 h-5" />
  };

  const colors = {
    success: 'bg-green-500',
    error: 'bg-red-500',
    info: 'bg-blue-500'
  };

  return (
    <div className={`fixed top-4 right-4 ${colors[type]} text-white px-4 py-3 rounded-lg shadow-lg flex items-center space-x-2 z-50 animate-slide-in`}>
      {icons[type]}
      <span>{message}</span>
    </div>
  );
};

const AdminPanel: React.FC = () => {
  const { user } = useAuthStore();
  const [users, setUsers] = useState<User[]>([]);
  const [stats, setStats] = useState<SystemStats | null>(null);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [activeTab, setActiveTab] = useState<'users' | 'stats'>('users');
  const [searchTerm, setSearchTerm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [confirmPassword, setConfirmPassword] = useState('');
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    role: 'user' as 'admin' | 'user',
    usage_limit: 1000,
    is_active: true
  });

  const [formErrors, setFormErrors] = useState({
    username: '',
    password: '',
    confirmPassword: ''
  });

  // 显示Toast消息
  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    setToast({ message, type });
  };

  useEffect(() => {
    if (user?.role === 'admin') {
      fetchUsers();
      fetchStats();
    }
  }, [user]);

  const fetchUsers = async () => {
    setLoadingUsers(true);
    try {
      const response = await fetch(`https://aiyoutube-backend-prod.hueshu.workers.dev/api/v1/admin/users?search=${searchTerm}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setUsers(data.users || []);
      } else {
        showToast('获取用户列表失败', 'error');
      }
    } catch (error) {
      console.error('Failed to fetch users:', error);
      showToast('网络错误，请稍后重试', 'error');
    } finally {
      setLoadingUsers(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await fetch('https://aiyoutube-backend-prod.hueshu.workers.dev/api/v1/admin/stats', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setStats(data);
      }
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    }
  };

  // 验证表单
  const validateForm = () => {
    const errors = {
      username: '',
      password: '',
      confirmPassword: ''
    };

    if (!formData.username) {
      errors.username = '用户名不能为空';
    } else if (formData.username.length < 3) {
      errors.username = '用户名至少3个字符';
    }

    if (isCreateModalOpen || formData.password) {
      if (!formData.password) {
        errors.password = '密码不能为空';
      } else if (formData.password.length < 6) {
        errors.password = '密码至少6个字符';
      }

      if (isCreateModalOpen && formData.password !== confirmPassword) {
        errors.confirmPassword = '两次密码输入不一致';
      }
    }

    setFormErrors(errors);
    return !errors.username && !errors.password && !errors.confirmPassword;
  };

  const createUser = async () => {
    if (!validateForm()) {
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('https://aiyoutube-backend-prod.hueshu.workers.dev/api/v1/admin/users', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        await fetchUsers();
        setIsCreateModalOpen(false);
        resetForm();
        showToast('用户创建成功', 'success');
      } else {
        const error = await response.json();
        showToast(error.error || '创建用户失败', 'error');
      }
    } catch (error) {
      console.error('Failed to create user:', error);
      showToast('网络错误，请稍后重试', 'error');
    } finally {
      setLoading(false);
    }
  };

  const updateUser = async () => {
    if (!selectedUser) return;

    if (!validateForm()) {
      return;
    }

    setLoading(true);
    try {
      const updateData: any = {
        username: formData.username,
        role: formData.role,
        usage_limit: formData.usage_limit,
        is_active: formData.is_active
      };

      if (formData.password) {
        updateData.password = formData.password;
      }

      const response = await fetch(`https://aiyoutube-backend-prod.hueshu.workers.dev/api/v1/admin/users/${selectedUser.id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(updateData)
      });

      if (response.ok) {
        await fetchUsers();
        setIsEditModalOpen(false);
        resetForm();
        showToast('用户更新成功', 'success');
      } else {
        const error = await response.json();
        showToast(error.error || '更新用户失败', 'error');
      }
    } catch (error) {
      console.error('Failed to update user:', error);
      showToast('网络错误，请稍后重试', 'error');
    } finally {
      setLoading(false);
    }
  };

  const deleteUser = async (userId: number, username: string) => {
    if (!confirm(`确定要删除用户 "${username}" 吗？\n\n此操作不可恢复，该用户的所有数据将被永久删除。`)) return;

    try {
      const response = await fetch(`https://aiyoutube-backend-prod.hueshu.workers.dev/api/v1/admin/users/${userId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        await fetchUsers();
        showToast(`用户 "${username}" 已删除`, 'success');
      } else {
        const error = await response.json();
        showToast(error.error || '删除用户失败', 'error');
      }
    } catch (error) {
      console.error('Failed to delete user:', error);
      showToast('网络错误，请稍后重试', 'error');
    }
  };

  const resetForm = () => {
    setFormData({
      username: '',
      password: '',
      role: 'user',
      usage_limit: 1000,
      is_active: true
    });
    setConfirmPassword('');
    setShowPassword(false);
    setFormErrors({
      username: '',
      password: '',
      confirmPassword: ''
    });
    setSelectedUser(null);
  };

  const openEditModal = (user: User) => {
    setSelectedUser(user);
    setFormData({
      username: user.username,
      password: '',
      role: user.role,
      usage_limit: user.usage_limit,
      is_active: user.is_active
    });
    setIsEditModalOpen(true);
  };

  if (user?.role !== 'admin') {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <p className="text-red-500">只有管理员可以访问此页面</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold flex items-center">
            <Shield className="w-6 h-6 mr-2" />
            管理面板
          </h2>
          <div className="flex space-x-2">
            <button
              onClick={() => setActiveTab('users')}
              className={`px-4 py-2 rounded ${activeTab === 'users' ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}
            >
              <Users className="w-4 h-4 inline mr-2" />
              用户管理
            </button>
            <button
              onClick={() => setActiveTab('stats')}
              className={`px-4 py-2 rounded ${activeTab === 'stats' ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}
            >
              <BarChart className="w-4 h-4 inline mr-2" />
              系统统计
            </button>
          </div>
        </div>

        {activeTab === 'users' && (
          <div>
            <div className="flex justify-between items-center mb-4">
              <div className="flex items-center space-x-2">
                <input
                  type="text"
                  placeholder="搜索用户名（按回车搜索）..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && fetchUsers()}
                  className="border rounded px-3 py-2 w-64 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  onClick={fetchUsers}
                  className="p-2 text-gray-600 hover:text-blue-600 transition-colors"
                  title="刷新"
                >
                  <RefreshCw className={`w-5 h-5 ${loadingUsers ? 'animate-spin' : ''}`} />
                </button>
              </div>
              <button
                onClick={() => setIsCreateModalOpen(true)}
                className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 flex items-center"
              >
                <UserPlus className="w-4 h-4 mr-2" />
                创建用户
              </button>
            </div>

            <div className="overflow-x-auto">
              {loadingUsers ? (
                <div className="flex justify-center items-center py-20">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
                </div>
              ) : users.length === 0 ? (
                <div className="text-center py-20 text-gray-500">
                  <Users className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                  <p>暂无用户数据</p>
                  {searchTerm && <p className="mt-2 text-sm">试试其他搜索关键词</p>}
                </div>
              ) : (
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-2">ID</th>
                    <th className="text-left p-2">用户名</th>
                    <th className="text-left p-2">角色</th>
                    <th className="text-left p-2">状态</th>
                    <th className="text-left p-2">使用量</th>
                    <th className="text-left p-2">脚本</th>
                    <th className="text-left p-2">角色数</th>
                    <th className="text-left p-2">生成数</th>
                    <th className="text-left p-2">创建时间</th>
                    <th className="text-left p-2">操作</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user) => (
                    <tr key={user.id} className="border-b hover:bg-gray-50">
                      <td className="p-2">{user.id}</td>
                      <td className="p-2">{user.username}</td>
                      <td className="p-2">
                        <span className={`px-2 py-1 rounded text-xs ${
                          user.role === 'admin' ? 'bg-red-100 text-red-600' : 'bg-blue-100 text-blue-600'
                        }`}>
                          {user.role}
                        </span>
                      </td>
                      <td className="p-2">
                        <span className={`px-2 py-1 rounded text-xs ${
                          user.is_active ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-600'
                        }`}>
                          {user.is_active ? '活跃' : '禁用'}
                        </span>
                      </td>
                      <td className="p-2">{user.usage_count}/{user.usage_limit}</td>
                      <td className="p-2">{user.stats?.scripts || 0}</td>
                      <td className="p-2">{user.stats?.characters || 0}</td>
                      <td className="p-2">{user.stats?.generations || 0}</td>
                      <td className="p-2">{new Date(user.created_at).toLocaleDateString()}</td>
                      <td className="p-2">
                        <div className="flex space-x-2">
                          <button
                            onClick={() => openEditModal(user)}
                            className="text-blue-500 hover:text-blue-700"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => deleteUser(user.id, user.username)}
                            className="text-red-500 hover:text-red-700"
                            title="删除用户"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              )}
            </div>
          </div>
        )}

        {activeTab === 'stats' && stats && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-blue-50 rounded p-4">
                <div className="text-2xl font-bold text-blue-600">{stats.overview.total_users}</div>
                <div className="text-sm text-gray-600">总用户数</div>
              </div>
              <div className="bg-green-50 rounded p-4">
                <div className="text-2xl font-bold text-green-600">{stats.overview.total_scripts}</div>
                <div className="text-sm text-gray-600">总脚本数</div>
              </div>
              <div className="bg-purple-50 rounded p-4">
                <div className="text-2xl font-bold text-purple-600">{stats.overview.total_characters}</div>
                <div className="text-sm text-gray-600">总角色数</div>
              </div>
              <div className="bg-orange-50 rounded p-4">
                <div className="text-2xl font-bold text-orange-600">{stats.overview.total_projects}</div>
                <div className="text-sm text-gray-600">总项目数</div>
              </div>
            </div>

            <div className="bg-gray-50 rounded p-4">
              <h3 className="font-semibold mb-3 flex items-center">
                <Activity className="w-4 h-4 mr-2" />
                生成统计
              </h3>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <div className="text-xl font-bold">{stats.overview.total_generations}</div>
                  <div className="text-sm text-gray-600">总生成次数</div>
                </div>
                <div>
                  <div className="text-xl font-bold text-green-600">{stats.overview.successful_generations}</div>
                  <div className="text-sm text-gray-600">成功次数</div>
                </div>
                <div>
                  <div className="text-xl font-bold text-red-600">{stats.overview.failed_generations}</div>
                  <div className="text-sm text-gray-600">失败次数</div>
                </div>
              </div>
            </div>

            <div className="bg-gray-50 rounded p-4">
              <h3 className="font-semibold mb-3">最近7天生成统计</h3>
              <div className="space-y-2">
                {stats.daily_stats.map((day) => (
                  <div key={day.date} className="flex justify-between items-center">
                    <span className="text-sm">{day.date}</span>
                    <span className="text-sm">生成 {day.count} 次</span>
                    <span className="text-sm text-gray-500">共 {day.prompts} 张图片</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-gray-50 rounded p-4">
              <h3 className="font-semibold mb-3">活跃用户排行</h3>
              <div className="space-y-2">
                {stats.top_users.map((user, index) => (
                  <div key={user.username} className="flex justify-between items-center">
                    <span className="text-sm">
                      #{index + 1} {user.username}
                    </span>
                    <span className="text-sm">
                      生成 {user.generation_count} 次，共 {user.total_prompts} 张图片
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Create/Edit User Modal */}
      {(isCreateModalOpen || isEditModalOpen) && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">
              {isCreateModalOpen ? '创建用户' : '编辑用户'}
            </h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">用户名 <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  value={formData.username}
                  onChange={(e) => {
                    setFormData({ ...formData, username: e.target.value });
                    setFormErrors({ ...formErrors, username: '' });
                  }}
                  className={`w-full border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 ${formErrors.username ? 'border-red-500' : ''}`}
                  placeholder="输入用户名（至少3个字符）"
                />
                {formErrors.username && (
                  <p className="text-red-500 text-xs mt-1">{formErrors.username}</p>
                )}
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">
                  密码 {isCreateModalOpen && <span className="text-red-500">*</span>} {isEditModalOpen && <span className="text-gray-500 text-xs">(留空保持不变)</span>}
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={formData.password}
                    onChange={(e) => {
                      setFormData({ ...formData, password: e.target.value });
                      setFormErrors({ ...formErrors, password: '' });
                    }}
                    className={`w-full border rounded px-3 py-2 pr-10 focus:outline-none focus:ring-2 focus:ring-blue-500 ${formErrors.password ? 'border-red-500' : ''}`}
                    placeholder={isEditModalOpen ? '留空保持不变' : '输入密码（至少6个字符）'}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
                {formErrors.password && (
                  <p className="text-red-500 text-xs mt-1">{formErrors.password}</p>
                )}
              </div>

              {isCreateModalOpen && (
                <div>
                  <label className="block text-sm font-medium mb-1">
                    确认密码 <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={(e) => {
                        setConfirmPassword(e.target.value);
                        setFormErrors({ ...formErrors, confirmPassword: '' });
                      }}
                      className={`w-full border rounded px-3 py-2 pr-10 focus:outline-none focus:ring-2 focus:ring-blue-500 ${formErrors.confirmPassword ? 'border-red-500' : ''}`}
                      placeholder="再次输入密码"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                    >
                      {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                  {formErrors.confirmPassword && (
                    <p className="text-red-500 text-xs mt-1">{formErrors.confirmPassword}</p>
                  )}
                </div>
              )}
              
              <div>
                <label className="block text-sm font-medium mb-1">角色</label>
                <select
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value as 'admin' | 'user' })}
                  className="w-full border rounded px-3 py-2"
                >
                  <option value="user">普通用户</option>
                  <option value="admin">管理员</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">使用限制</label>
                <input
                  type="number"
                  value={formData.usage_limit}
                  onChange={(e) => setFormData({ ...formData, usage_limit: parseInt(e.target.value) })}
                  className="w-full border rounded px-3 py-2"
                  placeholder="输入使用限制"
                />
              </div>
              
              <div>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={formData.is_active}
                    onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                    className="mr-2"
                  />
                  <span className="text-sm">启用账户</span>
                </label>
              </div>
            </div>
            
            <div className="flex justify-end space-x-2 mt-6">
              <button
                onClick={() => {
                  isCreateModalOpen ? setIsCreateModalOpen(false) : setIsEditModalOpen(false);
                  resetForm();
                }}
                className="px-4 py-2 border rounded hover:bg-gray-100"
                disabled={loading}
              >
                取消
              </button>
              <button
                onClick={isCreateModalOpen ? createUser : updateUser}
                className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                disabled={loading}
              >
                {loading ? (
                  <span className="flex items-center">
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    处理中...
                  </span>
                ) : (isCreateModalOpen ? '创建用户' : '保存修改')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast消息 */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  );
};

export default AdminPanel;