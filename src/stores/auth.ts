import { defineStore } from 'pinia'
import { ref } from 'vue'

export interface UserInfo {
  TMNAME: string
  JOBName: string
  [key: string]: unknown
}

interface AuthState {
  isLoggedIn: boolean
  userInfo: UserInfo | null
}

export const useAuthStore = defineStore('auth', () => {
  const isLoggedIn = ref(false)
  const userInfo = ref<UserInfo | null>(null)

  function login(info: UserInfo): void {
    isLoggedIn.value = true
    userInfo.value = info
    localStorage.setItem('isLoggedIn', 'true')
    localStorage.setItem('userInfo', JSON.stringify(info))
  }

  function logout(): void {
    isLoggedIn.value = false
    userInfo.value = null
    localStorage.removeItem('isLoggedIn')
    localStorage.removeItem('userInfo')
  }

  function hydrate(): void {
    const saved = localStorage.getItem('isLoggedIn')
    const savedInfo = localStorage.getItem('userInfo')
    if (saved === 'true' && savedInfo) {
      isLoggedIn.value = true
      userInfo.value = JSON.parse(savedInfo)
    }
  }

  return { isLoggedIn, userInfo, login, logout, hydrate }
})
