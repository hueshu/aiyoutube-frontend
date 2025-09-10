import { useState, useEffect } from 'react'
import { useStore } from '../store'
import { API_URL } from '../config/api'
import { Download, Edit2, Trash2, Eye, Upload, Plus, Video } from 'lucide-react'

interface Script {
  id: number
  name: string
  csv_content: string
  category?: string
  video_link?: string
  created_at: string
  updated_at: string
  total_frames?: number
  characters?: string[]
}

export default function ScriptLibrary() {
  const { user, scripts, fetchScripts } = useStore()
  const [categories, setCategories] = useState<string[]>(['全部'])
  const [selectedCategory, setSelectedCategory] = useState('全部')
  const [showUploadModal, setShowUploadModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showPreviewModal, setShowPreviewModal] = useState(false)
  const [editingScript, setEditingScript] = useState<Script | null>(null)
  const [previewScript, setPreviewScript] = useState<Script | null>(null)
  const [loading, setLoading] = useState(false)
  const [initialLoading, setInitialLoading] = useState(true)
  const [newCategory, setNewCategory] = useState('')
  const [showNewCategoryInput, setShowNewCategoryInput] = useState(false)
  
  // Form states for upload
  const [uploadFile, setUploadFile] = useState<File | null>(null)
  const [uploadName, setUploadName] = useState('')
  const [uploadCategory, setUploadCategory] = useState('')
  const [uploadVideoLink, setUploadVideoLink] = useState('')

  useEffect(() => {
    // Load data immediately
    const loadData = async () => {
      setInitialLoading(true)
      await Promise.all([
        fetchScripts(),
        fetchCategories()
      ])
      setInitialLoading(false)
    }
    loadData()
  }, [])

  const fetchCategories = async () => {
    try {
      const response = await fetch(`${API_URL}/scripts/categories/list`, {
        headers: {
          'Authorization': `Bearer ${user?.token}`
        }
      })
      if (response.ok) {
        const data = await response.json()
        setCategories(['全部', ...data.categories, '未分类'])
      }
    } catch (error) {
      console.error('Failed to fetch categories:', error)
    }
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setUploadFile(file)
      
      // Auto-fill name from filename
      if (!uploadName) {
        setUploadName(file.name.replace('.csv', ''))
      }
      
      console.log('File selected:', file.name, 'Size:', file.size, 'Type:', file.type)
    }
  }

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!uploadFile) return
    
    console.log('Starting upload...')
    console.log('User token:', user?.token)
    console.log('File:', uploadFile)
    console.log('Name:', uploadName)
    console.log('Category:', uploadCategory || '未分类')
    
    setLoading(true)
    const formData = new FormData()
    formData.append('file', uploadFile)
    formData.append('name', uploadName)
    formData.append('category', uploadCategory || '未分类')
    if (uploadVideoLink) {
      formData.append('video_link', uploadVideoLink)
    }
    
    try {
      console.log('Sending request to:', `${API_URL}/scripts`)
      const response = await fetch(`${API_URL}/scripts`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${user?.token}`
        },
        body: formData
      })
      
      console.log('Response status:', response.status)
      const responseData = await response.json()
      console.log('Response data:', responseData)
      
      if (response.ok) {
        setShowUploadModal(false)
        resetUploadForm()
        await fetchScripts()
        await fetchCategories()
        alert('上传成功！')
      } else {
        alert(responseData.error || '上传失败')
      }
    } catch (error) {
      console.error('Upload failed:', error)
      alert('上传失败: ' + (error as Error).message)
    } finally {
      setLoading(false)
    }
  }

  const resetUploadForm = () => {
    setUploadFile(null)
    setUploadName('')
    setUploadCategory('')
    setUploadVideoLink('')
  }

  const handleEdit = (script: Script) => {
    setEditingScript(script)
    setShowEditModal(true)
  }

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingScript) return
    
    setLoading(true)
    try {
      const response = await fetch(`${API_URL}/scripts/${editingScript.id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${user?.token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: editingScript.name,
          category: editingScript.category,
          video_link: editingScript.video_link
        })
      })
      
      if (response.ok) {
        setShowEditModal(false)
        setEditingScript(null)
        await fetchScripts()
        await fetchCategories()
      }
    } catch (error) {
      console.error('Update failed:', error)
      alert('更新失败')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id: number) => {
    if (!confirm('确定要删除这个脚本吗？')) return
    
    try {
      const response = await fetch(`${API_URL}/scripts/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${user?.token}`
        }
      })
      
      if (response.ok) {
        await fetchScripts()
      }
    } catch (error) {
      console.error('Delete failed:', error)
      alert('删除失败')
    }
  }

  const handleDownload = async (script: Script) => {
    try {
      const response = await fetch(`${API_URL}/scripts/${script.id}/download`, {
        headers: {
          'Authorization': `Bearer ${user?.token}`
        }
      })
      
      if (response.ok) {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `${script.name}.csv`
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        window.URL.revokeObjectURL(url)
      }
    } catch (error) {
      console.error('Download failed:', error)
      alert('下载失败')
    }
  }

  const handlePreview = async (script: Script) => {
    try {
      const response = await fetch(`${API_URL}/scripts/${script.id}`, {
        headers: {
          'Authorization': `Bearer ${user?.token}`
        }
      })
      
      if (response.ok) {
        const data = await response.json()
        setPreviewScript(data.script)
        setShowPreviewModal(true)
      }
    } catch (error) {
      console.error('Failed to load script details:', error)
    }
  }

  const addNewCategory = () => {
    if (newCategory && !categories.includes(newCategory)) {
      setCategories([...categories, newCategory])
      setUploadCategory(newCategory)
      setNewCategory('')
      setShowNewCategoryInput(false)
    }
  }

  const filteredScripts = selectedCategory === '全部' 
    ? scripts 
    : scripts.filter((s: any) => s.category === selectedCategory || (selectedCategory === '未分类' && !s.category))

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-900">脚本库</h2>
        <button
          onClick={() => setShowUploadModal(true)}
          className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded flex items-center gap-2"
        >
          <Upload size={20} />
          上传脚本
        </button>
      </div>

      <div className="mb-6 border-b border-gray-200">
        <nav className="-mb-px flex space-x-4 overflow-x-auto">
          {categories.map((category) => (
            <button
              key={category}
              onClick={() => setSelectedCategory(category)}
              className={`py-2 px-3 border-b-2 font-medium text-sm whitespace-nowrap ${
                selectedCategory === category
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {category}
            </button>
          ))}
        </nav>
      </div>

      {initialLoading ? (
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
        </div>
      ) : filteredScripts.length === 0 ? (
        <div className="text-center py-8 text-gray-500">暂无脚本</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredScripts.map((script: any) => (
            <div key={script.id} className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold mb-2">{script.name}</h3>
              <p className="text-sm text-gray-500 mb-2">分类: {script.category || '未分类'}</p>
              {script.total_frames && (
                <p className="text-sm text-gray-500 mb-2">帧数: {script.total_frames}</p>
              )}
              {script.characters && script.characters.length > 0 && (
                <p className="text-sm text-gray-500 mb-2">角色: {script.characters.join(', ')}</p>
              )}
              {script.video_link && (
                <a
                  href={script.video_link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-blue-500 hover:underline flex items-center gap-1 mb-2"
                >
                  <Video size={14} />
                  查看原视频
                </a>
              )}
              <p className="text-xs text-gray-400">创建时间: {new Date(script.created_at).toLocaleDateString()}</p>
              
              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  onClick={() => handlePreview(script)}
                  className="text-sm bg-gray-200 hover:bg-gray-300 px-3 py-1 rounded flex items-center gap-1"
                >
                  <Eye size={14} />
                  预览
                </button>
                <button
                  onClick={() => handleDownload(script)}
                  className="text-sm bg-green-200 hover:bg-green-300 px-3 py-1 rounded flex items-center gap-1"
                >
                  <Download size={14} />
                  下载
                </button>
                <button
                  onClick={() => handleEdit(script)}
                  className="text-sm bg-blue-200 hover:bg-blue-300 px-3 py-1 rounded flex items-center gap-1"
                >
                  <Edit2 size={14} />
                  编辑
                </button>
                <button
                  onClick={() => handleDelete(script.id)}
                  className="text-sm bg-red-200 hover:bg-red-300 px-3 py-1 rounded flex items-center gap-1"
                >
                  <Trash2 size={14} />
                  删除
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-96 max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-bold mb-4">上传脚本</h3>
            <form onSubmit={handleUpload}>
              <div className="mb-4">
                <label className="block text-sm font-medium mb-2">脚本文件 (CSV格式) *</label>
                <input
                  type="file"
                  accept=".csv,text/csv,text/plain,application/vnd.ms-excel"
                  onChange={handleFileSelect}
                  required
                  className="w-full"
                />
                <p className="text-xs text-gray-500 mt-1">支持CSV格式文件，包括无扩展名的文本文件</p>
              </div>
              
              <div className="mb-4">
                <label className="block text-sm font-medium mb-2">脚本名称 *</label>
                <input
                  type="text"
                  value={uploadName}
                  onChange={(e) => setUploadName(e.target.value)}
                  required
                  className="w-full px-3 py-2 border rounded"
                  placeholder="输入脚本名称"
                />
              </div>
              
              <div className="mb-4">
                <label className="block text-sm font-medium mb-2">分类</label>
                {!showNewCategoryInput ? (
                  <div className="flex gap-2">
                    <select
                      value={uploadCategory}
                      onChange={(e) => setUploadCategory(e.target.value)}
                      className="flex-1 px-3 py-2 border rounded"
                    >
                      <option value="">选择分类</option>
                      {categories.filter(c => c !== '全部').map(cat => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={() => setShowNewCategoryInput(true)}
                      className="px-3 py-2 bg-gray-200 hover:bg-gray-300 rounded"
                    >
                      <Plus size={16} />
                    </button>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newCategory}
                      onChange={(e) => setNewCategory(e.target.value)}
                      placeholder="输入新分类名称"
                      className="flex-1 px-3 py-2 border rounded"
                      autoFocus
                    />
                    <button
                      type="button"
                      onClick={addNewCategory}
                      className="px-3 py-2 bg-green-500 text-white rounded hover:bg-green-600"
                    >
                      确定
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowNewCategoryInput(false)
                        setNewCategory('')
                      }}
                      className="px-3 py-2 bg-gray-200 hover:bg-gray-300 rounded"
                    >
                      取消
                    </button>
                  </div>
                )}
              </div>
              
              <div className="mb-4">
                <label className="block text-sm font-medium mb-2">原视频链接</label>
                <input
                  type="url"
                  value={uploadVideoLink}
                  onChange={(e) => setUploadVideoLink(e.target.value)}
                  className="w-full px-3 py-2 border rounded"
                  placeholder="https://..."
                />
              </div>
              
              <div className="flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowUploadModal(false)
                    resetUploadForm()
                  }}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800"
                  disabled={loading}
                >
                  取消
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
                  disabled={loading || !uploadFile || !uploadName}
                >
                  {loading ? '上传中...' : '上传'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {showEditModal && editingScript && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-96">
            <h3 className="text-lg font-bold mb-4">编辑脚本</h3>
            <form onSubmit={handleUpdate}>
              <div className="mb-4">
                <label className="block text-sm font-medium mb-2">脚本名称</label>
                <input
                  type="text"
                  value={editingScript.name}
                  onChange={(e) => setEditingScript({...editingScript, name: e.target.value})}
                  required
                  className="w-full px-3 py-2 border rounded"
                />
              </div>
              
              <div className="mb-4">
                <label className="block text-sm font-medium mb-2">分类</label>
                <select
                  value={editingScript.category}
                  onChange={(e) => setEditingScript({...editingScript, category: e.target.value})}
                  className="w-full px-3 py-2 border rounded"
                >
                  {categories.filter(c => c !== '全部').map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>
              
              <div className="mb-4">
                <label className="block text-sm font-medium mb-2">原视频链接</label>
                <input
                  type="url"
                  value={editingScript.video_link || ''}
                  onChange={(e) => setEditingScript({...editingScript, video_link: e.target.value})}
                  className="w-full px-3 py-2 border rounded"
                />
              </div>
              
              <div className="flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowEditModal(false)
                    setEditingScript(null)
                  }}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800"
                  disabled={loading}
                >
                  取消
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
                  disabled={loading}
                >
                  {loading ? '保存中...' : '保存'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Preview Modal */}
      {showPreviewModal && previewScript && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-[600px] max-h-[80vh] overflow-y-auto">
            <h3 className="text-lg font-bold mb-4">{previewScript.name} - 预览</h3>
            
            <div className="mb-4">
              <p className="text-sm text-gray-600">分类: {previewScript.category || '未分类'}</p>
              <p className="text-sm text-gray-600">总帧数: {previewScript.total_frames}</p>
              {previewScript.video_link && (
                <a href={previewScript.video_link} target="_blank" className="text-sm text-blue-500 hover:underline">
                  查看原视频
                </a>
              )}
            </div>
            
            <div className="border rounded p-4 max-h-[400px] overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-white">
                  <tr className="border-b">
                    <th className="text-left p-2 w-16">序号</th>
                    <th className="text-left p-2">分镜描述</th>
                  </tr>
                </thead>
                <tbody>
                  {(previewScript as any).parsed_content?.map((frame: any, index: number) => (
                    <tr key={index} className="border-b hover:bg-gray-50">
                      <td className="p-2 align-top font-mono text-center">{frame.sequence}</td>
                      <td className="p-2">
                        <div className="whitespace-pre-wrap break-words">{frame.prompt}</div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            <div className="mt-4 flex justify-end">
              <button
                onClick={() => {
                  setShowPreviewModal(false)
                  setPreviewScript(null)
                }}
                className="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded"
              >
                关闭
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}