import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { Home, FileText, Users, Palette, Shield, LogOut, FileSearch, Settings, BookOpen, ChevronDown, Music, Video, Image as ImageIcon } from 'lucide-react';

const Navigation: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();
  const [showLibraryDropdown, setShowLibraryDropdown] = useState(false);
  const [showPromptDropdown, setShowPromptDropdown] = useState(false);
  const [showImageGenDropdown, setShowImageGenDropdown] = useState(false);

  const navItems = [
    { path: '/', label: '首页', icon: Home },
  ];

  // 日志监控仅管理员可见
  if (user?.role === 'admin') {
    navItems.push({ path: '/logs', label: '日志监控', icon: FileSearch });
  }

  // 设置放到最后
  navItems.push({ path: '/settings', label: '设置', icon: Settings });

  // 管理面板（管理员）
  if (user?.role === 'admin') {
    navItems.push({ path: '/admin', label: '管理面板', icon: Shield });
  }

  const imageGenItems = [
    { path: '/workspace', label: '生成分镜图', icon: Palette },
    { path: '/character-image', label: '单图处理（角色图）', icon: ImageIcon },
  ];

  const promptItems = [
    { path: '/video-script-generator', label: '生成视频脚本', icon: FileText },
    { path: '/video-prompt', label: '图生视频prompt', icon: Video },
  ];

  const libraryItems = [
    { path: '/scripts', label: '脚本库', icon: FileText },
    { path: '/characters', label: '角色库', icon: Users },
    { path: '/music', label: '音乐库', icon: Music },
    { path: '/benchmark-videos', label: '对标视频库', icon: Video },
  ];

  const handleLogout = () => {
    if (confirm('确定要退出登录吗？')) {
      logout();
      navigate('/login');
    }
  };

  const isLibraryActive = libraryItems.some(item => location.pathname === item.path);
  const isPromptActive = promptItems.some(item => location.pathname === item.path);
  const isImageGenActive = imageGenItems.some(item => location.pathname === item.path);

  return (
    <nav className="bg-white shadow-md">
      <div className="container mx-auto px-4">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center space-x-8">
            <h1 className="text-xl font-bold text-blue-600">StoryGo.net</h1>
            <div className="flex space-x-4">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.path;
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={`flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                      isActive
                        ? 'bg-blue-100 text-blue-700'
                        : 'text-gray-600 hover:text-blue-600 hover:bg-blue-50'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{item.label}</span>
                  </Link>
                );
              })}

              {/* 生图下拉菜单 */}
              <div className="relative">
                <button
                  onClick={() => setShowImageGenDropdown(!showImageGenDropdown)}
                  onBlur={() => setTimeout(() => setShowImageGenDropdown(false), 200)}
                  className={`flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    isImageGenActive
                      ? 'bg-blue-100 text-blue-700'
                      : 'text-gray-600 hover:text-blue-600 hover:bg-blue-50'
                  }`}
                >
                  <ImageIcon className="w-4 h-4" />
                  <span>生图</span>
                  <ChevronDown className="w-3 h-3" />
                </button>

                {showImageGenDropdown && (
                  <div className="absolute top-full left-0 mt-1 w-56 bg-white rounded-md shadow-lg border border-gray-200 z-50">
                    {imageGenItems.map((item) => {
                      const Icon = item.icon;
                      const isActive = location.pathname === item.path;
                      return (
                        <Link
                          key={item.path}
                          to={item.path}
                          className={`flex items-center space-x-2 px-4 py-2 text-sm transition-colors ${
                            isActive
                              ? 'bg-blue-50 text-blue-700'
                              : 'text-gray-600 hover:bg-gray-50'
                          }`}
                        >
                          <Icon className="w-4 h-4" />
                          <span>{item.label}</span>
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* 生成prompt下拉菜单 */}
              <div className="relative">
                <button
                  onClick={() => setShowPromptDropdown(!showPromptDropdown)}
                  onBlur={() => setTimeout(() => setShowPromptDropdown(false), 200)}
                  className={`flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    isPromptActive
                      ? 'bg-blue-100 text-blue-700'
                      : 'text-gray-600 hover:text-blue-600 hover:bg-blue-50'
                  }`}
                >
                  <Video className="w-4 h-4" />
                  <span>生成prompt</span>
                  <ChevronDown className="w-3 h-3" />
                </button>

                {showPromptDropdown && (
                  <div className="absolute top-full left-0 mt-1 w-48 bg-white rounded-md shadow-lg border border-gray-200 z-50">
                    {promptItems.map((item) => {
                      const Icon = item.icon;
                      const isActive = location.pathname === item.path;
                      return (
                        <Link
                          key={item.path}
                          to={item.path}
                          className={`flex items-center space-x-2 px-4 py-2 text-sm transition-colors ${
                            isActive
                              ? 'bg-blue-50 text-blue-700'
                              : 'text-gray-600 hover:bg-gray-50'
                          }`}
                        >
                          <Icon className="w-4 h-4" />
                          <span>{item.label}</span>
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* 库下拉菜单 */}
              <div className="relative">
                <button
                  onClick={() => setShowLibraryDropdown(!showLibraryDropdown)}
                  onBlur={() => setTimeout(() => setShowLibraryDropdown(false), 200)}
                  className={`flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    isLibraryActive
                      ? 'bg-blue-100 text-blue-700'
                      : 'text-gray-600 hover:text-blue-600 hover:bg-blue-50'
                  }`}
                >
                  <BookOpen className="w-4 h-4" />
                  <span>库</span>
                  <ChevronDown className="w-3 h-3" />
                </button>

                {showLibraryDropdown && (
                  <div className="absolute top-full left-0 mt-1 w-40 bg-white rounded-md shadow-lg border border-gray-200 z-50">
                    {libraryItems.map((item) => {
                      const Icon = item.icon;
                      const isActive = location.pathname === item.path;
                      return (
                        <Link
                          key={item.path}
                          to={item.path}
                          className={`flex items-center space-x-2 px-4 py-2 text-sm transition-colors ${
                            isActive
                              ? 'bg-blue-50 text-blue-700'
                              : 'text-gray-600 hover:bg-gray-50'
                          }`}
                        >
                          <Icon className="w-4 h-4" />
                          <span>{item.label}</span>
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
          
          <div className="flex items-center space-x-4">
            <span className="text-sm text-gray-600">
              {user?.username} ({user?.role === 'admin' ? '管理员' : '用户'})
            </span>
            <button
              onClick={handleLogout}
              className="flex items-center space-x-2 text-gray-600 hover:text-red-600 transition-colors"
            >
              <LogOut className="w-4 h-4" />
              <span>退出</span>
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navigation;