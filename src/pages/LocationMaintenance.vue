<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import {
  createRepairableLocation,
  deleteRepairableLocation,
  getRepairableDevices,
  updateRepairableLocation,
  type RepairableDevice,
} from '../services/apiService'

const locations = ref<RepairableDevice[]>([])
const loading = ref(false)
const saving = ref(false)
const errorMessage = ref('')
const keyword = ref('')
const modalVisible = ref(false)
const editingLocation = ref<RepairableDevice | null>(null)
const form = ref({ DeviceID: '', DeviceName: '' })

const filteredLocations = computed(() => {
  const search = keyword.value.trim().toLocaleLowerCase()
  if (!search) return locations.value
  return locations.value.filter((location) =>
    [location.DeviceID, location.DeviceName].some((value) =>
      value.toLocaleLowerCase().includes(search)
    )
  )
})

const loadLocations = async () => {
  loading.value = true
  errorMessage.value = ''
  try {
    locations.value = (await getRepairableDevices(null))
      .filter((location) => !location.CurrentLocationDeviceID)
      .sort((left, right) => left.DeviceID.localeCompare(right.DeviceID))
  } catch (error) {
    errorMessage.value = '載入位置失敗：' + (error as Error).message
  } finally {
    loading.value = false
  }
}

const openCreateModal = () => {
  editingLocation.value = null
  form.value = { DeviceID: '', DeviceName: '' }
  errorMessage.value = ''
  modalVisible.value = true
}

const openEditModal = (location: RepairableDevice) => {
  editingLocation.value = location
  form.value = {
    DeviceID: location.DeviceID,
    DeviceName: location.DeviceName,
  }
  errorMessage.value = ''
  modalVisible.value = true
}

const closeModal = () => {
  if (saving.value) return
  modalVisible.value = false
  editingLocation.value = null
}

const saveLocation = async () => {
  const deviceID = form.value.DeviceID.trim()
  const deviceName = form.value.DeviceName.trim()
  if (!deviceID || !deviceName) {
    errorMessage.value = '位置代碼與位置名稱皆為必填欄位'
    return
  }

  saving.value = true
  errorMessage.value = ''
  try {
    if (editingLocation.value) {
      await updateRepairableLocation(editingLocation.value.DeviceID, deviceName)
    } else {
      await createRepairableLocation({ DeviceID: deviceID, DeviceName: deviceName })
    }
    modalVisible.value = false
    editingLocation.value = null
    await loadLocations()
  } catch (error) {
    errorMessage.value = '儲存位置失敗：' + (error as Error).message
  } finally {
    saving.value = false
  }
}

const removeLocation = async (location: RepairableDevice) => {
  if (location.HasChildren) {
    errorMessage.value = '此位置仍有下層資料，請先移動或刪除下層可修件'
    return
  }
  if (!globalThis.confirm('確定要刪除「' + location.DeviceName + '（' + location.DeviceID + '）」嗎？')) return

  errorMessage.value = ''
  try {
    await deleteRepairableLocation(location.DeviceID)
    await loadLocations()
  } catch (error) {
    errorMessage.value = '刪除位置失敗：' + (error as Error).message
  }
}

onMounted(loadLocations)
</script>

