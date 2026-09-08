<script setup lang="ts">
import { useAuthStore } from '../stores/auth'
const auth = useAuthStore()
const settings = [
  { to: '/maintenance-object-types', title: '維修物件類型', description: '管理檢修類別，統一維修記錄的分類。' },
  { to: '/action-types', title: '處理方式類型', description: '維護常用處理方式，減少重複輸入。' },
  { to: '/fault-reason-types', title: '故障原因類型', description: '建立一致的原因選項，方便後續追蹤。' },
]
</script>

<template>
  <section class="home-page">
    <div class="home-heading">
      <div><p class="eyebrow">日常維護，從這裡開始</p><h1>{{ auth.userInfo?.TMNAME || '使用者' }}，歡迎回來</h1><p class="page-description">集中管理可修件資料，掌握每一筆維修歷程。</p></div>
      <span class="workspace-badge">維修管理工作台</span>
    </div>
    <div class="home-actions">
      <RouterLink to="/repairable-devices" class="action-card primary-action">
        <span class="action-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"><path d="M4 7l8-4 8 4v10l-8 4-8-4V7zm0 0l8 4 8-4m-8 4v10" /></svg></span>
        <span class="action-kicker">設備與階層</span><h2>可修件資料維護</h2><p>查找設備、料號與序號，查看設備階層，或建立新的可修件資料。</p><span class="action-link">管理可修件 <span aria-hidden="true">↗</span></span>
      </RouterLink>
      <RouterLink to="/maintenance-records" class="action-card">
        <span class="action-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"><path d="M9 5H5v16h14V5h-4M9 3h6v4H9V3zm0 9h6m-6 4h6" /></svg></span>
        <span class="action-kicker">檢修與追蹤</span><h2>維修記錄維護</h2><p>依物料查詢維修歷程，登錄檢修內容，並更新完工與安裝資訊。</p><span class="action-link">查詢維修記錄 <span aria-hidden="true">↗</span></span>
      </RouterLink>
    </div>
    <section class="workflow-panel" aria-labelledby="workflow-title">
      <p class="eyebrow">操作指引</p><h2 id="workflow-title">三個步驟，留下完整維護歷程</h2>
      <ol class="workflow-steps">
        <li><span>1</span><div><strong>建立可修件</strong><p>確認設備、料號與所在階層。</p></div></li>
        <li><span>2</span><div><strong>登錄維修記錄</strong><p>記下故障原因與檢修方式。</p></div></li>
        <li><span>3</span><div><strong>更新完工資訊</strong><p>補齊日期、位置與處理結果。</p></div></li>
      </ol>
    </section>
    <section aria-labelledby="settings-title">
      <div class="section-heading"><h2 id="settings-title">基本資料設定</h2><p>維護作業中使用的分類與選項</p></div>
      <div class="settings-grid"><RouterLink v-for="(item, index) in settings" :key="item.to" :to="item.to" class="settings-card"><span class="setting-number">0{{ index + 1 }}</span><h3>{{ item.title }}</h3><p>{{ item.description }}</p><span class="setting-arrow" aria-hidden="true">→</span></RouterLink></div>
    </section>
  </section>
</template>
