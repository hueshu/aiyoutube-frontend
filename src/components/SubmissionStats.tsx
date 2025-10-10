import React, { useState, useEffect } from 'react';
import { FileText, Users, ChevronRight, RefreshCw, TrendingUp, Calendar } from 'lucide-react';

interface UserStats {
  id: number;
  username: string;
  email: string;
  role: string;
  workspace_daily_limit: number;
  character_daily_limit: number;
  script_daily_limit: number;
  generation_daily_limit: number;
  created_at: string;
  total_submissions: number;
  workspace_today: number;
  character_today: number;
  script_today: number;
  generation_today: number;
}

interface SubmissionLog {
  id: number;
  submission_type: string;
  endpoint: string;
  request_data: string | null;
  created_at: string;
}

interface UserDetail {
  user: {
    id: number;
    username: string;
    email: string;
    role: string;
    workspace_daily_limit: number;
    character_daily_limit: number;
    script_daily_limit: number;
    generation_daily_limit: number;
    created_at: string;
  };
  statistics: {
    total_submissions: number;
    today_submissions: number;
    by_type: Array<{ submission_type: string; count: number }>;
    today_by_type: Array<{ submission_type: string; count: number }>;
  };
}

const SubmissionStats: React.FC = () => {
  const [users, setUsers] = useState<UserStats[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [userDetail, setUserDetail] = useState<UserDetail | null>(null);
  const [submissions, setSubmissions] = useState<SubmissionLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [loadingSubmissions, setLoadingSubmissions] = useState(false);
  const [view, setView] = useState<'users' | 'detail' | 'submissions'>('users');
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [editingUserId, setEditingUserId] = useState<number | null>(null);
  const [editingType, setEditingType] = useState<string | null>(null);
  const [newLimit, setNewLimit] = useState<number>(500);

  const submissionTypeNames: Record<string, string> = {
    workspace: 'Workspace保存',
    character: '角色上传',
    script: '脚本上传',
    generation: '图片生成'
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const response = await fetch('https://aiyoutubebackendprod.email777.org/api/v1/admin/stats/users', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setUsers(data.users || []);
      } else {
        console.error('Failed to fetch users');
      }
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchUserDetail = async (userId: number) => {
    setLoadingDetail(true);
    try {
      const response = await fetch(`https://aiyoutubebackendprod.email777.org/api/v1/admin/stats/users/${userId}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setUserDetail(data);
      } else {
        console.error('Failed to fetch user detail');
      }
    } catch (error) {
      console.error('Error fetching user detail:', error);
    } finally {
      setLoadingDetail(false);
    }
  };

  const fetchSubmissions = async (userId: number, type?: string) => {
    setLoadingSubmissions(true);
    try {
      const typeParam = type ? `?type=${type}` : '';
      const response = await fetch(`https://aiyoutubebackendprod.email777.org/api/v1/admin/stats/users/${userId}/submissions${typeParam}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setSubmissions(data.submissions || []);
      } else {
        console.error('Failed to fetch submissions');
      }
    } catch (error) {
      console.error('Error fetching submissions:', error);
    } finally {
      setLoadingSubmissions(false);
    }
  };

  const updateDailyLimit = async (userId: number, type: string, limit: number) => {
    try {
      const response = await fetch(`https://aiyoutubebackendprod.email777.org/api/v1/admin/stats/users/${userId}/limit/${type}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ limit })
      });

      if (response.ok) {
        fetchUsers();
        setEditingUserId(null);
        setEditingType(null);
      } else {
        console.error('Failed to update limit');
      }
    } catch (error) {
      console.error('Error updating limit:', error);
    }
  };

  const handleUserClick = async (userId: number) => {
    setSelectedUserId(userId);
    setView('detail');
    await fetchUserDetail(userId);
  };

  const handleViewSubmissions = async (userId: number, type?: string) => {
    setSelectedType(type || null);
    setView('submissions');
    await fetchSubmissions(userId, type);
  };

  const handleBack = () => {
    if (view === 'submissions') {
      setView('detail');
    } else {
      setView('users');
      setSelectedUserId(null);
      setUserDetail(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold flex items-center">
            <FileText className="w-6 h-6 mr-2" />
            提交统计
          </h2>
          <div className="flex items-center space-x-2">
            {view !== 'users' && (
              <button
                onClick={handleBack}
                className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300 flex items-center"
              >
                返回
              </button>
            )}
            <button
              onClick={() => {
                if (view === 'users') fetchUsers();
                else if (view === 'detail' && selectedUserId) fetchUserDetail(selectedUserId);
                else if (view === 'submissions' && selectedUserId) fetchSubmissions(selectedUserId, selectedType || undefined);
              }}
              className="p-2 text-gray-600 hover:text-blue-600"
              title="刷新"
            >
              <RefreshCw className={`w-5 h-5 ${loading || loadingDetail || loadingSubmissions ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {view === 'users' && (
          <div>
            <div className="overflow-x-auto">
              {loading ? (
                <div className="flex justify-center items-center py-20">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
                </div>
              ) : users.length === 0 ? (
                <div className="text-center py-20 text-gray-500">
                  <Users className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                  <p>暂无数据</p>
                </div>
              ) : (
                <table className="w-full border-collapse text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-2">ID</th>
                      <th className="text-left p-2">用户名</th>
                      <th className="text-left p-2">邮箱</th>
                      <th className="text-left p-2">角色</th>
                      <th className="text-left p-2">Workspace</th>
                      <th className="text-left p-2">角色图</th>
                      <th className="text-left p-2">脚本</th>
                      <th className="text-left p-2">生成</th>
                      <th className="text-left p-2">总量</th>
                      <th className="text-left p-2">操作</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((user) => {
                      const renderLimitCell = (type: string, todayCount: number, limit: number) => {
                        const isEditing = editingUserId === user.id && editingType === type;
                        const percentage = (todayCount / limit) * 100;

                        return (
                          <td className="p-2">
                            {isEditing ? (
                              <div className="flex items-center space-x-1">
                                <input
                                  type="number"
                                  value={newLimit}
                                  onChange={(e) => setNewLimit(parseInt(e.target.value))}
                                  className="w-16 border rounded px-1 py-0.5 text-xs"
                                  min="0"
                                />
                                <button
                                  onClick={() => updateDailyLimit(user.id, type, newLimit)}
                                  className="text-green-600 hover:text-green-700 text-xs"
                                >
                                  ✓
                                </button>
                                <button
                                  onClick={() => {
                                    setEditingUserId(null);
                                    setEditingType(null);
                                  }}
                                  className="text-gray-600 hover:text-gray-700 text-xs"
                                >
                                  ✗
                                </button>
                              </div>
                            ) : (
                              <div className="flex flex-col">
                                <div className="flex items-center justify-between mb-1">
                                  <span className={`font-semibold ${
                                    percentage >= 100 ? 'text-red-600' :
                                    percentage >= 80 ? 'text-orange-600' :
                                    'text-green-600'
                                  }`}>
                                    {todayCount}/{limit}
                                  </span>
                                  <button
                                    onClick={() => {
                                      setEditingUserId(user.id);
                                      setEditingType(type);
                                      setNewLimit(limit);
                                    }}
                                    className="text-blue-600 hover:text-blue-700 text-xs"
                                  >
                                    改
                                  </button>
                                </div>
                                <div className="w-full bg-gray-200 rounded-full h-1.5">
                                  <div
                                    className={`h-1.5 rounded-full ${
                                      percentage >= 100 ? 'bg-red-500' :
                                      percentage >= 80 ? 'bg-orange-500' :
                                      'bg-green-500'
                                    }`}
                                    style={{ width: `${Math.min(percentage, 100)}%` }}
                                  ></div>
                                </div>
                              </div>
                            )}
                          </td>
                        );
                      };

                      return (
                        <tr key={user.id} className="border-b hover:bg-gray-50">
                          <td className="p-2">{user.id}</td>
                          <td className="p-2">
                            <button
                              onClick={() => handleUserClick(user.id)}
                              className="text-blue-600 hover:underline"
                            >
                              {user.username}
                            </button>
                          </td>
                          <td className="p-2 text-xs">{user.email}</td>
                          <td className="p-2">
                            <span className={`px-2 py-1 rounded text-xs ${
                              user.role === 'admin' ? 'bg-red-100 text-red-600' :
                              user.role === 'employee' ? 'bg-purple-100 text-purple-600' :
                              'bg-blue-100 text-blue-600'
                            }`}>
                              {user.role === 'admin' ? '管理员' :
                               user.role === 'employee' ? '员工' :
                               '用户'}
                            </span>
                          </td>
                          {renderLimitCell('workspace', user.workspace_today, user.workspace_daily_limit)}
                          {renderLimitCell('character', user.character_today, user.character_daily_limit)}
                          {renderLimitCell('script', user.script_today, user.script_daily_limit)}
                          {renderLimitCell('generation', user.generation_today, user.generation_daily_limit)}
                          <td className="p-2">
                            <button
                              onClick={() => handleUserClick(user.id)}
                              className="text-blue-600 hover:underline font-semibold"
                            >
                              {user.total_submissions}
                            </button>
                          </td>
                          <td className="p-2">
                            <button
                              onClick={() => handleUserClick(user.id)}
                              className="text-blue-500 hover:text-blue-700"
                            >
                              <ChevronRight className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}

        {view === 'detail' && userDetail && (
          <div className="space-y-6">
            {loadingDetail ? (
              <div className="flex justify-center items-center py-20">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
              </div>
            ) : (
              <>
                <div className="bg-gray-50 rounded-lg p-4">
                  <h3 className="font-semibold text-lg mb-2">用户信息</h3>
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                      <span className="text-gray-600">用户名：</span>
                      <span className="font-semibold">{userDetail.user.username}</span>
                    </div>
                    <div>
                      <span className="text-gray-600">邮箱：</span>
                      <span>{userDetail.user.email}</span>
                    </div>
                    <div>
                      <span className="text-gray-600">角色：</span>
                      <span>{userDetail.user.role}</span>
                    </div>
                  </div>
                  <h4 className="font-semibold text-md mb-2">每日限制</h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div className="bg-white rounded p-2">
                      <div className="text-xs text-gray-600 mb-1">Workspace</div>
                      <div className="font-semibold text-blue-600">{userDetail.user.workspace_daily_limit}</div>
                    </div>
                    <div className="bg-white rounded p-2">
                      <div className="text-xs text-gray-600 mb-1">角色图</div>
                      <div className="font-semibold text-blue-600">{userDetail.user.character_daily_limit}</div>
                    </div>
                    <div className="bg-white rounded p-2">
                      <div className="text-xs text-gray-600 mb-1">脚本</div>
                      <div className="font-semibold text-blue-600">{userDetail.user.script_daily_limit}</div>
                    </div>
                    <div className="bg-white rounded p-2">
                      <div className="text-xs text-gray-600 mb-1">生成</div>
                      <div className="font-semibold text-blue-600">{userDetail.user.generation_daily_limit}</div>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-blue-50 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-semibold flex items-center">
                        <TrendingUp className="w-4 h-4 mr-2" />
                        总提交量
                      </h3>
                    </div>
                    <button
                      onClick={() => handleViewSubmissions(userDetail.user.id)}
                      className="text-3xl font-bold text-blue-600 hover:underline"
                    >
                      {userDetail.statistics.total_submissions}
                    </button>
                  </div>

                  <div className="bg-green-50 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-semibold flex items-center">
                        <Calendar className="w-4 h-4 mr-2" />
                        今日提交量
                      </h3>
                    </div>
                    <button
                      onClick={() => handleViewSubmissions(userDetail.user.id)}
                      className="text-3xl font-bold text-green-600 hover:underline"
                    >
                      {userDetail.statistics.today_submissions}
                    </button>
                  </div>
                </div>

                <div className="bg-gray-50 rounded-lg p-4">
                  <h3 className="font-semibold mb-4">总提交量（按类型）</h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {userDetail.statistics.by_type.map((item) => (
                      <button
                        key={item.submission_type}
                        onClick={() => handleViewSubmissions(userDetail.user.id, item.submission_type)}
                        className="bg-white rounded-lg p-3 hover:shadow-md transition-shadow text-left"
                      >
                        <div className="text-sm text-gray-600 mb-1">
                          {submissionTypeNames[item.submission_type] || item.submission_type}
                        </div>
                        <div className="text-2xl font-bold text-blue-600">
                          {item.count}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="bg-gray-50 rounded-lg p-4">
                  <h3 className="font-semibold mb-4">今日提交量（按类型）</h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {userDetail.statistics.today_by_type.map((item) => (
                      <button
                        key={item.submission_type}
                        onClick={() => handleViewSubmissions(userDetail.user.id, item.submission_type)}
                        className="bg-white rounded-lg p-3 hover:shadow-md transition-shadow text-left"
                      >
                        <div className="text-sm text-gray-600 mb-1">
                          {submissionTypeNames[item.submission_type] || item.submission_type}
                        </div>
                        <div className="text-2xl font-bold text-green-600">
                          {item.count}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {view === 'submissions' && (
          <div>
            <div className="mb-4">
              <h3 className="font-semibold text-lg">
                提交记录
                {selectedType && (
                  <span className="ml-2 text-sm text-gray-600">
                    （{submissionTypeNames[selectedType] || selectedType}）
                  </span>
                )}
              </h3>
            </div>

            {loadingSubmissions ? (
              <div className="flex justify-center items-center py-20">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
              </div>
            ) : submissions.length === 0 ? (
              <div className="text-center py-20 text-gray-500">
                <FileText className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                <p>暂无提交记录</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="border-b bg-gray-50">
                      <th className="text-left p-3">ID</th>
                      <th className="text-left p-3">类型</th>
                      <th className="text-left p-3">接口</th>
                      <th className="text-left p-3">请求数据</th>
                      <th className="text-left p-3">提交时间</th>
                    </tr>
                  </thead>
                  <tbody>
                    {submissions.map((submission) => (
                      <tr key={submission.id} className="border-b hover:bg-gray-50">
                        <td className="p-3">{submission.id}</td>
                        <td className="p-3">
                          <span className="px-2 py-1 rounded text-xs bg-blue-100 text-blue-600">
                            {submissionTypeNames[submission.submission_type] || submission.submission_type}
                          </span>
                        </td>
                        <td className="p-3 text-sm text-gray-600">{submission.endpoint}</td>
                        <td className="p-3">
                          {submission.request_data ? (
                            <details className="cursor-pointer">
                              <summary className="text-blue-600 hover:underline text-sm">
                                查看详情
                              </summary>
                              <pre className="mt-2 text-xs bg-gray-50 p-2 rounded overflow-x-auto">
                                {JSON.stringify(JSON.parse(submission.request_data), null, 2)}
                              </pre>
                            </details>
                          ) : (
                            <span className="text-gray-400 text-sm">无</span>
                          )}
                        </td>
                        <td className="p-3 text-sm">
                          {new Date(submission.created_at).toLocaleString('zh-CN')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default SubmissionStats;
