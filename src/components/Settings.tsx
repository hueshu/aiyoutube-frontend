import React, { useState, useEffect } from 'react'
import { Settings as FiSettings, Key as FiKey, Save as FiSave, Eye as FiEye, EyeOff as FiEyeOff, Check as FiCheck, X as FiX, AlertCircle as FiAlertCircle } from 'lucide-react'

interface SettingsData {
  username: string
  role: string
  has_api_key: boolean
  api_key_masked: string | null
  require_own_key: boolean
  api_key_updated_at: string | null
}

interface ToastProps {
  message: string
  type: 'success' | 'error' | 'info'
  onClose: () => void
}

const Toast: React.FC<ToastProps> = ({ message, type, onClose }) => {
  useEffect(() => {
    const timer = setTimeout(onClose, 3000)
    return () => clearTimeout(timer)
  }, [onClose])

  const bgColor = {
    success: 'bg-green-500',
    error: 'bg-red-500',
    info: 'bg-blue-500'
  }[type]

  const icon = {
    success: <FiCheck className="w-5 h-5" />,
    error: <FiX className="w-5 h-5" />,
    info: <FiAlertCircle className="w-5 h-5" />
  }[type]

  return (
    <div className={`fixed top-4 right-4 ${bgColor} text-white px-4 py-3 rounded-lg shadow-lg flex items-center gap-2 animate-slide-in z-50`}>
      {icon}
      <span>{message}</span>
    </div>
  )
}

