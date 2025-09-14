import React, { useState, useEffect } from 'react';
import { useStore } from '../store'
import { useAuthStore } from '../store/authStore';
import { Folder, Plus, Trash2, Edit, Play, Download, Eye } from 'lucide-react';

interface Project {
  id: number;
  name: string;
  script_id: number;
  script_name?: string;
  character_mapping: Record<string, number>;
  image_size: string;
  model: string;
  last_generation_id?: string;
  created_at: string;
  updated_at: string;
}

interface GenerationTask {
  id: string;
  project_id: number;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: number;
  total: number;
  success_count?: number;
  failed_count?: number;
  error?: string;
}

const ProjectsManager: React.FC = () => {
  const { scripts, characters, fetchScripts, fetchCharacters } = useStore();
  const { user } = useAuthStore();
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [generationTask, setGenerationTask] = useState<GenerationTask | null>(null);
  const [generationResults, setGenerationResults] = useState<any[]>([]);
  const [showResults, setShowResults] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    script_id: '',
    character_mapping: {} as Record<string, number>,
    image_size: '1024x1024',
    model: 'sora_image'
  });

  useEffect(() => {
    fetchProjects();
    fetchScripts();
    fetchCharacters();
  }, []);

  useEffect(() => {
    if (generationTask?.status === 'processing') {
      const interval = setInterval(() => {
        checkTaskStatus(generationTask.id);
      }, 2000);
      return () => clearInterval(interval);
    }
  }, [generationTask]);

  const fetchProjects = async () => {
    try {
      const response = await fetch('https://aiyoutube-backend-prod.hueshu.workers.dev/api/v1/projects', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setProjects(data.projects || []);
      }
    } catch (error) {
      console.error('Failed to fetch projects:', error);
    }
  };

  const createProject = async () => {
    setLoading(true);
    try {
      const response = await fetch('https://aiyoutube-backend-prod.hueshu.workers.dev/api/v1/projects', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      });
      
      if (response.ok) {
        await fetchProjects();
        setIsCreateModalOpen(false);
        resetForm();
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to create project');
      }
    } catch (error) {
      console.error('Failed to create project:', error);
      alert('Failed to create project');
    } finally {
      setLoading(false);
    }
  };

  const updateProject = async () => {
    if (!selectedProject) return;
    
    setLoading(true);
    try {
      const response = await fetch(`https://aiyoutube-backend-prod.hueshu.workers.dev/api/v1/projects/${selectedProject.id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      });
      
      if (response.ok) {
        await fetchProjects();
        setIsEditModalOpen(false);
        resetForm();
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to update project');
      }
    } catch (error) {
      console.error('Failed to update project:', error);
      alert('Failed to update project');
    } finally {
      setLoading(false);
    }
  };

  const deleteProject = async (id: number) => {
    if (!confirm('Are you sure you want to delete this project?')) return;
    
    try {
      const response = await fetch(`https://aiyoutube-backend-prod.hueshu.workers.dev/api/v1/projects/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (response.ok) {
        await fetchProjects();
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to delete project');
      }
    } catch (error) {
      console.error('Failed to delete project:', error);
      alert('Failed to delete project');
    }
  };

  const startGeneration = async (projectId: number) => {
    setLoading(true);
    try {
      const response = await fetch(`https://aiyoutube-backend-prod.hueshu.workers.dev/api/v1/projects/${projectId}/generate`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setGenerationTask(data.task);
        alert('Generation started! Check the progress below.');
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to start generation');
      }
    } catch (error) {
      console.error('Failed to start generation:', error);
      alert('Failed to start generation');
    } finally {
      setLoading(false);
    }
  };

  const checkTaskStatus = async (taskId: string) => {
    try {
      const response = await fetch(`https://aiyoutube-backend-prod.hueshu.workers.dev/api/v1/generation/task/${taskId}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setGenerationTask(data.task);
        
        if (data.task.status === 'completed') {
          fetchGenerationResults(taskId);
        }
      }
    } catch (error) {
      console.error('Failed to check task status:', error);
    }
  };

  const fetchGenerationResults = async (taskId: string) => {
    try {
      const response = await fetch(`https://aiyoutube-backend-prod.hueshu.workers.dev/api/v1/generation/results/${taskId}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setGenerationResults(data.results || []);
        setShowResults(true);
      }
    } catch (error) {
      console.error('Failed to fetch results:', error);
    }
  };

  const downloadResults = () => {
    const successfulResults = generationResults.filter(r => r.success);
    const jsonData = JSON.stringify(successfulResults, null, 2);
    const blob = new Blob([jsonData], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `generation_${generationTask?.id || 'results'}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const resetForm = () => {
    setFormData({
      name: '',
      script_id: '',
      character_mapping: {},
      image_size: '1024x1024',
      model: 'sora_image'
    });
    setSelectedProject(null);
  };

  const openEditModal = (project: Project) => {
    setSelectedProject(project);
    setFormData({
      name: project.name,
      script_id: project.script_id.toString(),
      character_mapping: project.character_mapping,
      image_size: project.image_size,
      model: project.model
    });
    setIsEditModalOpen(true);
  };

  // Get unique characters from selected script
  const getScriptCharacters = () => {
    const script = scripts.find((s: any) => s.id === parseInt(formData.script_id));
    if (!script) return [];
    
    try {
      const lines = script.csv_content.split('\n').slice(1); // Skip header
      const characters = new Set<string>();
      
      lines.forEach((line: string) => {
        const cols = line.split(',');
        if (cols[2]) { // Character column
          characters.add(cols[2].trim());
        }
      });
      
      return Array.from(characters).filter(c => c);
    } catch (error) {
      return [];
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold flex items-center">
            <Folder className="w-6 h-6 mr-2" />
            项目管理
          </h2>
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 flex items-center"
          >
            <Plus className="w-4 h-4 mr-2" />
            创建项目
          </button>
        </div>

        {projects.length === 0 ? (
          <p className="text-gray-500 text-center py-8">暂无项目，请创建一个新项目</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {projects.map((project) => (
              <div key={project.id} className="border rounded-lg p-4 hover:shadow-lg transition-shadow">
                <h3 className="font-semibold text-lg mb-2">{project.name}</h3>
                <p className="text-sm text-gray-600 mb-1">脚本: {project.script_name || `#${project.script_id}`}</p>
                <p className="text-sm text-gray-600 mb-1">尺寸: {project.image_size}</p>
                <p className="text-sm text-gray-600 mb-3">模型: {project.model}</p>
                
                <div className="flex justify-between">
                  <button
                    onClick={() => startGeneration(project.id)}
                    className="bg-green-500 text-white px-3 py-1 rounded text-sm hover:bg-green-600 flex items-center"
                  >
                    <Play className="w-3 h-3 mr-1" />
                    生成
                  </button>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => openEditModal(project)}
                      className="text-blue-500 hover:text-blue-700"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => deleteProject(project.id)}
                      className="text-red-500 hover:text-red-700"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Generation Progress */}
      {generationTask && (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4">生成进度</h3>
          <div className="space-y-2">
            <p>状态: <span className={`font-semibold ${
              generationTask.status === 'completed' ? 'text-green-500' :
              generationTask.status === 'failed' ? 'text-red-500' :
              generationTask.status === 'processing' ? 'text-blue-500' :
              'text-gray-500'
            }`}>{generationTask.status}</span></p>
            <p>进度: {generationTask.progress} / {generationTask.total}</p>
            {generationTask.status === 'processing' && (
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${(generationTask.progress / generationTask.total) * 100}%` }}
                />
              </div>
            )}
            {generationTask.status === 'completed' && (
              <>
                <p className="text-green-600">成功: {generationTask.success_count || 0}</p>
                <p className="text-red-600">失败: {generationTask.failed_count || 0}</p>
                <button
                  onClick={() => setShowResults(true)}
                  className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 flex items-center mt-2"
                >
                  <Eye className="w-4 h-4 mr-2" />
                  查看结果
                </button>
              </>
            )}
            {generationTask.error && (
              <p className="text-red-500">错误: {generationTask.error}</p>
            )}
          </div>
        </div>
      )}

      {/* Results Display */}
      {showResults && generationResults.length > 0 && (
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold">生成结果</h3>
            <div className="space-x-2">
              <button
                onClick={downloadResults}
                className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 flex items-center"
              >
                <Download className="w-4 h-4 mr-2" />
                下载结果
              </button>
              <button
                onClick={() => setShowResults(false)}
                className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600"
              >
                关闭
              </button>
            </div>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {generationResults.map((result, index) => (
              <div key={index} className="border rounded p-2">
                {result.success ? (
                  <>
                    <img 
                      src={result.image_url} 
                      alt={`Frame ${result.frame_number}`}
                      className="w-full h-32 object-cover rounded mb-2"
                    />
                    <p className="text-xs text-gray-600">帧 {result.frame_number}</p>
                  </>
                ) : (
                  <div className="h-32 bg-gray-100 rounded mb-2 flex items-center justify-center">
                    <p className="text-red-500 text-xs text-center">
                      帧 {result.frame_number} 失败<br/>
                      {result.error}
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Create/Edit Modal */}
      {(isCreateModalOpen || isEditModalOpen) && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">
              {isCreateModalOpen ? '创建项目' : '编辑项目'}
            </h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">项目名称</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full border rounded px-3 py-2"
                  placeholder="输入项目名称"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">选择脚本</label>
                <select
                  value={formData.script_id}
                  onChange={(e) => setFormData({ ...formData, script_id: e.target.value, character_mapping: {} })}
                  className="w-full border rounded px-3 py-2"
                >
                  <option value="">选择脚本</option>
                  {scripts.map((script: any) => (
                    <option key={script.id} value={script.id}>
                      {script.name}
                    </option>
                  ))}
                </select>
              </div>
              
              {formData.script_id && getScriptCharacters().length > 0 && (
                <div>
                  <label className="block text-sm font-medium mb-1">角色映射</label>
                  <div className="space-y-2">
                    {getScriptCharacters().map((scriptChar) => (
                      <div key={scriptChar} className="flex items-center space-x-2">
                        <span className="w-20 text-sm">{scriptChar}:</span>
                        <select
                          value={formData.character_mapping[scriptChar] || ''}
                          onChange={(e) => setFormData({
                            ...formData,
                            character_mapping: {
                              ...formData.character_mapping,
                              [scriptChar]: parseInt(e.target.value)
                            }
                          })}
                          className="flex-1 border rounded px-2 py-1"
                        >
                          <option value="">选择角色</option>
                          {characters.map((char: any) => (
                            <option key={char.id} value={char.id}>
                              {char.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              <div>
                <label className="block text-sm font-medium mb-1">图片尺寸</label>
                <select
                  value={formData.image_size}
                  onChange={(e) => setFormData({ ...formData, image_size: e.target.value })}
                  className="w-full border rounded px-3 py-2"
                >
                  <option value="1024x1024">1024x1024</option>
                  <option value="1024x576">1024x576 (16:9)</option>
                  <option value="576x1024">576x1024 (9:16)</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">AI模型</label>
                <select
                  value={formData.model}
                  onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                  className="w-full border rounded px-3 py-2"
                >
                  <option value="sora_image">Sora Image</option>
                  <option value="gemini-2.5-flash-image-preview">Gemini Flash</option>
                </select>
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
                onClick={isCreateModalOpen ? createProject : updateProject}
                className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                disabled={loading || !formData.name || !formData.script_id}
              >
                {loading ? '处理中...' : (isCreateModalOpen ? '创建' : '保存')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProjectsManager;