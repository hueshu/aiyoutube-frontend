import { useEffect } from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from './store/authStore'
import { useStore } from './store'
import LoginPage from './components/LoginPage'
import Dashboard from './components/Dashboard'
import ScriptLibrary from './components/ScriptLibrary'
import CharacterLibrary from './components/CharacterLibrary'
import StoryboardWorkspace from './components/StoryboardWorkspace'
import ProjectsManager from './components/ProjectsManager'
import AdminPanel from './components/AdminPanel'
import Navigation from './components/Navigation'
import SingleImageGeneration from './pages/SingleImageGeneration'

function App() {
  const { isAuthenticated, checkAuth } = useAuthStore()
  const { user } = useStore()

  useEffect(() => {
    checkAuth()
  }, [checkAuth])

  if (!isAuthenticated) {
    return (
      <Router>
        <Routes>
          <Route path="*" element={<LoginPage />} />
        </Routes>
      </Router>
    )
  }

  return (
    <Router>
      <div className="min-h-screen bg-gray-100">
        <Navigation />
        <main className="container mx-auto px-4 py-8">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/scripts" element={<ScriptLibrary />} />
            <Route path="/characters" element={<CharacterLibrary />} />
            <Route path="/workspace" element={<StoryboardWorkspace />} />
            <Route path="/projects" element={<ProjectsManager />} />
            <Route path="/single-image" element={<SingleImageGeneration />} />
            {user?.role === 'admin' && (
              <Route path="/admin" element={<AdminPanel />} />
            )}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </div>
    </Router>
  )
}

export default App