const Settings: React.FC = () => {
  const [settings, setSettings] = useState<SettingsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [apiKey, setApiKey] = useState('')
  const [showApiKey, setShowApiKey] = useState(false)
  const [saving, setSaving] = useState(false)
  const [testing, setTesting] = useState(false)
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null)

  useEffect(() => {
    fetchSettings()
  }, [])

  const fetchSettings = async () => {
    try {
      const response = await fetch('https://aiyoutube-backend-prod.hueshu.workers.dev/api/v1/settings', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      })
      const data = await response.json()
      setSettings(data)
    } catch (error) {
      console.error('Failed to fetch settings:', error)
      setToast({ message: '获取设置失败', type: 'error' })
    } finally {
      setLoading(false)
    }
  }

  const handleSaveApiKey = async () => {
    if (!apiKey) {
      setToast({ message: '请输入API key', type: 'error' })
      return
    }

    if (!apiKey.startsWith('sk-')) {
      setToast({ message: 'API key格式不正确，应以sk-开头', type: 'error' })
      return
    }

    setSaving(true)
    try {
      const response = await fetch('https://aiyoutube-backend-prod.hueshu.workers.dev/api/v1/settings/api-key', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ api_key: apiKey })
      })
      const data = await response.json()
      if (response.ok) {
        setSettings(prev => prev ? {
          ...prev,
          has_api_key: true,
          api_key_masked: data.api_key_masked,
          api_key_updated_at: new Date().toISOString()
        } : null)
        setApiKey('')
        setShowApiKey(false)
        setToast({ message: 'API key保存成功', type: 'success' })
      } else {
        setToast({ message: data.error || '保存失败', type: 'error' })
      }
    } catch (error) {
      setToast({ message: '保存失败', type: 'error' })
    } finally {
      setSaving(false)
    }
  }

  const handleTestApiKey = async () => {
    const keyToTest = apiKey || (settings?.has_api_key ? 'existing' : '')

    if (!keyToTest && !settings?.has_api_key) {
      setToast({ message: '请先配置API key', type: 'error' })
      return
    }

    setTesting(true)
    try {
      const response = await fetch('https://aiyoutube-backend-prod.hueshu.workers.dev/api/v1/settings/test-api-key', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          api_key: apiKey || undefined
        })
      })
      const data = await response.json()

      if (data.valid) {
        setToast({ message: data.message || 'API key验证成功', type: 'success' })
      } else {
        setToast({ message: data.error || '验证失败', type: 'error' })
      }
    } catch (error) {
      setToast({ message: '测试失败', type: 'error' })
    } finally {
      setTesting(false)
    }
  }

  const handleDeleteApiKey = async () => {
    if (!confirm('确定要删除API key吗？')) {
      return
    }

    try {
      const response = await fetch('https://aiyoutube-backend-prod.hueshu.workers.dev/api/v1/settings/api-key', {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      })

      if (response.ok) {
        setSettings(prev => prev ? {
          ...prev,
          has_api_key: false,
          api_key_masked: null,
          api_key_updated_at: null
        } : null)
        setToast({ message: 'API key已删除', type: 'success' })
      } else {
        const data = await response.json()
        setToast({ message: data.error || '删除失败', type: 'error' })
      }
    } catch (error) {
      setToast({ message: '删除失败', type: 'error' })
    }
  }

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      </div>
    )
  }

  if (!settings) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-600">加载设置失败，请刷新页面重试</p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}

      <div className="bg-white rounded-lg shadow-md">
        <div className="p-6 border-b">
          <div className="flex items-center gap-3">
            <FiSettings className="w-6 h-6 text-gray-600" />
            <h1 className="text-2xl font-bold">设置</h1>
          </div>
        </div>

        <div className="p-6">
          {/* User Info */}
          <div className="mb-8">
            <h2 className="text-lg font-semibold mb-4">账户信息</h2>
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-500">用户名</p>
                  <p className="font-medium">{settings.username}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">角色</p>
                  <p className="font-medium">
                    {settings.role === 'admin' ? '管理员' : '用户'}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* API Key Section - Only show if user requires own key */}
          {settings.require_own_key ? (
          <div>
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <FiKey className="w-5 h-5" />
              云雾 API Key 配置
            </h2>

            {(
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
                <div className="flex items-start gap-2">
                  <FiAlertCircle className="w-5 h-5 text-yellow-600 mt-0.5" />
                  <div>
                    <p className="text-yellow-800 font-medium">需要配置API Key</p>
                    <p className="text-yellow-700 text-sm mt-1">
                      您的账户需要配置自己的云雾API key才能使用生图功能
                    </p>
                  </div>
                </div>
              </div>
            )}

            {settings.has_api_key ? (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-green-800 font-medium">已配置API Key</p>
                    <p className="text-green-700 text-sm mt-1">
                      {settings.api_key_masked}
                    </p>
                    {settings.api_key_updated_at && (
                      <p className="text-green-600 text-xs mt-1">
                        更新时间: {new Date(settings.api_key_updated_at).toLocaleString()}
                      </p>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={handleTestApiKey}
                      disabled={testing}
                      className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50 text-sm"
                    >
                      {testing ? '测试中...' : '测试连接'}
                    </button>
                    {!settings.require_own_key && (
                      <button
                        onClick={handleDeleteApiKey}
                        className="px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600 text-sm"
                      >
                        删除
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-4">
                <p className="text-gray-600">尚未配置API Key</p>
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {settings.has_api_key ? '更新API Key' : '配置API Key'}
                </label>
                <div className="flex gap-2">
                  <div className="flex-1 relative">
                    <input
                      type={showApiKey ? 'text' : 'password'}
                      value={apiKey}
                      onChange={(e) => setApiKey(e.target.value)}
                      placeholder="sk-..."
                      className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowApiKey(!showApiKey)}
                      className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                    >
                      {showApiKey ? <FiEyeOff className="w-5 h-5" /> : <FiEye className="w-5 h-5" />}
                    </button>
                  </div>
                  <button
                    onClick={handleSaveApiKey}
                    disabled={saving || !apiKey}
                    className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 flex items-center gap-2"
                  >
                    <FiSave className="w-4 h-4" />
                    {saving ? '保存中...' : '保存'}
                  </button>
                  {apiKey && (
                    <button
                      onClick={handleTestApiKey}
                      disabled={testing}
                      className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 disabled:opacity-50"
                    >
                      {testing ? '测试中...' : '测试'}
                    </button>
                  )}
                </div>
                <p className="text-sm text-gray-500 mt-2">
                  请输入您的云雾AI API密钥。您可以从
                  <a href="https://yunwu.ai" target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline mx-1">
                    云雾AI控制台
                  </a>
                  获取API Key
                </p>
              </div>
            </div>
          </div>
          ) : (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-center gap-2">
                <FiCheck className="w-5 h-5 text-blue-600" />
                <div>
                  <p className="text-blue-800 font-medium">使用系统API Key</p>
                  <p className="text-blue-700 text-sm mt-1">
                    您的账户已配置为使用系统提供的API Key，无需自行配置
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default Settings