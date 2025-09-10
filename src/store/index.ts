import { create } from 'zustand'
import { API_URL } from '../config/api'

interface User {
  id: number
  username: string
  role: 'admin' | 'user'
  token: string
}

interface Script {
  id: number
  name: string
  csv_content: string
  category?: string
  video_link?: string
  created_at: string
  updated_at: string
  user_id: number
}

interface Character {
  id: number
  name: string
  image_url: string
  category?: string
  created_at: string
  updated_at: string
  user_id: number
}

interface Store {
  user: User | null
  scripts: Script[]
  characters: Character[]
  setUser: (user: User | null) => void
  setScripts: (scripts: Script[]) => void
  setCharacters: (characters: Character[]) => void
  fetchScripts: () => Promise<void>
  fetchCharacters: () => Promise<void>
}

export const useStore = create<Store>((set, get) => ({
  user: null,
  scripts: [],
  characters: [],
  
  setUser: (user) => set({ user }),
  setScripts: (scripts) => set({ scripts }),
  setCharacters: (characters) => set({ characters }),
  
  fetchScripts: async () => {
    const { user } = get()
    if (!user) {
      console.log('No user, cannot fetch scripts');
      return
    }
    
    try {
      console.log('Fetching scripts from:', `${API_URL}/scripts`);
      const response = await fetch(`${API_URL}/scripts`, {
        headers: {
          'Authorization': `Bearer ${user.token}`
        }
      })
      
      if (response.ok) {
        const data = await response.json()
        console.log('Scripts response:', data);
        // Handle nested response structure
        const scriptsData = data.scripts?.results || data.scripts || []
        console.log('Extracted scripts:', scriptsData);
        set({ scripts: scriptsData })
      } else {
        console.error('Failed to fetch scripts, status:', response.status);
      }
    } catch (error) {
      console.error('Failed to fetch scripts:', error)
    }
  },
  
  fetchCharacters: async () => {
    const { user } = get()
    if (!user) {
      console.log('No user, cannot fetch characters')
      return
    }
    
    try {
      console.log('Fetching characters from:', `${API_URL}/characters`)
      const response = await fetch(`${API_URL}/characters`, {
        headers: {
          'Authorization': `Bearer ${user.token}`
        }
      })
      
      if (response.ok) {
        const data = await response.json()
        console.log('Characters response:', data)
        // Handle nested response structure
        const charactersData = data.characters?.results || data.characters || []
        console.log('Extracted characters:', charactersData)
        set({ characters: charactersData })
      } else {
        console.error('Failed to fetch characters, status:', response.status)
      }
    } catch (error) {
      console.error('Failed to fetch characters:', error)
    }
  }
}))