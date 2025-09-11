import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useStore } from '../store';
import { useAuthStore } from '../store/authStore';
import { Home, FileText, Users, Palette, Folder, Shield, LogOut, FileSearch } from 'lucide-react';

const Navigation: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useStore();
  const { logout } = useAuthStore();

  const navItems = [
    { path: '/', label: '首页', icon: Home },
    { path: '/scripts', label: '脚本库', icon: FileText },
    { path: '/characters', label: '角色库', icon: Users },
    { path: '/workspace', label: '工作台', icon: Palette },
    { path: '/projects', label: '项目管理', icon: Folder },
    { path: '/logs', label: '日志监控', icon: FileSearch },
  ];

  if (user?.role === 'admin') {
    navItems.push({ path: '/admin', label: '管理面板', icon: Shield });
  }

  const handleLogout = () => {
    if (confirm('确定要退出登录吗？')) {
      logout();
      navigate('/login');
    }
  };

  return (
    <nav className="bg-white shadow-md">
      <div className="container mx-auto px-4">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center space-x-8">
            <h1 className="text-xl font-bold text-blue-600">AIYOUTUBE</h1>
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
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <span className="text-sm text-gray-600">
              {user?.username} ({user?.role === 'admin' ? '管理员' : '用户'})
            </span>
            <button
              onClick={handleLogout}
              className="flex items-center space-x-1 text-sm text-red-600 hover:text-red-700"
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