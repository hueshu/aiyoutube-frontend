import { useAuthStore } from '../store/authStore'

export default function Dashboard() {
  const { user } = useAuthStore()

  return (
    <div className="bg-white rounded-lg shadow-md p-8">
      <h1 className="text-3xl font-bold text-gray-800 mb-4">
        欢迎使用 AIYOUTUBE 分镜生成平台
      </h1>
      <div className="text-gray-600 space-y-2">
        <p>您好，{user?.username}！</p>
        <p>您可以通过顶部导航栏访问各个功能模块：</p>
        <ul className="list-disc list-inside mt-4 space-y-1">
          <li>脚本库 - 管理和查看您的视频脚本</li>
          <li>角色库 - 管理您的角色素材</li>
          <li>工作台 - 创建和编辑分镜</li>
          <li>项目管理 - 管理您的所有项目</li>
          <li>日志监控 - 查看系统运行日志</li>
          {user?.role === 'admin' && <li>管理面板 - 系统管理功能</li>}
        </ul>
      </div>
    </div>
  )
}