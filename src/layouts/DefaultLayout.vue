<script setup lang="ts">
import { ref, watch } from 'vue'
import { useAuthStore } from '../stores/auth'
import { useRouter } from 'vue-router'

const auth = useAuthStore()
const router = useRouter()

const currentPath = ref(router.currentRoute.value.fullPath.split('?')[0])
watch(() => router.currentRoute.value.fullPath, (path) => {
  currentPath.value = path.split('?')[0]
})

const handleLogout = () => {
  auth.logout()
  localStorage.removeItem('rememberedEmail')
  router.push('/login')
}
</script>

<template>
  <div class="min-h-screen flex flex-col">
    <!-- Header - Glassmorphism sticky header -->
    <header
      class="sticky top-0 z-50 border-b border-slate-200/80 shadow-sm/80 bg-white/90 backdrop-blur-md"
    >
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <div class="flex items-center gap-2">
          <svg class="w-6 h-6 text-blue-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
          </svg>
          <h1 class="text-lg font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
            可修件管理系統
          </h1>
        </div>
        <div class="flex items-center gap-4">
          <div class="flex items-center gap-2">
            <div class="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center">
              <span class="text-white text-xs font-semibold">
                {{ auth.userInfo?.JOBName || '使用者' }}
              </span>
            </div>
            <span class="text-sm text-slate-600">
              {{ auth.userInfo?.TMNAME || '使用者' }}
            </span>
          </div>
          <button
            @click="handleLogout"
            class="px-4 py-2 text-sm font-medium text-white bg-red-500 hover:bg-red-600 rounded-xl transition-all duration-200 shadow-sm hover:shadow-md hover:-translate-y-0.5 active:translate-y-0"
          >
            登出
          </button>
        </div>
      </div>
    </header>

    <!-- Body: Menu + Content -->
    <div class="flex flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 gap-8">
      <!-- Menu Sidebar - Card style -->
      <nav class="w-56 flex-shrink-0 bg-white rounded-2xl border border-slate-200 shadow-sm p-3">
        <p class="text-xs font-semibold text-slate-400 uppercase tracking-wider px-3 mb-2">選單</p>
        <a
          href="/"
          class="flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-xl transition-all duration-200 hover:bg-slate-50 hover:translate-x-1"
          :class="currentPath === '/' ? '!bg-blue-50 !text-blue-700' : ''"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
          </svg>
          首頁
        </a>
        <a
          href="/repairable-parts"
          class="flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-xl transition-all duration-200 hover:bg-slate-50 hover:translate-x-1"
          :class="currentPath === '/repairable-parts' ? '!bg-blue-50 !text-blue-700' : ''"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
          可修件維護
        </a>
      </nav>

      <!-- Content - Card style -->
      <main class="flex-1 min-w-0 bg-white rounded-2xl border border-slate-200 shadow-sm p-8">
        <slot />
      </main>
    </div>
  </div>
</template>
