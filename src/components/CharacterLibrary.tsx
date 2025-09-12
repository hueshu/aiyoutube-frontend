import { useState, useEffect } from 'react'
import { useStore } from '../store'
import { API_URL } from '../config/api'
import { Upload, Edit2, Trash2, Eye, Plus, Download, Maximize2, X } from 'lucide-react'

interface Character {
  id: number
  name: string
  category?: string
  tags?: string[]
  image_url: string
  created_at: string
  updated_at: string
}

export default function CharacterLibrary() {
  const { user, characters, fetchCharacters } = useStore()
  const [categories, setCategories] = useState<string[]>(['全部'])
  const [selectedCategory, setSelectedCategory] = useState('全部')
  const [showUploadModal, setShowUploadModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showPreviewModal, setShowPreviewModal] = useState(false)
  const [editingCharacter, setEditingCharacter] = useState<Character | null>(null)
  const [previewCharacter, setPreviewCharacter] = useState<Character | null>(null)
  const [loading, setLoading] = useState(false)
  const [initialLoading, setInitialLoading] = useState(true)
  const [newCategory, setNewCategory] = useState('')
  const [showNewCategoryInput, setShowNewCategoryInput] = useState(false)
  
  // Form states for upload
  const [uploadFile, setUploadFile] = useState<File | null>(null)
  const [uploadName, setUploadName] = useState('')
  const [uploadCategory, setUploadCategory] = useState('')
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [uploadTags, setUploadTags] = useState<string[]>([])
  const [customTag, setCustomTag] = useState('')
  
  // Preset tags
  const presetTags = ['男', '女', '小孩', '动物']
  
  // Edit modal custom tag state
  const [editCustomTag, setEditCustomTag] = useState('')

  useEffect(() => {
    // Wait for user to be available before loading data
    if (!user) {
      console.log('Waiting for user authentication...')
      // Check if we have a token in localStorage
      const token = localStorage.getItem('token')
      if (!token) {
        setInitialLoading(false) // Stop loading if no auth
        return
      }
    }
    
    const loadData = async () => {
      setInitialLoading(true)
      try {
        await Promise.all([
          fetchCharacters(),
          fetchCategories()
        ])
      } catch (error) {
        console.error('Failed to load data:', error)
      } finally {
        setInitialLoading(false)
      }
    }
    loadData()
  }, [user]) // Add user as dependency

  const fetchCategories = async () => {
    try {
      const token = localStorage.getItem('token') || user?.token
      if (!token) {
        console.log('No token available for fetching categories')
        return
      }
      
      const response = await fetch(`${API_URL}/characters/categories/list`, {
        headers: {
          'Authorization': `Bearer ${token}`
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
        const nameWithoutExt = file.name.replace(/\.[^/.]+$/, '')
        setUploadName(nameWithoutExt)
      }
      // Create preview URL
      const url = URL.createObjectURL(file)
      setPreviewUrl(url)
    }
  }

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!uploadFile) return
    
    console.log('Starting character upload...')
    console.log('User token:', user?.token)
    console.log('File:', uploadFile)
    console.log('Name:', uploadName)
    console.log('Category:', uploadCategory || '未分类')
    console.log('Tags:', uploadTags)
    
    setLoading(true)
    const formData = new FormData()
    formData.append('file', uploadFile)
    formData.append('name', uploadName)
    formData.append('category', uploadCategory || '未分类')
    formData.append('tags', JSON.stringify(uploadTags))
    
    try {
      console.log('Sending request to:', `${API_URL}/characters`)
      const response = await fetch(`${API_URL}/characters`, {
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
        await fetchCharacters()
        await fetchCategories()
        alert('上传成功！')
      } else {
        if (response.status === 409) {
          alert('上传失败：已存在同名角色，请使用其他名称')
        } else {
          alert(responseData.error || '上传失败')
        }
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
    setUploadTags([])
    setCustomTag('')
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl)
      setPreviewUrl(null)
    }
  }

  const handleEdit = (character: Character) => {
    const charTags = character.tags ? (typeof character.tags === 'string' ? JSON.parse(character.tags) : character.tags) : []
    setEditingCharacter({
      ...character,
      tags: charTags
    })
    setEditCustomTag('') // Reset custom tag input
    setShowEditModal(true)
  }

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingCharacter) return
    
    setLoading(true)
    try {
      const response = await fetch(`${API_URL}/characters/${editingCharacter.id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${user?.token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: editingCharacter.name,
          category: editingCharacter.category,
          tags: editingCharacter.tags || []
        })
      })
      
      const responseData = await response.json()
      
      if (response.ok) {
        setShowEditModal(false)
        setEditingCharacter(null)
        await fetchCharacters()
        await fetchCategories()
        alert('角色更新成功！图片文件名已同步更新')
      } else {
        if (response.status === 409) {
          alert('更新失败：已存在同名角色，请使用其他名称')
        } else {
          alert(responseData.error || '更新失败')
        }
      }
    } catch (error) {
      console.error('Update failed:', error)
      alert('更新失败: ' + (error as Error).message)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id: number) => {
    if (!confirm('确定要删除这个角色吗？')) return
    
    try {
      const response = await fetch(`${API_URL}/characters/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${user?.token}`
        }
      })
      
      if (response.ok) {
        await fetchCharacters()
      }
    } catch (error) {
      console.error('Delete failed:', error)
      alert('删除失败')
    }
  }

  const handlePreview = (character: Character) => {
    setPreviewCharacter(character)
    setShowPreviewModal(true)
  }

  const handleDownload = async (character: Character) => {
    try {
      const response = await fetch(character.image_url, {
        headers: {
          'Authorization': `Bearer ${user?.token}`
        }
      })
      
      if (response.ok) {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `${character.name}.png`
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        window.URL.revokeObjectURL(url)
      }
    } catch (error) {
      console.error('Download failed:', error)
      // If CORS fails, open in new tab
      window.open(character.image_url, '_blank')
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

  // Tag handling functions
  const toggleTag = (tag: string) => {
    if (uploadTags.includes(tag)) {
      setUploadTags(uploadTags.filter(t => t !== tag))
    } else {
      setUploadTags([...uploadTags, tag])
    }
  }

  const addCustomTag = () => {
    if (customTag && !uploadTags.includes(customTag)) {
      setUploadTags([...uploadTags, customTag])
      setCustomTag('')
    }
  }
  
  const addEditCustomTag = () => {
    if (editCustomTag && editingCharacter) {
      const currentTags = editingCharacter.tags || []
      if (!currentTags.includes(editCustomTag)) {
        setEditingCharacter({
          ...editingCharacter,
          tags: [...currentTags, editCustomTag]
        })
        setEditCustomTag('')
      }
    }
  }

  const filteredCharacters = selectedCategory === '全部' 
    ? characters 
    : characters.filter((c: any) => c.category === selectedCategory || (selectedCategory === '未分类' && !c.category))

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-900">角色库</h2>
        <button
          onClick={() => setShowUploadModal(true)}
          className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded flex items-center gap-2"
        >
          <Upload size={20} />
          上传角色
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
      ) : filteredCharacters.length === 0 ? (
        <div className="text-center py-8 text-gray-500">暂无角色</div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {filteredCharacters.map((character: any) => (
            <div key={character.id} className="bg-white rounded-lg shadow overflow-hidden group hover:shadow-lg transition-shadow">
              <div className="relative" style={{ paddingBottom: '177.78%' }}> {/* 9:16 aspect ratio */}
                <img
                  src={character.image_url}
                  alt={character.name}
                  className="absolute inset-0 w-full h-full object-contain bg-gray-100 cursor-pointer"
                  onClick={() => handlePreview(character)}
                />
                <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-opacity flex items-center justify-center opacity-0 group-hover:opacity-100">
                  <button
                    onClick={() => handlePreview(character)}
                    className="bg-white p-2 rounded-full shadow-lg"
                  >
                    <Maximize2 size={16} />
                  </button>
                </div>
              </div>
              <div className="p-3">
                <h3 className="text-sm font-semibold truncate mb-1" title={character.name}>
                  {character.name}
                </h3>
                <p className="text-xs text-gray-500 mb-2">{character.category || '未分类'}</p>
                <div className="flex flex-wrap gap-1">
                  <button
                    onClick={() => handlePreview(character)}
                    className="text-xs bg-gray-200 hover:bg-gray-300 px-2 py-1 rounded flex items-center gap-1"
                  >
                    <Eye size={12} />
                    预览
                  </button>
                  <button
                    onClick={() => handleEdit(character)}
                    className="text-xs bg-blue-200 hover:bg-blue-300 px-2 py-1 rounded flex items-center gap-1"
                  >
                    <Edit2 size={12} />
                    编辑
                  </button>
                  <button
                    onClick={() => handleDownload(character)}
                    className="text-xs bg-green-200 hover:bg-green-300 px-2 py-1 rounded flex items-center gap-1"
                  >
                    <Download size={12} />
                    下载
                  </button>
                  <button
                    onClick={() => handleDelete(character.id)}
                    className="text-xs bg-red-200 hover:bg-red-300 px-2 py-1 rounded flex items-center gap-1"
                  >
                    <Trash2 size={12} />
                    删除
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-96 max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-bold mb-4">上传角色</h3>
            <form onSubmit={handleUpload}>
              <div className="mb-4">
                <label className="block text-sm font-medium mb-2">图片文件 *</label>
                <input
                  type="file"
                  accept="image/jpeg,image/jpg,image/png"
                  onChange={handleFileSelect}
                  required
                  className="w-full"
                />
                <p className="text-xs text-gray-500 mt-1">
                  仅支持 JPG、JPEG、PNG 格式，最大 5MB
                </p>
                {previewUrl && (
                  <div className="mt-2">
                    <img src={previewUrl} alt="预览" className="w-full h-40 object-contain border rounded" />
                  </div>
                )}
              </div>
              
              <div className="mb-4">
                <label className="block text-sm font-medium mb-2">角色名称 *</label>
                <input
                  type="text"
                  value={uploadName}
                  onChange={(e) => setUploadName(e.target.value)}
                  required
                  className="w-full px-3 py-2 border rounded"
                  placeholder="输入角色名称"
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
                <label className="block text-sm font-medium mb-2">角色标签</label>
                <div className="space-y-2">
                  <div className="flex flex-wrap gap-2">
                    {presetTags.map(tag => (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => toggleTag(tag)}
                        className={`px-3 py-1 rounded-full text-sm ${
                          uploadTags.includes(tag)
                            ? 'bg-blue-500 text-white'
                            : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                        }`}
                      >
                        #{tag}
                      </button>
                    ))}
                  </div>
                  
                  {/* 自定义标签输入 */}
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={customTag}
                      onChange={(e) => setCustomTag(e.target.value)}
                      onKeyPress={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault()
                          addCustomTag()
                        }
                      }}
                      placeholder="输入自定义标签，按回车添加"
                      className="flex-1 px-3 py-1 border rounded text-sm"
                    />
                    <button
                      type="button"
                      onClick={addCustomTag}
                      className="px-3 py-1 bg-green-500 text-white rounded text-sm hover:bg-green-600"
                    >
                      添加
                    </button>
                  </div>
                  
                  {uploadTags.filter(tag => !presetTags.includes(tag)).length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {uploadTags.filter(tag => !presetTags.includes(tag)).map(tag => (
                        <span
                          key={tag}
                          className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm flex items-center gap-1"
                        >
                          #{tag}
                          <button
                            type="button"
                            onClick={() => setUploadTags(uploadTags.filter(t => t !== tag))}
                            className="hover:text-red-500"
                          >
                            ×
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
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
      {showEditModal && editingCharacter && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-96">
            <h3 className="text-lg font-bold mb-4">编辑角色</h3>
            <form onSubmit={handleUpdate}>
              <div className="mb-4">
                <img 
                  src={editingCharacter.image_url} 
                  alt={editingCharacter.name}
                  className="w-full h-40 object-contain border rounded mb-4"
                />
              </div>
              
              <div className="mb-4">
                <label className="block text-sm font-medium mb-2">角色名称</label>
                <input
                  type="text"
                  value={editingCharacter.name}
                  onChange={(e) => setEditingCharacter({...editingCharacter, name: e.target.value})}
                  required
                  className="w-full px-3 py-2 border rounded"
                />
              </div>
              
              <div className="mb-4">
                <label className="block text-sm font-medium mb-2">分类</label>
                <select
                  value={editingCharacter.category}
                  onChange={(e) => setEditingCharacter({...editingCharacter, category: e.target.value})}
                  className="w-full px-3 py-2 border rounded"
                >
                  {categories.filter(c => c !== '全部').map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>
              
              <div className="mb-4">
                <label className="block text-sm font-medium mb-2">角色标签</label>
                <div className="space-y-2">
                  <div className="flex flex-wrap gap-2">
                    {presetTags.map(tag => (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => {
                          const currentTags = editingCharacter.tags || []
                          if (currentTags.includes(tag)) {
                            setEditingCharacter({
                              ...editingCharacter,
                              tags: currentTags.filter((t: string) => t !== tag)
                            })
                          } else {
                            setEditingCharacter({
                              ...editingCharacter,
                              tags: [...currentTags, tag]
                            })
                          }
                        }}
                        className={`px-3 py-1 rounded-full text-sm ${
                          (editingCharacter.tags || []).includes(tag)
                            ? 'bg-blue-500 text-white'
                            : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                        }`}
                      >
                        #{tag}
                      </button>
                    ))}
                  </div>
                  
                  {/* 自定义标签输入 */}
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={editCustomTag}
                      onChange={(e) => setEditCustomTag(e.target.value)}
                      onKeyPress={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault()
                          addEditCustomTag()
                        }
                      }}
                      placeholder="输入自定义标签，按回车添加"
                      className="flex-1 px-3 py-1 border rounded text-sm"
                    />
                    <button
                      type="button"
                      onClick={addEditCustomTag}
                      className="px-3 py-1 bg-green-500 text-white rounded text-sm hover:bg-green-600"
                    >
                      添加
                    </button>
                  </div>
                  
                  {editingCharacter.tags && editingCharacter.tags.filter(tag => !presetTags.includes(tag)).length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {editingCharacter.tags.filter((tag: string) => !presetTags.includes(tag)).map((tag: string) => (
                        <span
                          key={tag}
                          className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm flex items-center gap-1"
                        >
                          #{tag}
                          <button
                            type="button"
                            onClick={() => setEditingCharacter({
                              ...editingCharacter,
                              tags: editingCharacter.tags?.filter((t: string) => t !== tag)
                            })}
                            className="hover:text-red-500"
                          >
                            ×
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              
              <div className="flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowEditModal(false)
                    setEditingCharacter(null)
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
      {showPreviewModal && previewCharacter && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50" onClick={() => setShowPreviewModal(false)}>
          <div className="relative max-w-4xl max-h-[90vh]" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => setShowPreviewModal(false)}
              className="absolute -top-10 right-0 text-white hover:text-gray-300"
            >
              <X size={24} />
            </button>
            <img
              src={previewCharacter.image_url}
              alt={previewCharacter.name}
              className="max-w-full max-h-[85vh] object-contain"
            />
            <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-50 text-white p-4">
              <h3 className="text-lg font-bold">{previewCharacter.name}</h3>
              <p className="text-sm">分类: {previewCharacter.category || '未分类'}</p>
              <p className="text-xs">创建时间: {new Date(previewCharacter.created_at).toLocaleDateString()}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}