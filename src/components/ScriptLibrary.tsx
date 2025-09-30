import { useState, useEffect } from 'react'
import { useStore } from '../store'
import { useAuthStore } from '../store/authStore'
import { API_URL } from '../config/api'
import { Download, Edit2, Trash2, Eye, Upload, Plus, Video, Settings, Save, FileUp, X } from 'lucide-react'

interface Script {
  id: number
  name: string
  csv_content: string
  category?: string
  video_link?: string  // 视频链接
  video_url?: string   // 上传的视频文件URL
  created_at: string
  updated_at: string
  total_frames?: number
  characters?: string[]
  owner_name?: string
  isOwner?: boolean
  user_id?: number
}

export default function ScriptLibrary() {
  const { scripts } = useStore()
  const { user, token } = useAuthStore()
  const [categories, setCategories] = useState<string[]>(['全部'])
  const [selectedCategory, setSelectedCategory] = useState('全部')
  const [libraryScope, setLibraryScope] = useState<'mine' | 'system'>('mine')
  const [canAccessSystem, setCanAccessSystem] = useState(false)
  const [showUploadModal, setShowUploadModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showPreviewModal, setShowPreviewModal] = useState(false)
  const [showCategoryModal, setShowCategoryModal] = useState(false)
  const [editingScript, setEditingScript] = useState<Script | null>(null)
  const [editingVideoFile, setEditingVideoFile] = useState<File | null>(null)
  const [previewScript, setPreviewScript] = useState<Script | null>(null)
  const [isEditingPreview, setIsEditingPreview] = useState(false)
  const [editingPreviewContent, setEditingPreviewContent] = useState<any[]>([])
  const [isDraggingFile, setIsDraggingFile] = useState(false)
  const [loading, setLoading] = useState(false)
  const [initialLoading, setInitialLoading] = useState(true)
  const [newCategory, setNewCategory] = useState('')
  const [showNewCategoryInput, setShowNewCategoryInput] = useState(false)
  const [editingCategory, setEditingCategory] = useState<string | null>(null)
  const [editingCategoryName, setEditingCategoryName] = useState('')

  // Form states for upload
  const [uploadMode, setUploadMode] = useState<'file' | 'text'>('file')
  const [uploadFile, setUploadFile] = useState<File | null>(null)
  const [uploadCsvText, setUploadCsvText] = useState('')
  const [uploadName, setUploadName] = useState('')
  const [uploadCategory, setUploadCategory] = useState('')
  const [uploadVideoLink, setUploadVideoLink] = useState('')
  const [uploadVideoFile, setUploadVideoFile] = useState<File | null>(null)

  useEffect(() => {
    // Load data immediately
    const loadData = async () => {
      setInitialLoading(true)
      await Promise.all([
        fetchScriptsWithScope('mine'),
        fetchCategories()
      ])
      setInitialLoading(false)
    }
    loadData()
  }, [])

  useEffect(() => {
    // Check if user can access system library
    if (user) {
      const canAccess = user.role === 'admin' ||
                       user.role === 'employee' ||
                       user.can_access_system_library === true
      setCanAccessSystem(canAccess)
    }
  }, [user])

  useEffect(() => {
    // Reload scripts when scope changes
    if (!initialLoading) {
      fetchScriptsWithScope(libraryScope)
    }
  }, [libraryScope])

  const fetchScriptsWithScope = async (scope: 'mine' | 'system') => {
    try {
      const response = await fetch(`${API_URL}/scripts?scope=${scope}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      })
      if (response.ok) {
        const data = await response.json()
        // Update store with fetched scripts
        useStore.setState({ scripts: data.scripts })
      }
    } catch (error) {
      console.error('Failed to fetch scripts:', error)
    }
  }

  const fetchCategories = async () => {
    try {
      const response = await fetch(`${API_URL}/scripts/categories/list`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      })
      if (response.ok) {
        const data = await response.json()
        // 过滤掉"未分类"，避免重复
        const filteredCategories = data.categories.filter((cat: string) => cat !== '未分类')
        setCategories(['全部', ...filteredCategories, '未分类'])
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

    // 根据模式验证
    if (uploadMode === 'file' && !uploadFile) {
      alert('请选择CSV文件')
      return
    }
    if (uploadMode === 'text' && !uploadCsvText.trim()) {
      alert('请粘贴CSV内容')
      return
    }
    if (!uploadName.trim()) {
      alert('请输入脚本名称')
      return
    }

    console.log('Starting upload...')
    console.log('Upload mode:', uploadMode)
    console.log('Name:', uploadName)
    console.log('Category:', uploadCategory || '未分类')

    setLoading(true)

    try {
      let response

      if (uploadMode === 'file') {
        // 文件上传模式
        const formData = new FormData()
        formData.append('file', uploadFile!)
        formData.append('name', uploadName)
        formData.append('category', uploadCategory || '未分类')
        if (uploadVideoLink) {
          formData.append('video_link', uploadVideoLink)
        }
        if (uploadVideoFile) {
          formData.append('video_file', uploadVideoFile)
        }

        response = await fetch(`${API_URL}/scripts`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          },
          body: formData
        })
      } else {
        // 文本粘贴模式
        const requestBody = {
          csv_content: uploadCsvText,
          name: uploadName,
          category: uploadCategory || '未分类',
          video_link: uploadVideoLink || null
        }

        // 如果有视频文件，需要使用FormData
        if (uploadVideoFile) {
          const formData = new FormData()
          formData.append('csv_content', uploadCsvText)
          formData.append('name', uploadName)
          formData.append('category', uploadCategory || '未分类')
          if (uploadVideoLink) {
            formData.append('video_link', uploadVideoLink)
          }
          formData.append('video_file', uploadVideoFile)

          response = await fetch(`${API_URL}/scripts`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: formData
          })
        } else {
          response = await fetch(`${API_URL}/scripts`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${localStorage.getItem('token')}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(requestBody)
          })
        }
      }

      console.log('Response status:', response.status)
      const responseData = await response.json()
      console.log('Response data:', responseData)

      if (response.ok) {
        setShowUploadModal(false)
        resetUploadForm()
        await fetchScriptsWithScope(libraryScope)
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
    setUploadMode('file')
    setUploadFile(null)
    setUploadCsvText('')
    setUploadName('')
    setUploadCategory('')
    setUploadVideoLink('')
    setUploadVideoFile(null)
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
      let response
      // 如果有视频文件，使用FormData
      if (editingVideoFile) {
        const formData = new FormData()
        formData.append('name', editingScript.name)
        formData.append('category', editingScript.category || '')
        if (editingScript.video_link) {
          formData.append('video_link', editingScript.video_link)
        }
        formData.append('video_file', editingVideoFile)

        response = await fetch(`${API_URL}/scripts/${editingScript.id}`, {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          },
          body: formData
        })
      } else {
        response = await fetch(`${API_URL}/scripts/${editingScript.id}`, {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            name: editingScript.name,
            category: editingScript.category,
            video_link: editingScript.video_link
          })
        })
      }
      
      if (response.ok) {
        setShowEditModal(false)
        setEditingScript(null)
        setEditingVideoFile(null)
        await fetchScriptsWithScope(libraryScope)
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
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      })
      
      if (response.ok) {
        await fetchScriptsWithScope(libraryScope)
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
          'Authorization': `Bearer ${localStorage.getItem('token')}`
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

  // Preview editing functions
  const handleUpdateFrame = (index: number, field: 'sequence' | 'prompt', value: string) => {
    const newContent = [...editingPreviewContent]
    newContent[index] = { ...newContent[index], [field]: value }
    setEditingPreviewContent(newContent)
  }

  const handleDeleteFrame = (index: number) => {
    const newContent = editingPreviewContent.filter((_, i) => i !== index)
    setEditingPreviewContent(newContent)
  }

  const handleAddFrame = () => {
    const lastSequence = editingPreviewContent.length > 0
      ? parseInt(editingPreviewContent[editingPreviewContent.length - 1].sequence) || editingPreviewContent.length
      : 0
    const newFrame = {
      sequence: String(lastSequence + 1).padStart(3, '0'),
      prompt: ''
    }
    setEditingPreviewContent([...editingPreviewContent, newFrame])
  }

  const handleSavePreviewEdit = async () => {
    if (!previewScript) return

    try {
      setLoading(true)
      const csvContent = editingPreviewContent
        .map(frame => `${frame.sequence},"${frame.prompt.replace(/"/g, '""')}"`)
        .join('\n')

      const formData = new FormData()
      formData.append('csv_content', csvContent)
      formData.append('total_frames', String(editingPreviewContent.length))
      formData.append('name', previewScript.name) // Keep existing name
      formData.append('category', previewScript.category || '未分类') // Keep existing category

      console.log('Saving script with CSV content:', csvContent.substring(0, 100) + '...')
      console.log('Total frames:', editingPreviewContent.length)

      const response = await fetch(`${API_URL}/scripts/${previewScript.id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`
          // Don't set Content-Type, let browser set it for FormData
        },
        body: formData
      })

      if (response.ok) {
        const updatedScript = await response.json()
        console.log('Save successful, updated script:', updatedScript)

        alert('保存成功')
        setIsEditingPreview(false)
        setEditingPreviewContent([])

        // Update preview script with parsed content
        if (updatedScript && updatedScript.parsed_content) {
          setPreviewScript(updatedScript)
        } else {
          // If response doesn't include parsed_content, add it
          setPreviewScript({
            ...updatedScript,
            parsed_content: editingPreviewContent,
            total_frames: editingPreviewContent.length
          })
        }

        // Refresh scripts list
        fetchScriptsWithScope(libraryScope)
      } else {
        const errorText = await response.text()
        console.error('Save failed:', response.status, errorText)
        alert(`保存失败: ${errorText || response.statusText}`)
      }
    } catch (error) {
      console.error('Error saving preview edit:', error)
      alert(`保存失败: ${error}`)
    } finally {
      setLoading(false)
    }
  }

  const handleUploadReplaceContent = async (file: File) => {
    try {
      const text = await file.text()
      const result: Array<{ sequence: string; prompt: string }> = []
      const lines = text.trim().split('\n')

      if (lines.length === 0) {
        alert('文件为空')
        return
      }

      // Check if first line is header and skip it
      let currentIndex = 0
      if (lines.length > 0) {
        const firstLine = lines[0].toLowerCase()
        // Common header patterns in Chinese or English
        if (firstLine.includes('序号') ||
            firstLine.includes('分镜') ||
            firstLine.includes('scene') ||
            firstLine.includes('描述') ||
            firstLine.includes('prompt') ||
            firstLine.includes('内容') ||
            // Check if first value is not a number
            (lines[0].split(',')[0] && isNaN(parseInt(lines[0].split(',')[0].trim())))) {
          currentIndex = 1
          console.log('Detected header row, skipping first line')
        }
      }

      // Parse CSV line properly handling quotes (ported from backend logic)
      const parseCSVLine = (startLine: string, startIndex: number): { sequence: number; prompt: string; nextIndex: number } | null => {
        // Simple case: no quotes
        if (!startLine.includes('"')) {
          const [sequence, ...promptParts] = startLine.split(',')
          const seqNum = parseInt(sequence.trim())
          if (!isNaN(seqNum)) {
            return {
              sequence: seqNum,
              prompt: promptParts.join(',').trim(),
              nextIndex: startIndex + 1
            }
          }
          // If sequence is not a number, try to use line number
          if (promptParts.length > 0 || sequence.trim()) {
            return {
              sequence: startIndex - currentIndex + 1, // Calculate sequence based on position
              prompt: startLine.trim(),
              nextIndex: startIndex + 1
            }
          }
          return null
        }

        // Handle quoted content that may span multiple lines
        const parts: string[] = []
        let current = ''
        let inQuotes = false
        let lineIdx = startIndex
        let currentLine = startLine

        while (lineIdx < lines.length) {
          for (let i = 0; i < currentLine.length; i++) {
            const char = currentLine[i]
            const nextChar = currentLine[i + 1]

            if (char === '"' && nextChar === '"' && inQuotes) {
              current += '"'
              i++ // Skip next quote
            } else if (char === '"') {
              inQuotes = !inQuotes
            } else if (char === ',' && !inQuotes) {
              parts.push(current.trim())
              current = ''
            } else {
              current += char
            }
          }

          // If still in quotes, add newline and continue with next line
          if (inQuotes && lineIdx + 1 < lines.length) {
            current += '\n'
            lineIdx++
            currentLine = lines[lineIdx]
          } else {
            break
          }
        }

        // Add the last part
        if (current) {
          parts.push(current.trim())
        }

        // Extract sequence and prompt
        if (parts.length >= 2) {
          const seqNum = parseInt(parts[0])
          if (!isNaN(seqNum)) {
            return {
              sequence: seqNum,
              prompt: parts.slice(1).join(',').trim(),
              nextIndex: lineIdx + 1
            }
          }
        } else if (parts.length === 1 && parts[0]) {
          // Single column, treat as prompt with auto sequence
          return {
            sequence: result.length + 1,
            prompt: parts[0],
            nextIndex: lineIdx + 1
          }
        }

        return null
      }

      // Process lines with support for quoted multi-line content
      while (currentIndex < lines.length) {
        const line = lines[currentIndex].trim()
        if (!line) {
          currentIndex++
          continue
        }

        const parsed = parseCSVLine(line, currentIndex)
        if (parsed) {
          // Format sequence as padded string for frontend display
          result.push({
            sequence: String(parsed.sequence).padStart(3, '0'),
            prompt: parsed.prompt
          })
          currentIndex = parsed.nextIndex
        } else {
          currentIndex++
        }
      }

      if (result.length > 0) {
        setEditingPreviewContent(result)
        setIsEditingPreview(true)
        alert(`成功解析 ${result.length} 个分镜，请检查并保存`)
      } else {
        alert('文件解析失败，请检查格式')
      }
    } catch (error) {
      console.error('Error parsing file:', error)
      alert('文件读取失败：' + (error instanceof Error ? error.message : '未知错误'))
    }
  }

  const handleDownloadVideo = async (script: Script) => {
    if (!script.video_url) {
      alert('该脚本没有视频文件')
      return
    }

    try {
      // 先检查文件是否存在
      const checkResponse = await fetch(script.video_url, { method: 'HEAD' }).catch(() => null)

      if (!checkResponse || !checkResponse.ok) {
        // 如果文件不存在，提供友好提示
        console.error('Video file not found:', script.video_url)
        alert('视频文件不存在或已被删除。请重新上传视频文件。')
        return
      }

      // 下载视频文件
      const response = await fetch(script.video_url)
      if (response.ok) {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        // 从URL中提取文件名或使用脚本名称
        const urlParts = script.video_url.split('/')
        const filename = decodeURIComponent(urlParts[urlParts.length - 1]) || `${script.name}_video.mp4`
        a.download = filename
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        window.URL.revokeObjectURL(url)
      } else {
        if (response.status === 404) {
          alert('视频文件不存在，可能已被删除。请重新上传视频。')
        } else {
          alert(`视频下载失败 (错误代码: ${response.status})`)
        }
      }
    } catch (error) {
      console.error('Video download failed:', error)
      // 提供更详细的错误信息
      if (error instanceof TypeError && error.message.includes('Failed to fetch')) {
        alert('网络连接失败，请检查网络后重试')
      } else {
        alert('视频下载失败，请稍后重试')
      }
    }
  }

  const handlePreview = async (script: Script) => {
    try {
      const response = await fetch(`${API_URL}/scripts/${script.id}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
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

  const handleAddCategory = async () => {
    if (!newCategory || categories.includes(newCategory)) {
      if (categories.includes(newCategory)) {
        alert('该分类已存在')
      }
      return
    }
    
    try {
      const response = await fetch(`${API_URL}/scripts/categories`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ name: newCategory })
      })
      
      if (response.ok) {
        setCategories([...categories.slice(0, -1), newCategory, '未分类'])
        setNewCategory('')
        alert('分类添加成功')
      } else {
        const data = await response.json()
        alert(data.error || '添加失败')
      }
    } catch (error) {
      console.error('Failed to add category:', error)
      alert('添加失败')
    }
  }
  
  const handleRenameCategory = async (oldName: string) => {
    if (!editingCategoryName || editingCategoryName === oldName) {
      setEditingCategory(null)
      setEditingCategoryName('')
      return
    }
    
    if (categories.includes(editingCategoryName)) {
      alert('该分类名已存在')
      return
    }
    
    try {
      const response = await fetch(`${API_URL}/scripts/categories/${encodeURIComponent(oldName)}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ newName: editingCategoryName })
      })
      
      if (response.ok) {
        const updatedCategories = categories.map(c => 
          c === oldName ? editingCategoryName : c
        )
        setCategories(updatedCategories)
        if (selectedCategory === oldName) {
          setSelectedCategory(editingCategoryName)
        }
        setEditingCategory(null)
        setEditingCategoryName('')
        await fetchScriptsWithScope(libraryScope)
        alert('分类重命名成功')
      } else {
        const data = await response.json()
        alert(data.error || '重命名失败')
      }
    } catch (error) {
      console.error('Failed to rename category:', error)
      alert('重命名失败')
    }
  }
  
  const handleDeleteCategory = async (categoryName: string) => {
    if (!confirm(`确定要删除分类"${categoryName}"吗？该分类下的所有脚本将被移至"未分类"。`)) {
      return
    }
    
    try {
      const response = await fetch(`${API_URL}/scripts/categories/${encodeURIComponent(categoryName)}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      })
      
      if (response.ok) {
        const updatedCategories = categories.filter(c => c !== categoryName)
        setCategories(updatedCategories)
        if (selectedCategory === categoryName) {
          setSelectedCategory('全部')
        }
        await fetchScriptsWithScope(libraryScope)
        alert('分类删除成功')
      } else {
        const data = await response.json()
        alert(data.error || '删除失败')
      }
    } catch (error) {
      console.error('Failed to delete category:', error)
      alert('删除失败')
    }
  }

  const filteredScripts = selectedCategory === '全部' 
    ? scripts 
    : scripts.filter((s: any) => s.category === selectedCategory || (selectedCategory === '未分类' && !s.category))

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-4">
          <h2 className="text-2xl font-bold text-gray-900">脚本库</h2>
          {canAccessSystem && (
            <div className="flex bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => setLibraryScope('mine')}
                className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                  libraryScope === 'mine'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                我的脚本库
              </button>
              <button
                onClick={() => setLibraryScope('system')}
                className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                  libraryScope === 'system'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                系统脚本库
              </button>
            </div>
          )}
        </div>
        <button
          onClick={() => setShowUploadModal(true)}
          className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded flex items-center gap-2"
          disabled={libraryScope === 'system'}
        >
          <Upload size={20} />
          上传脚本
        </button>
      </div>

      <div className="mb-6 border-b border-gray-200">
        <div className="flex items-center justify-between mb-2">
          <nav className="-mb-px flex space-x-4 overflow-x-auto flex-1">
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
          <button
            onClick={() => setShowCategoryModal(true)}
            className="ml-4 px-3 py-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded flex items-center gap-1"
            title="管理分类"
          >
            <Settings size={16} />
            分类管理
          </button>
        </div>
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
              {libraryScope === 'system' && script.owner_name && (
                <p className="text-sm text-indigo-600 mb-2">所有者: {script.owner_name}</p>
              )}
              <p className="text-sm text-gray-500 mb-2">分类: {script.category || '未分类'}</p>
              {script.total_frames && (
                <p className="text-sm text-gray-500 mb-2">帧数: {script.total_frames}</p>
              )}
              {script.characters && script.characters.length > 0 && (
                <p className="text-sm text-gray-500 mb-2">角色: {script.characters.join(', ')}</p>
              )}
              {(script.video_link || script.video_url) && (
                <div className="flex items-center gap-2 mb-2">
                  {script.video_link && (
                    <a
                      href={script.video_link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-blue-500 hover:underline flex items-center gap-1"
                    >
                      <Video size={14} />
                      查看原视频
                    </a>
                  )}
                  {script.video_url && (
                    <button
                      onClick={() => handleDownloadVideo(script)}
                      className="text-sm text-purple-500 hover:text-purple-700 flex items-center gap-1"
                    >
                      <Download size={14} />
                      下载视频
                    </button>
                  )}
                </div>
              )}
              <p className="text-xs text-gray-400">创建时间: {script.created_at ? new Date(script.created_at).toLocaleDateString() : '未知'}</p>

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
                  下载脚本
                </button>
                {(libraryScope === 'mine' || script.isOwner) && (
                  <>
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
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-[500px] max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-bold mb-4">上传脚本</h3>

            {/* 标签页切换 */}
            <div className="flex mb-4 border-b">
              <button
                type="button"
                onClick={() => setUploadMode('file')}
                className={`px-4 py-2 font-medium ${
                  uploadMode === 'file'
                    ? 'text-blue-600 border-b-2 border-blue-600'
                    : 'text-gray-600 hover:text-gray-800'
                }`}
              >
                上传文件
              </button>
              <button
                type="button"
                onClick={() => setUploadMode('text')}
                className={`px-4 py-2 font-medium ${
                  uploadMode === 'text'
                    ? 'text-blue-600 border-b-2 border-blue-600'
                    : 'text-gray-600 hover:text-gray-800'
                }`}
              >
                粘贴文本
              </button>
            </div>

            <form onSubmit={handleUpload}>
              {/* 根据模式显示不同的输入区域 */}
              {uploadMode === 'file' ? (
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
              ) : (
                <div className="mb-4">
                  <label className="block text-sm font-medium mb-2">CSV内容 *</label>
                  <textarea
                    value={uploadCsvText}
                    onChange={(e) => setUploadCsvText(e.target.value)}
                    required
                    className="w-full px-3 py-2 border rounded h-48 font-mono text-sm"
                    placeholder="粘贴CSV内容，格式示例：&#10;1,&quot;第一个镜头描述&quot;,&quot;动态描述&quot;,&quot;旁白&quot;&#10;2,&quot;第二个镜头描述&quot;,&quot;动态描述&quot;,&quot;对话&quot;"
                  />
                  <p className="text-xs text-gray-500 mt-1">直接从Excel或CSV文件中复制内容粘贴到这里</p>
                </div>
              )}

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
                <label className="block text-sm font-medium mb-2">参考视频链接</label>
                <input
                  type="url"
                  value={uploadVideoLink}
                  onChange={(e) => setUploadVideoLink(e.target.value)}
                  className="w-full px-3 py-2 border rounded"
                  placeholder="https://..."
                />
                <p className="text-xs text-gray-500 mt-1">可选，填入视频链接</p>
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium mb-2">参考视频文件</label>
                <input
                  type="file"
                  accept="video/*"
                  onChange={(e) => setUploadVideoFile(e.target.files?.[0] || null)}
                  className="w-full"
                />
                <p className="text-xs text-gray-500 mt-1">可选，上传MP4、MOV等视频文件</p>
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
                  disabled={loading || (uploadMode === 'file' ? !uploadFile : !uploadCsvText.trim()) || !uploadName.trim()}
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
                <label className="block text-sm font-medium mb-2">参考视频链接</label>
                <input
                  type="url"
                  value={editingScript.video_link || ''}
                  onChange={(e) => setEditingScript({...editingScript, video_link: e.target.value})}
                  className="w-full px-3 py-2 border rounded"
                />
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium mb-2">更新参考视频文件</label>
                <input
                  type="file"
                  accept="video/*"
                  onChange={(e) => setEditingVideoFile(e.target.files?.[0] || null)}
                  className="w-full"
                />
                {editingScript.video_url && (
                  <p className="text-xs text-gray-500 mt-1">当前已有视频文件</p>
                )}
                <p className="text-xs text-gray-500 mt-1">可选，上传新的视频文件</p>
              </div>

              <div className="flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowEditModal(false)
                    setEditingScript(null)
                    setEditingVideoFile(null)  // 清理视频文件状态
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

      {/* Category Management Modal */}
      {showCategoryModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-96 max-h-[80vh] overflow-y-auto">
            <h3 className="text-lg font-bold mb-4">分类管理</h3>
            
            <div className="mb-4">
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium">添加新分类</label>
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                  placeholder="输入分类名称"
                  className="flex-1 px-3 py-2 border rounded"
                  onKeyPress={(e) => {
                    if (e.key === 'Enter' && newCategory) {
                      handleAddCategory()
                    }
                  }}
                />
                <button
                  onClick={handleAddCategory}
                  disabled={!newCategory}
                  className="px-3 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:opacity-50"
                >
                  添加
                </button>
              </div>
            </div>
            
            <div className="mb-4">
              <label className="text-sm font-medium mb-2 block">现有分类</label>
              <div className="space-y-2 max-h-[300px] overflow-y-auto">
                {categories.filter(c => c !== '全部' && c !== '未分类').map(category => (
                  <div key={category} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                    {editingCategory === category ? (
                      <>
                        <input
                          type="text"
                          value={editingCategoryName}
                          onChange={(e) => setEditingCategoryName(e.target.value)}
                          className="flex-1 px-2 py-1 border rounded mr-2"
                          autoFocus
                          onKeyPress={(e) => {
                            if (e.key === 'Enter') {
                              handleRenameCategory(category)
                            }
                          }}
                        />
                        <div className="flex gap-1">
                          <button
                            onClick={() => handleRenameCategory(category)}
                            className="px-2 py-1 bg-blue-500 text-white rounded text-sm hover:bg-blue-600"
                          >
                            保存
                          </button>
                          <button
                            onClick={() => {
                              setEditingCategory(null)
                              setEditingCategoryName('')
                            }}
                            className="px-2 py-1 bg-gray-300 text-gray-700 rounded text-sm hover:bg-gray-400"
                          >
                            取消
                          </button>
                        </div>
                      </>
                    ) : (
                      <>
                        <span className="flex-1">{category}</span>
                        <div className="flex gap-1">
                          <button
                            onClick={() => {
                              setEditingCategory(category)
                              setEditingCategoryName(category)
                            }}
                            className="px-2 py-1 bg-blue-200 hover:bg-blue-300 rounded text-sm"
                          >
                            <Edit2 size={14} />
                          </button>
                          <button
                            onClick={() => handleDeleteCategory(category)}
                            className="px-2 py-1 bg-red-200 hover:bg-red-300 rounded text-sm"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                ))}
                {categories.filter(c => c !== '全部' && c !== '未分类').length === 0 && (
                  <p className="text-gray-500 text-center py-4">暂无自定义分类</p>
                )}
              </div>
            </div>
            
            <div className="flex justify-end">
              <button
                onClick={() => {
                  setShowCategoryModal(false)
                  setEditingCategory(null)
                  setEditingCategoryName('')
                  setNewCategory('')
                }}
                className="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded"
              >
                关闭
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Preview Modal - Enhanced */}
      {showPreviewModal && previewScript && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 w-full max-w-[1200px] max-h-[90vh] overflow-hidden flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold">{previewScript.name} - 预览</h3>
              <button
                onClick={() => {
                  setShowPreviewModal(false)
                  setPreviewScript(null)
                  setIsEditingPreview(false)
                  setEditingPreviewContent([])
                }}
                className="text-gray-500 hover:text-gray-700"
              >
                <X size={24} />
              </button>
            </div>

            {/* Meta Info */}
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-4 text-sm text-gray-600">
                <span>分类: {previewScript.category || '未分类'}</span>
                <span>总帧数: {previewScript.total_frames}</span>
                {previewScript.video_link && (
                  <a href={previewScript.video_link} target="_blank" className="text-blue-500 hover:underline flex items-center gap-1">
                    <Video size={14} />
                    查看原视频
                  </a>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2">
                {!isEditingPreview ? (
                  <>
                    <button
                      onClick={() => {
                        setIsEditingPreview(true)
                        setEditingPreviewContent((previewScript as any).parsed_content || [])
                        // Auto-resize textareas after switching to edit mode
                        setTimeout(() => {
                          const textareas = document.querySelectorAll('textarea')
                          textareas.forEach((textarea: any) => {
                            textarea.style.height = 'auto'
                            textarea.style.height = textarea.scrollHeight + 'px'
                          })
                        }, 0)
                      }}
                      className="px-3 py-1.5 bg-blue-500 hover:bg-blue-600 text-white text-sm rounded flex items-center gap-1"
                    >
                      <Edit2 size={16} />
                      编辑
                    </button>
                    <label
                      className={`px-6 py-2 bg-green-500 hover:bg-green-600 text-white text-sm rounded flex items-center gap-2 cursor-pointer transition-all ${
                        isDraggingFile ? 'bg-green-600 ring-2 ring-green-300' : ''
                      }`}
                      onDragOver={(e) => {
                        e.preventDefault()
                        e.stopPropagation()
                        setIsDraggingFile(true)
                      }}
                      onDragLeave={(e) => {
                        e.preventDefault()
                        e.stopPropagation()
                        setIsDraggingFile(false)
                      }}
                      onDrop={(e) => {
                        e.preventDefault()
                        e.stopPropagation()
                        setIsDraggingFile(false)
                        const file = e.dataTransfer.files[0]
                        if (file && (file.name.endsWith('.csv') || file.name.endsWith('.txt'))) {
                          handleUploadReplaceContent(file)
                        } else {
                          alert('请上传CSV或TXT文件')
                        }
                      }}
                    >
                      <FileUp size={16} />
                      {isDraggingFile ? '释放文件上传' : '上传替换 (可拖拽文件)'}
                      <input
                        type="file"
                        accept=".csv,.txt"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0]
                          if (file) {
                            handleUploadReplaceContent(file)
                          }
                        }}
                      />
                    </label>
                  </>
                ) : (
                  <>
                    <button
                      onClick={handleSavePreviewEdit}
                      className="px-3 py-1.5 bg-green-500 hover:bg-green-600 text-white text-sm rounded flex items-center gap-1"
                    >
                      <Save size={16} />
                      保存
                    </button>
                    <button
                      onClick={() => {
                        setIsEditingPreview(false)
                        setEditingPreviewContent([])
                      }}
                      className="px-3 py-1.5 bg-gray-500 hover:bg-gray-600 text-white text-sm rounded"
                    >
                      取消
                    </button>
                    <button
                      onClick={handleAddFrame}
                      className="px-3 py-1.5 bg-blue-500 hover:bg-blue-600 text-white text-sm rounded flex items-center gap-1"
                    >
                      <Plus size={16} />
                      添加分镜
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Content Area */}
            <div className="border rounded p-4 flex-1 overflow-y-auto" style={{ maxHeight: '60vh' }}>
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-white border-b">
                  <tr>
                    <th className="text-left p-2 w-20">序号</th>
                    <th className="text-left p-2">分镜描述</th>
                    {isEditingPreview && <th className="w-20">操作</th>}
                  </tr>
                </thead>
                <tbody>
                  {(isEditingPreview ? editingPreviewContent : (previewScript as any).parsed_content || []).map((frame: any, index: number) => (
                    <tr key={index} className="border-b hover:bg-gray-50">
                      <td className="p-2 align-top font-mono text-center">
                        {isEditingPreview ? (
                          <input
                            type="text"
                            value={frame.sequence}
                            onChange={(e) => handleUpdateFrame(index, 'sequence', e.target.value)}
                            className="w-full px-2 py-1 border rounded text-center"
                          />
                        ) : (
                          frame.sequence
                        )}
                      </td>
                      <td className="p-2">
                        {isEditingPreview ? (
                          <textarea
                            value={frame.prompt}
                            onChange={(e) => handleUpdateFrame(index, 'prompt', e.target.value)}
                            className="w-full px-2 py-1 border rounded resize-none whitespace-pre-wrap"
                            style={{ minHeight: '3em', height: 'auto' }}
                            onInput={(e) => {
                              const target = e.target as HTMLTextAreaElement
                              target.style.height = 'auto'
                              target.style.height = target.scrollHeight + 'px'
                            }}
                          />
                        ) : (
                          <div className="whitespace-pre-wrap break-words">{frame.prompt}</div>
                        )}
                      </td>
                      {isEditingPreview && (
                        <td className="p-2 text-center">
                          <button
                            onClick={() => handleDeleteFrame(index)}
                            className="text-red-500 hover:text-red-700"
                          >
                            <Trash2 size={16} />
                          </button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Footer */}
            <div className="mt-4 flex justify-between items-center">
              <div className="text-sm text-gray-500">
                {isEditingPreview && `编辑模式 - ${editingPreviewContent.length} 个分镜`}
              </div>
              <button
                onClick={() => {
                  setShowPreviewModal(false)
                  setPreviewScript(null)
                  setIsEditingPreview(false)
                  setEditingPreviewContent([])
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