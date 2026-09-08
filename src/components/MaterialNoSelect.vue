<script setup lang="ts">
import { ref, watch, onBeforeUnmount } from 'vue'
import { searchMaterials, type Material } from '../services/apiService'

const props = withDefaults(
  defineProps<{
    modelValue: string
    placeholder?: string
    maxlength?: number
    disabled?: boolean
  }>(),
  {
    placeholder: '輸入物料編號或名稱搜尋',
    maxlength: 13,
    disabled: false,
  }
)

const emit = defineEmits<{
  'update:modelValue': [value: string]
  select: [material: Material]
}>()

const query = ref(props.modelValue)
const suggestions = ref<Material[]>([])
const isOpen = ref(false)
const loading = ref(false)
const errorMessage = ref('')
const highlightedIndex = ref(-1)
let debounceTimer: ReturnType<typeof setTimeout> | null = null
let requestSeq = 0

watch(
  () => props.modelValue,
  (value) => {
    if (value !== query.value) {
      query.value = value
    }
  }
)

const closeDropdown = () => {
  isOpen.value = false
  highlightedIndex.value = -1
}

const search = async (keyword: string) => {
  const seq = ++requestSeq
  loading.value = true
  errorMessage.value = ''
  try {
    const results = await searchMaterials(keyword)
    if (seq !== requestSeq) return // stale response, a newer search has started
    // 只保留物料編號或物料名稱確實包含使用者輸入關鍵字的項目
    const lowerKeyword = keyword.toLowerCase()
    suggestions.value = results
      .filter(
        (item) =>
          item.物料編號?.toLowerCase().includes(lowerKeyword) ||
          item.物料名稱?.toLowerCase().includes(lowerKeyword)
      )
      .slice(0, 50)
    isOpen.value = true
    highlightedIndex.value = suggestions.value.length > 0 ? 0 : -1
  } catch (error) {
    console.error('Failed to search materials:', error)
    if (seq !== requestSeq) return
    suggestions.value = []
    errorMessage.value = '無法取得物料資料，請確認 API 服務是否已啟動'
    isOpen.value = true
  } finally {
    if (seq === requestSeq) loading.value = false
  }
}

const onInput = (event: Event) => {
  const value = (event.target as HTMLInputElement).value
  query.value = value
  emit('update:modelValue', value)

  if (debounceTimer) clearTimeout(debounceTimer)

  const keyword = value.trim()
  if (!keyword) {
    suggestions.value = []
    errorMessage.value = ''
    closeDropdown()
    return
  }

  debounceTimer = setTimeout(() => search(keyword), 300)
}

const onFocus = () => {
  if (query.value.trim() && suggestions.value.length > 0) {
    isOpen.value = true
  }
}

const selectMaterial = (material: Material) => {
  const normalized: Material = { ...material, 物料編號: material.物料編號.trim() }
  query.value = normalized.物料編號
  emit('update:modelValue', normalized.物料編號)
  emit('select', normalized)
  closeDropdown()
}

const onKeydown = (event: KeyboardEvent) => {
  if (!isOpen.value || suggestions.value.length === 0) {
    return
  }

  if (event.key === 'ArrowDown') {
    event.preventDefault()
    highlightedIndex.value = (highlightedIndex.value + 1) % suggestions.value.length
  } else if (event.key === 'ArrowUp') {
    event.preventDefault()
    highlightedIndex.value =
      (highlightedIndex.value - 1 + suggestions.value.length) % suggestions.value.length
  } else if (event.key === 'Enter') {
    event.preventDefault()
    const chosen = suggestions.value[highlightedIndex.value] ?? suggestions.value[0]
    if (chosen) selectMaterial(chosen)
  } else if (event.key === 'Escape') {
    closeDropdown()
  }
}

const onBlur = () => {
  // Delay so a mousedown on an option registers before the list unmounts
  setTimeout(closeDropdown, 150)
}

onBeforeUnmount(() => {
  if (debounceTimer) clearTimeout(debounceTimer)
})
</script>

<template>
  <div class="relative">
    <input
      :value="query"
      type="text"
      :maxlength="maxlength"
      :disabled="disabled"
      :placeholder="placeholder"
      autocomplete="off"
      class="mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 border"
      @input="onInput"
      @focus="onFocus"
      @keydown="onKeydown"
      @blur="onBlur"
    />

    <ul
      v-if="isOpen"
      class="absolute z-30 mt-1 w-full max-h-60 overflow-auto rounded-md border border-slate-200 bg-white shadow-lg text-sm"
    >
      <li v-if="loading" class="px-3 py-2 text-slate-400">搜尋中...</li>
      <li v-else-if="errorMessage" class="px-3 py-2 text-red-500">{{ errorMessage }}</li>
      <template v-else-if="suggestions.length > 0">
        <li
          v-for="(item, index) in suggestions"
          :key="item.物料編號"
          class="cursor-pointer px-3 py-2 hover:bg-blue-50"
          :class="index === highlightedIndex ? 'bg-blue-50' : ''"
          :title="`${item.物料編號} - ${item.物料名稱}${item.規格 ? ' ・ ' + item.規格 : ''}`"
          @mousedown.prevent="selectMaterial(item)"
          @mouseenter="highlightedIndex = index"
        >
          <div class="font-medium text-slate-900 truncate">{{ item.物料編號 }}</div>
          <div class="text-slate-500 truncate">
            {{ item.物料名稱 }}<span v-if="item.規格"> ・ {{ item.規格 }}</span>
          </div>
        </li>
      </template>
      <li v-else class="px-3 py-2 text-slate-400">查無資料</li>
    </ul>
  </div>
</template>
