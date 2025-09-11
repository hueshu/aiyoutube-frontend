import { create } from 'zustand'
import axios from 'axios'
import { API_URL } from '../config/api'

interface User {
  id: number
  username: string
  role: 'admin' | 'user'
}

interface AuthState {
  user: User | null
  token: string | null
  isAuthenticated: boolean
  isLoading: boolean
  login: (username: string, password: string) => Promise<void>
  register: (username: string, password: string) => Promise<void>
  logout: () => void
  checkAuth: () => Promise<void>
  initializeAuth: () => void
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  token: null,
  isAuthenticated: false,
  isLoading: true,

  login: async (username: string, password: string) => {
    try {
      const response = await axios.post(`${API_URL}/auth/login`, {
        username,
        password
      })
      
      const { token, user } = response.data
      
      localStorage.setItem('token', token)
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`
      
      set({ user, token, isAuthenticated: true })
    } catch (error) {
      console.error('Login failed:', error)
      throw error
    }
  },

  register: async (username: string, password: string) => {
    try {
      const response = await axios.post(`${API_URL}/auth/register`, {
        username,
        password
      })
      
      const { token, user } = response.data
      
      localStorage.setItem('token', token)
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`
      
      set({ user, token, isAuthenticated: true })
    } catch (error) {
      console.error('Registration failed:', error)
      throw error
    }
  },

  logout: () => {
    localStorage.removeItem('token')
    delete axios.defaults.headers.common['Authorization']
    set({ user: null, token: null, isAuthenticated: false })
  },

  checkAuth: async () => {
    const token = localStorage.getItem('token')
    if (!token) {
      set({ isAuthenticated: false, isLoading: false, user: null, token: null })
      return
    }

    try {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`
      const response = await axios.get(`${API_URL}/auth/me`)
      set({ 
        user: response.data.user, 
        token, 
        isAuthenticated: true,
        isLoading: false 
      })
    } catch (error) {
      console.error('Auth check failed:', error)
      localStorage.removeItem('token')
      delete axios.defaults.headers.common['Authorization']
      set({ 
        user: null, 
        token: null, 
        isAuthenticated: false,
        isLoading: false 
      })
    }
  },

  initializeAuth: () => {
    const token = localStorage.getItem('token')
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`
      set({ 
        token, 
        isAuthenticated: true,
        isLoading: false 
      })
      // Then check auth to get user info
      get().checkAuth()
    } else {
      set({ isLoading: false })
    }
  }
}))