<script setup lang="ts">
import { onBeforeUnmount, ref, watch } from 'vue'
import { searchRepairableDevices, type RepairableDevice } from '../services/apiService'

const props = withDefaults(defineProps<{
  modelValue: string
  placeholder?: string
  disabled?: boolean
}>(), {
  placeholder: '輸入可修件名稱搜尋',
  disabled: false,
})

const emit = defineEmits<{
  'update:modelValue': [value: string]
  select: [device: RepairableDevice]
}>()

const query = ref(props.modelValue)
const suggestions = ref<RepairableDevice[]>([])
const isOpen = ref(false)
const loading = ref(false)
const highlightedIndex = ref(-1)
let debounceTimer: ReturnType<typeof setTimeout> | null = null
let requestSeq = 0

watch(() => props.modelValue, (value) => {
  if (value !== query.value) query.value = value
})

const closeDropdown = () => {
  isOpen.value = false
  highlightedIndex.value = -1
}

const search = async (keyword: string) => {
  const seq = ++requestSeq
  loading.value = true
  try {
    const results = await searchRepairableDevices(keyword)
    if (seq !== requestSeq) return
    suggestions.value = results
    isOpen.value = true
    highlightedIndex.value = results.length ? 0 : -1
  } catch (error) {
    console.error('Failed to search repairable devices:', error)
    if (seq !== requestSeq) return
    suggestions.value = []
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
    closeDropdown()
    return
  }
  debounceTimer = setTimeout(() => search(keyword), 300)
}

const selectDevice = (device: RepairableDevice) => {
  query.value = device.DeviceName
  emit('update:modelValue', device.DeviceName)
  emit('select', device)
  closeDropdown()
}

const onKeydown = (event: KeyboardEvent) => {
  if (!isOpen.value || !suggestions.value.length) return
  if (event.key === 'ArrowDown') {
    event.preventDefault()
    highlightedIndex.value = (highlightedIndex.value + 1) % suggestions.value.length
  } else if (event.key === 'ArrowUp') {
    event.preventDefault()
    highlightedIndex.value = (highlightedIndex.value - 1 + suggestions.value.length) % suggestions.value.length
  } else if (event.key === 'Enter') {
    event.preventDefault()
    const selected = suggestions.value[highlightedIndex.value] ?? suggestions.value[0]
    if (selected) selectDevice(selected)
  } else if (event.key === 'Escape') {
    closeDropdown()
  }
}

const onBlur = () => setTimeout(closeDropdown, 150)

onBeforeUnmount(() => {
  if (debounceTimer) clearTimeout(debounceTimer)
})
</script>

<template>
  <div class="relative">
    <input
      :value="query"
      type="text"
      maxlength="100"
      :disabled="disabled"
      :placeholder="placeholder"
      autocomplete="off"
      class="mt-1 block w-full rounded-md border border-slate-300 p-2 text-sm shadow-sm focus:border-blue-500 focus:ring-blue-500"
      @input="onInput"
      @focus="query.trim() && suggestions.length && (isOpen = true)"
      @keydown="onKeydown"
      @blur="onBlur"
    />
    <ul v-if="isOpen" class="absolute z-30 mt-1 max-h-60 w-full overflow-auto rounded-md border border-slate-200 bg-white text-sm shadow-lg">
      <li v-if="loading" class="px-3 py-2 text-slate-400">搜尋中...</li>
      <template v-else-if="suggestions.length">
        <li
          v-for="(device, index) in suggestions"
          :key="device.DeviceID"
          class="cursor-pointer px-3 py-2 hover:bg-blue-50"
          :class="index === highlightedIndex ? 'bg-blue-50' : ''"
          @mousedown.prevent="selectDevice(device)"
          @mouseenter="highlightedIndex = index"
        >
          <div class="font-medium text-slate-900">{{ device.DeviceName }}</div>
          <div class="truncate text-slate-500">
            {{ device.DeviceID }}<span v-if="device.SerialNumber"> ・ 序號 {{ device.SerialNumber }}</span>
          </div>
        </li>
      </template>
      <li v-else class="px-3 py-2 text-slate-400">查無可修件</li>
    </ul>
  </div>
</template>
