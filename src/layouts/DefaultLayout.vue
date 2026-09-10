<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useAuthStore } from '../stores/auth'

const auth = useAuthStore()
const route = useRoute()
const menuOpen = ref(false)
const groups = [
  { label: '工作空間', links: [
    { to: '/', label: '工作首頁', icon: 'M3 10l9-7 9 7M5 9v12h5v-7h4v7h5V9' },
    { to: '/location-maintenance', label: '位置維護作業', icon: 'M12 21s7-5.1 7-12a7 7 0 0 1-14 0c0 6.9 7 12 7 12zm0-9a2 2 0 1 0 0-4 2 2 0 0 0 0 4z' },
    { to: '/repairable-devices', label: '可修件資料維護', icon: 'M4 7l8-4 8 4v10l-8 4-8-4V7zm0 0l8 4 8-4m-8 4v10' },
    { to: '/maintenance-records', label: '維修記錄維護', icon: 'M9 5H5v16h14V5h-4M9 3h6v4H9V3zm0 9h6m-6 4h6' },
  ] },
  { label: '基本資料設定', links: [
    { to: '/maintenance-object-types', label: '維修物件類型', icon: 'M4 4h6v6H4V4zm10 0h6v6h-6V4zM4 14h6v6H4v-6zm10 0h6v6h-6v-6z' },
    { to: '/action-types', label: '處理方式類型', icon: 'M4 7h16M4 17h16M8 4v6m8 4v6' },
    { to: '/fault-reason-types', label: '故障原因類型', icon: 'M12 8v5m0 4h.01M10 3L2 19h20L14 3h-4z' },
  ] },
]
const currentLabel = computed(() => groups.flatMap(group => group.links).find(link => link.to === route.path)?.label || '工作空間')
watch(() => route.path, () => { menuOpen.value = false })

const handleLogout = () => {
  try {
    localStorage.removeItem('isLoggedIn')
    localStorage.removeItem('userInfo')
    localStorage.removeItem('rememberedEmail')
    auth.isLoggedIn = false
    auth.userInfo = null
    globalThis.location.replace('/login')
  } catch (error) {
    console.error('Logout error:', error)
    globalThis.location.replace('/login')
  }
}
</script>

<template>
  <div class="app-shell">
    <a class="skip-link" href="#main-content">跳至主要內容</a>
    <header class="app-header">
      <RouterLink to="/" class="brand" aria-label="可修件管理系統首頁">
        <span class="brand-mark" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><path d="M20 7v5h-5M4 17v-5h5M6 6a8 8 0 0 1 13 3M5 15a8 8 0 0 0 13 3" stroke-linecap="round" stroke-linejoin="round" /></svg></span>
        <span><strong>可修件管理系統</strong><small>設備維護 · 資源再利用</small></span>
      </RouterLink>
      <div class="header-user">
        <span class="user-avatar" aria-hidden="true">{{ (auth.userInfo?.TMNAME || '使').slice(0, 1) }}</span>
        <div class="user-details"><strong>{{ auth.userInfo?.TMNAME || '使用者' }}</strong><small>{{ auth.userInfo?.JOBName || '工作帳號' }}</small></div>
        <button type="button" class="logout-button" @click="handleLogout">登出</button>
      </div>
    </header>
    <div class="workspace">
      <aside class="sidebar">
        <button type="button" class="mobile-menu-toggle" :aria-expanded="menuOpen" aria-controls="workspace-navigation" @click="menuOpen = !menuOpen">
          <span>{{ currentLabel }}</span><span>{{ menuOpen ? '收合選單 −' : '開啟選單 ＋' }}</span>
        </button>
        <nav id="workspace-navigation" class="navigation" :class="{ 'is-open': menuOpen }" aria-label="主要導覽" @keydown.esc="menuOpen = false">
          <div v-for="group in groups" :key="group.label" class="nav-group">
            <p class="nav-group-label">{{ group.label }}</p>
            <RouterLink v-for="link in group.links" :key="link.to" :to="link.to" class="nav-link" :class="{ 'is-active': route.path === link.to }" :aria-current="route.path === link.to ? 'page' : undefined">
              <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path :d="link.icon" /></svg>
              {{ link.label }}
            </RouterLink>
          </div>
          <div class="sidebar-note"><span class="note-label">作業小提醒</span><p>先建立位置，再新增可修件資料，最後透過維修記錄追蹤檢修與完工資訊。</p></div>
        </nav>
      </aside>
      <main id="main-content" class="main-content" tabindex="-1">
        <div class="breadcrumb"><span>工作空間</span><span aria-hidden="true">/</span><span>{{ currentLabel }}</span></div>
        <router-view />
        <footer class="workspace-footer">可修件管理系統 <span>讓每一次維護，都有跡可循。</span></footer>
      </main>
    </div>
  </div>
</template>
