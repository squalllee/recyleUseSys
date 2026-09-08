<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import {
  createActionPhrase,
  createFaultReasonPhrase,
  createMaintTypePhrase,
  deleteActionPhrase,
  deleteFaultReasonPhrase,
  deleteMaintTypePhrase,
  getActionPhrases,
  getFaultReasonPhrases,
  getMaintTypePhrases,
  updateActionPhrase,
  updateFaultReasonPhrase,
  updateMaintTypePhrase,
  type ActionPhrase,
  type FaultReasonPhrase,
  type MaintTypePhrase,
} from '../services/apiService'

type PhraseKind = 'maint-type' | 'action' | 'fault-reason'
type PhraseItem = MaintTypePhrase | ActionPhrase | FaultReasonPhrase

const props = defineProps<{
  kind: PhraseKind
}>()

const config = computed(() => {
  const configs = {
    'maint-type': {
      title: '維修物件類型',
      nameLabel: '維修物件類型名稱',
      placeholder: '輸入維修物件類型名稱',
      idKey: 'MaintTypeID',
      nameKey: 'TypeName',
    },
    action: {
      title: '處理方式類型',
      nameLabel: '處理方式名稱',
      placeholder: '輸入處理方式名稱',
      idKey: 'ActionID',
      nameKey: 'ActionName',
    },
    'fault-reason': {
      title: '故障原因類型',
      nameLabel: '故障原因名稱',
      placeholder: '輸入故障原因名稱',
      idKey: 'ReasonID',
      nameKey: 'ReasonName',
    },
  } as const

  return configs[props.kind]
})

const items = ref<PhraseItem[]>([])
const loading = ref(false)
const errorMessage = ref('')
const modalVisible = ref(false)
const editingItem = ref<PhraseItem | null>(null)
const form = ref({
  name: '',
  sortOrder: '',
  isActive: true,
})

const getItemValue = (item: PhraseItem, key: string) =>
  (item as unknown as Record<string, string | number | boolean | null>)[key]

const loadItems = async () => {
  loading.value = true
  errorMessage.value = ''
  try {
    if (props.kind === 'maint-type') {
      items.value = await getMaintTypePhrases()
    } else if (props.kind === 'action') {
      items.value = await getActionPhrases()
    } else {
      items.value = await getFaultReasonPhrases()
    }
  } catch (error) {
    errorMessage.value = `載入失敗：${(error as Error).message}`
  } finally {
    loading.value = false
  }
}

const openCreateModal = () => {
  editingItem.value = null
  form.value = { name: '', sortOrder: '', isActive: true }
  modalVisible.value = true
}

const openEditModal = (item: PhraseItem) => {
  editingItem.value = item
  form.value = {
    name: String(getItemValue(item, config.value.nameKey) ?? ''),
    sortOrder: String(item.SortOrder ?? ''),
    isActive: item.IsActive ?? true,
  }
  modalVisible.value = true
}

const closeModal = () => {
  modalVisible.value = false
  editingItem.value = null
}

const saveItem = async () => {
  const name = form.value.name.trim()
  if (!name) {
    errorMessage.value = `${config.value.nameLabel}不可空白`
    return
  }

  errorMessage.value = ''
  const sortOrder = form.value.sortOrder === '' ? null : Number(form.value.sortOrder)

  try {
    if (props.kind === 'maint-type') {
      const data = { TypeName: name, SortOrder: sortOrder, IsActive: form.value.isActive }
      if (editingItem.value) {
        await updateMaintTypePhrase(
          Number(getItemValue(editingItem.value, 'MaintTypeID')),
          data
        )
      } else {
        await createMaintTypePhrase(data)
      }
    } else if (props.kind === 'action') {
      const data = { ActionName: name, SortOrder: sortOrder, IsActive: form.value.isActive }
      if (editingItem.value) {
        await updateActionPhrase(Number(getItemValue(editingItem.value, 'ActionID')), data)
      } else {
        await createActionPhrase(data)
      }
    } else {
      const data = { ReasonName: name, SortOrder: sortOrder, IsActive: form.value.isActive }
      if (editingItem.value) {
        await updateFaultReasonPhrase(Number(getItemValue(editingItem.value, 'ReasonID')), data)
      } else {
        await createFaultReasonPhrase(data)
      }
    }

    closeModal()
    await loadItems()
  } catch (error) {
    errorMessage.value = `儲存失敗：${(error as Error).message}`
  }
}

const deleteItem = async (item: PhraseItem) => {
  if (!globalThis.confirm(`確定要刪除「${getItemValue(item, config.value.nameKey)}」嗎？`)) {
    return
  }

  errorMessage.value = ''
  try {
    const id = Number(getItemValue(item, config.value.idKey))
    if (props.kind === 'maint-type') {
      await deleteMaintTypePhrase(id)
    } else if (props.kind === 'action') {
      await deleteActionPhrase(id)
    } else {
      await deleteFaultReasonPhrase(id)
    }
    await loadItems()
  } catch (error) {
    errorMessage.value = `刪除失敗：${(error as Error).message}`
  }
}

