<script setup lang="ts">
import { ref, watch, onBeforeUnmount } from 'vue'
import { searchEmployees, getEmployeeByKeyno, type Employee } from '../services/apiService'

const props = withDefaults(
  defineProps<{
    modelValue: string
    placeholder?: string
    disabled?: boolean
  }>(),
  {
    placeholder: '輸入姓名或員工編號搜尋',
    disabled: false,
  }
)

const emit = defineEmits<{
  'update:modelValue': [value: string]
  select: [employee: Employee]
}>()

const labelOf = (employee: Employee) => `${employee.KEYNO}-${employee.TMNAME}`

const displayText = ref('')
const committedKeyno = ref('')
const committedLabel = ref('')
const hasPendingEdit = ref(false)
const suggestions = ref<Employee[]>([])
const isOpen = ref(false)
const loading = ref(false)
const errorMessage = ref('')
const highlightedIndex = ref(-1)
let debounceTimer: ReturnType<typeof setTimeout> | null = null
let requestSeq = 0

// 依 KEYNO 反查姓名，讓已選定的值能以「員工編號-員工姓名」顯示
const syncFromModelValue = async (keyno: string) => {
  if (!keyno) {
    committedKeyno.value = ''
    committedLabel.value = ''
    displayText.value = ''
    return
  }
  if (keyno === committedKeyno.value) return

  committedKeyno.value = keyno
  try {
    const employee = await getEmployeeByKeyno(keyno)
    committedLabel.value = labelOf(employee)
  } catch (error) {
    console.error('Failed to load employee by KEYNO:', error)
    committedLabel.value = keyno
  }
  displayText.value = committedLabel.value
}

watch(
  () => props.modelValue,
  (value) => {
    if (!hasPendingEdit.value) syncFromModelValue(value)
  },
  { immediate: true }
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
    const results = await searchEmployees(keyword)
    if (seq !== requestSeq) return // stale response, a newer search has started
    // 只保留姓名或員工編號確實包含使用者輸入關鍵字的項目
    const lowerKeyword = keyword.toLowerCase()
    suggestions.value = results
      .filter(
        (item) =>
          item.TMNAME?.toLowerCase().includes(lowerKeyword) ||
          item.KEYNO?.toLowerCase().includes(lowerKeyword)
      )
      .slice(0, 50)
    isOpen.value = true
    highlightedIndex.value = suggestions.value.length > 0 ? 0 : -1
  } catch (error) {
    console.error('Failed to search employees:', error)
    if (seq !== requestSeq) return
    suggestions.value = []
    errorMessage.value = '無法取得員工資料，請確認 API 服務是否已啟動'
    isOpen.value = true
  } finally {
    if (seq === requestSeq) loading.value = false
  }
}

const onInput = (event: Event) => {
  const value = (event.target as HTMLInputElement).value
  displayText.value = value
  hasPendingEdit.value = true

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
  // 清空顯示文字讓使用者可以直接輸入新的搜尋關鍵字（必須重新選擇才能變更值）
  displayText.value = ''
  suggestions.value = []
  errorMessage.value = ''
}

const selectEmployee = (employee: Employee) => {
  committedKeyno.value = employee.KEYNO
  committedLabel.value = labelOf(employee)
  displayText.value = committedLabel.value
  hasPendingEdit.value = false
  emit('update:modelValue', employee.KEYNO)
  emit('select', employee)
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
    if (chosen) selectEmployee(chosen)
  } else if (event.key === 'Escape') {
    closeDropdown()
  }
}

const onBlur = () => {
  // 延遲讓下拉選項的 mousedown 事件能先觸發選取
  setTimeout(() => {
    closeDropdown()
    if (hasPendingEdit.value) {
      // 使用者有輸入文字但未從清單中選取，不允許手動輸入，清空欄位
      hasPendingEdit.value = false
      committedKeyno.value = ''
      committedLabel.value = ''
      displayText.value = ''
      if (props.modelValue) emit('update:modelValue', '')
    } else {
      // 未輸入任何文字，恢復原本已選定的顯示內容
      displayText.value = committedLabel.value
    }
  }, 150)
}

onBeforeUnmount(() => {
  if (debounceTimer) clearTimeout(debounceTimer)
})
</script>

<template>
  <div class="relative">
    <input
      :value="displayText"
      type="text"
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
          :key="item.KEYNO"
          class="cursor-pointer px-3 py-2 hover:bg-blue-50"
          :class="index === highlightedIndex ? 'bg-blue-50' : ''"
          @mousedown.prevent="selectEmployee(item)"
          @mouseenter="highlightedIndex = index"
        >
          <div class="font-medium text-slate-900">{{ item.TMNAME }}（{{ item.KEYNO }}）</div>
          <div class="text-slate-500 truncate">
            {{ item.JOBName || '-' }}<span v-if="item.UNITNO"> ・ {{ item.UNITNO }}</span>
          </div>
        </li>
      </template>
      <li v-else class="px-3 py-2 text-slate-400">查無資料</li>
    </ul>
  </div>
</template>
