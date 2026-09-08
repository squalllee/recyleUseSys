<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import type { Location } from '../services/apiService'

const props = withDefaults(
  defineProps<{
    modelValue: string
    locations: Location[]
    placeholder?: string
    disabled?: boolean
  }>(),
  {
    placeholder: '輸入地點代碼或地點名稱搜尋',
    disabled: false,
  }
)

const emit = defineEmits<{
  'update:modelValue': [value: string]
  select: [location: Location]
}>()

const labelOf = (location: Location) => `${location.LocationCode} - ${location.LocationName}`

const displayText = ref('')
const committedCode = ref('')
const hasPendingEdit = ref(false)
const isOpen = ref(false)
const highlightedIndex = ref(-1)

// 依代碼從已載入的地點清單找出對應名稱，讓已選定的值能以「代碼 - 名稱」顯示
const syncFromModelValue = (code: string) => {
  committedCode.value = code
  if (!code) {
    displayText.value = ''
    return
  }
  const match = props.locations.find((item) => item.LocationCode === code)
  displayText.value = match ? labelOf(match) : code
}

watch(
  () => props.modelValue,
  (value) => {
    if (!hasPendingEdit.value) syncFromModelValue(value)
  },
  { immediate: true }
)

// 地點清單可能在元件掛載後才非同步載入完成，載入後補上顯示用的名稱
watch(
  () => props.locations,
  () => {
    if (!hasPendingEdit.value) syncFromModelValue(props.modelValue)
  }
)

// 已停用的地點不提供給使用者選擇
const activeLocations = computed(() => props.locations.filter((item) => item.IsActive !== false))

const suggestions = computed(() => {
  const keyword = displayText.value.trim().toLowerCase()
  const list = keyword
    ? activeLocations.value.filter(
        (item) =>
          item.LocationCode.toLowerCase().includes(keyword) ||
          item.LocationName.toLowerCase().includes(keyword)
      )
    : activeLocations.value
  return list.slice(0, 50)
})

const closeDropdown = () => {
  isOpen.value = false
  highlightedIndex.value = -1
}

const openDropdown = () => {
  isOpen.value = true
  highlightedIndex.value = suggestions.value.length > 0 ? 0 : -1
}

const onInput = (event: Event) => {
  displayText.value = (event.target as HTMLInputElement).value
  hasPendingEdit.value = true
  openDropdown()
}

const onFocus = () => {
  // 清空顯示文字讓使用者可以直接輸入新的搜尋關鍵字（必須重新選擇才能變更值）
  displayText.value = ''
  hasPendingEdit.value = true
  openDropdown()
}

const selectLocation = (location: Location) => {
  committedCode.value = location.LocationCode
  displayText.value = labelOf(location)
  hasPendingEdit.value = false
  emit('update:modelValue', location.LocationCode)
  emit('select', location)
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
    if (chosen) selectLocation(chosen)
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
      committedCode.value = ''
      displayText.value = ''
      if (props.modelValue) emit('update:modelValue', '')
    } else {
      // 未輸入任何文字，恢復原本已選定的顯示內容
      syncFromModelValue(committedCode.value)
    }
  }, 150)
}
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
      <template v-if="suggestions.length > 0">
        <li
          v-for="(item, index) in suggestions"
          :key="item.LocationID"
          class="cursor-pointer px-3 py-2 hover:bg-blue-50"
          :class="index === highlightedIndex ? 'bg-blue-50' : ''"
          @mousedown.prevent="selectLocation(item)"
          @mouseenter="highlightedIndex = index"
        >
          <span class="font-medium text-slate-900">{{ item.LocationCode }} - {{ item.LocationName }}</span>
        </li>
      </template>
      <li v-else class="px-3 py-2 text-slate-400">查無資料</li>
    </ul>
  </div>
</template>