onMounted(loadItems)
</script>

<template>
  <section class="p-4 max-w-7xl mx-auto">
    <div class="mb-5 flex flex-wrap items-center justify-between gap-3">
      <div>
        <h2 class="text-xl font-bold text-slate-900">{{ config.title }}</h2>
        <p class="mt-1 text-sm text-slate-500">管理維修作業使用的選項與顯示順序 · 共 {{ items.length }} 筆資料</p>
      </div>
      <button
        type="button"
        class="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-blue-700"
        @click="openCreateModal"
      >
        <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
        </svg>
        新增{{ config.title }}
      </button>
    </div>

    <p
      v-if="errorMessage"
      role="alert"
      class="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
    >
      {{ errorMessage }}
    </p>

    <div class="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <div v-if="loading" class="p-8 text-center text-slate-500 animate-pulse">載入中...</div>
      <div v-else-if="items.length === 0" class="p-8 text-center text-slate-500">
        <p class="font-medium text-slate-700">尚未建立{{ config.title }}</p>
        <p class="mt-2 text-sm">點選上方新增按鈕，建立維修作業需要的選項。</p>
      </div>
      <div v-else class="overflow-x-auto">
        <table class="min-w-full divide-y divide-slate-200">
          <thead class="bg-slate-50">
            <tr>
              <th class="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">名稱</th>
              <th class="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">排序</th>
              <th class="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">狀態</th>
              <th class="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-slate-500">操作</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-200 bg-white">
            <tr v-for="item in items" :key="Number(getItemValue(item, config.idKey))" class="hover:bg-slate-50">
              <td class="px-6 py-4 text-sm text-slate-900">
                {{ getItemValue(item, config.nameKey) }}
              </td>
              <td class="px-6 py-4 text-sm text-slate-500">{{ item.SortOrder ?? '-' }}</td>
              <td class="px-6 py-4">
                <span
                  class="inline-flex rounded-full px-2 text-xs font-semibold leading-5"
                  :class="item.IsActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'"
                >
                  {{ item.IsActive ? '啟用' : '停用' }}
                </span>
              </td>
              <td class="px-6 py-4 text-right text-sm font-medium">
                <div class="flex justify-end gap-3">
                  <button class="text-blue-600 hover:text-blue-900" @click="openEditModal(item)">編輯</button>
                  <button class="text-red-600 hover:text-red-900" @click="deleteItem(item)">刪除</button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <div
      v-if="modalVisible"
      class="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4"
      role="dialog"
      aria-modal="true"
      @keydown.esc="closeModal"
    >
      <button class="fixed inset-0 cursor-default" aria-label="關閉" @click="closeModal"></button>
      <form
        class="relative z-10 w-full max-w-lg overflow-hidden rounded-xl bg-white shadow-xl"
        @submit.prevent="saveItem"
      >
        <div class="border-b border-slate-200 px-6 py-4">
          <h3 class="text-lg font-medium text-slate-900">
            {{ editingItem ? '編輯' : '新增' }} - {{ config.title }}
          </h3>
        </div>

        <div class="space-y-4 px-6 py-5">
          <p
            v-if="errorMessage"
            class="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
          >
            {{ errorMessage }}
          </p>
          <div>
            <label class="block text-sm font-medium text-slate-700">{{ config.nameLabel }} *</label>
            <input
              v-model="form.name"
              type="text"
              required
              autofocus
              :placeholder="config.placeholder"
              class="mt-1 block w-full rounded-md border border-slate-300 p-2 text-sm shadow-sm focus:border-blue-500 focus:ring-blue-500"
            />
          </div>
          <div>
            <label class="block text-sm font-medium text-slate-700">排序（選填）</label>
            <input
              v-model="form.sortOrder"
              type="number"
              placeholder="數字越小越靠前"
              class="mt-1 block w-full rounded-md border border-slate-300 p-2 text-sm shadow-sm focus:border-blue-500 focus:ring-blue-500"
            />
          </div>
          <label class="flex items-center gap-2">
            <input v-model="form.isActive" type="checkbox" class="h-4 w-4 rounded text-blue-600 focus:ring-blue-500" />
            <span class="text-sm text-slate-700">啟用</span>
          </label>
        </div>

        <div class="flex justify-end gap-3 border-t border-slate-200 bg-slate-50 px-6 py-3">
          <button type="button" class="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50" @click="closeModal">
            取消
          </button>
          <button type="submit" class="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">
            儲存
          </button>
        </div>
      </form>
    </div>
  </section>
</template>
