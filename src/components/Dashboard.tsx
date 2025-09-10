import { useState } from 'react'
import { useAuthStore } from '../store/authStore'
import ScriptLibrary from './ScriptLibrary'
import CharacterLibrary from './CharacterLibrary'
import StoryboardWorkspace from './StoryboardWorkspace'

type TabType = 'scripts' | 'characters' | 'workspace' | 'admin'

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState<TabType>('scripts')
  const { user, logout } = useAuthStore()

  const tabs = [
    { id: 'scripts', label: '脚本库', icon: '📝' },
    { id: 'characters', label: '角色库', icon: '🎭' },
    { id: 'workspace', label: '分镜工作台', icon: '🎬' },
    ...(user?.role === 'admin' ? [{ id: 'admin', label: '管理', icon: '⚙️' }] : [])
  ]

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <h1 className="text-3xl font-bold text-gray-900">
              AIYOUTUBE 分镜生成平台
            </h1>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-500">
                欢迎, {user?.username} ({user?.role === 'admin' ? '管理员' : '用户'})
              </span>
              <button
                onClick={logout}
                className="bg-red-500 hover:bg-red-700 text-white font-bold py-2 px-4 rounded"
              >
                退出
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Navigation Tabs */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="-mb-px flex space-x-8">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as TabType)}
                className={`
                  py-4 px-1 border-b-2 font-medium text-sm
                  ${activeTab === tab.id
                    ? 'border-indigo-500 text-indigo-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }
                `}
              >
                <span className="mr-2">{tab.icon}</span>
                {tab.label}
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'scripts' && <ScriptLibrary />}
        {activeTab === 'characters' && <CharacterLibrary />}
        {activeTab === 'workspace' && <StoryboardWorkspace />}
        {activeTab === 'admin' && user?.role === 'admin' && (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-2xl font-bold mb-4">管理面板</h2>
            <p className="text-gray-600">管理功能开发中...</p>
          </div>
        )}
      </main>
    </div>
  )
}