<template>
  <section class="p-4 max-w-6xl mx-auto">
    <div class="mb-5 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h2 class="text-xl font-bold text-slate-900">位置維護作業</h2>
        <p class="mt-1 text-sm text-slate-500">維護可修件階層的最上層位置；新增可修件時必須選擇其中一個位置。</p>
      </div>
      <div class="flex flex-wrap items-center gap-2">
        <input
          v-model="keyword"
          type="search"
          aria-label="搜尋位置"
          placeholder="搜尋位置代碼或名稱"
          class="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:w-64"
        />
        <button
          type="button"
          class="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700"
          @click="openCreateModal"
        >
          <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
          </svg>
          新增位置
        </button>
      </div>
    </div>

    <p v-if="errorMessage" role="alert" class="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
      {{ errorMessage }}
    </p>

    <div class="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <div class="border-b border-slate-200 bg-slate-50/50 px-4 py-3 text-sm text-slate-600" aria-live="polite">
        共 {{ locations.length }} 個位置 · 目前顯示 {{ filteredLocations.length }} 個
      </div>
      <div v-if="loading" class="p-8 text-center text-slate-500 animate-pulse">載入中…</div>
      <div v-else-if="filteredLocations.length === 0" class="p-8 text-center text-slate-500">
        <p class="font-medium text-slate-700">{{ keyword ? '沒有符合搜尋條件的位置' : '目前尚未建立位置' }}</p>
        <p class="mt-2 text-sm">{{ keyword ? '請調整搜尋關鍵字。' : '請先新增位置，再建立可修件資料。' }}</p>
      </div>
      <div v-else class="overflow-x-auto">
        <table class="min-w-full divide-y divide-slate-200">
          <thead class="bg-slate-50">
            <tr>
              <th class="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">位置代碼</th>
              <th class="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">位置名稱</th>
              <th class="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">使用狀態</th>
              <th class="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-slate-500">操作</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-200 bg-white">
            <tr v-for="location in filteredLocations" :key="location.DeviceID" class="hover:bg-slate-50">
              <td class="px-6 py-4 font-mono text-sm text-slate-700">{{ location.DeviceID }}</td>
              <td class="px-6 py-4 text-sm font-medium text-slate-900">{{ location.DeviceName }}</td>
              <td class="px-6 py-4 text-sm">
                <span
                  class="rounded-full px-2 py-1 text-xs font-medium"
                  :class="location.HasChildren ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'"
                >
                  {{ location.HasChildren ? '已有下層可修件' : '尚無下層資料' }}
                </span>
              </td>
              <td class="px-6 py-4 text-right text-sm font-medium">
                <div class="flex justify-end gap-3">
                  <button type="button" class="text-blue-600 hover:text-blue-900" @click="openEditModal(location)">編輯</button>
                  <button
                    type="button"
                    :disabled="location.HasChildren"
                    class="text-red-600 hover:text-red-900 disabled:cursor-not-allowed disabled:text-slate-300"
                    :title="location.HasChildren ? '仍有下層資料，無法刪除' : '刪除位置'"
                    @click="removeLocation(location)"
                  >
                    刪除
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <div v-if="modalVisible" class="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4" role="dialog" aria-modal="true">
      <button type="button" class="fixed inset-0 cursor-default" aria-label="關閉" @click="closeModal"></button>
      <form class="relative z-10 w-full max-w-lg overflow-hidden rounded-xl bg-white shadow-xl" @submit.prevent="saveLocation">
        <div class="border-b border-slate-200 px-6 py-4">
          <h3 class="text-lg font-medium text-slate-900">{{ editingLocation ? '編輯位置' : '新增位置' }}</h3>
        </div>
        <div class="space-y-4 px-6 py-5">
          <p v-if="errorMessage" class="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{{ errorMessage }}</p>
          <div>
            <label class="block text-sm font-medium text-slate-700">位置代碼 *</label>
            <input
              v-model="form.DeviceID"
              type="text"
              maxlength="64"
              required
              :disabled="Boolean(editingLocation)"
              class="mt-1 block w-full rounded-md border border-slate-300 p-2 font-mono text-sm shadow-sm disabled:bg-slate-100"
            />
            <p v-if="editingLocation" class="mt-1 text-xs text-slate-500">位置代碼建立後不可修改。</p>
          </div>
          <div>
            <label class="block text-sm font-medium text-slate-700">位置名稱 *</label>
            <input v-model="form.DeviceName" type="text" maxlength="100" required class="mt-1 block w-full rounded-md border border-slate-300 p-2 text-sm shadow-sm" />
          </div>
        </div>
        <div class="flex justify-end gap-3 border-t border-slate-200 bg-slate-50 px-6 py-3">
          <button type="button" :disabled="saving" class="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50" @click="closeModal">取消</button>
          <button type="submit" :disabled="saving" class="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50">{{ saving ? '儲存中…' : '儲存' }}</button>
        </div>
      </form>
    </div>
  </section>
</template>

