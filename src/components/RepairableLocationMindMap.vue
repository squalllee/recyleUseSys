<script setup lang="ts">
import { computed, nextTick, onMounted, ref } from 'vue'
import {
  getRepairableLocationMap,
  type RepairableLocationMapNode,
} from '../services/apiService'

const props = defineProps<{
  system: string | null
  subSystem: string | null
  excludeDeviceId?: string
}>()

const emit = defineEmits<{
  close: []
  select: [node: RepairableLocationMapNode]
}>()

type GraphNode = RepairableLocationMapNode & { x: number; y: number; hasChildren: boolean }
type GraphLink = { id: string; path: string }

const loading = ref(false)
const errorMessage = ref('')
const records = ref<RepairableLocationMapNode[]>([])
const expandedIDs = ref<Set<string>>(new Set())
const searchKeyword = ref('')
const searchPanelOpen = ref(false)
const highlightedDeviceID = ref<string | null>(null)
const mapViewport = ref<HTMLElement | null>(null)

const matchingSearchResults = computed(() => {
  const keyword = searchKeyword.value.trim().toLocaleLowerCase()
  if (!keyword) return []

  const rank = (node: RepairableLocationMapNode) => {
    const deviceID = node.DeviceID.toLocaleLowerCase()
    const deviceName = node.DeviceName.toLocaleLowerCase()
    if (deviceID === keyword || deviceName === keyword) return 0
    if (deviceID.startsWith(keyword) || deviceName.startsWith(keyword)) return 1
    return 2
  }

  return records.value
    .filter((node) =>
      node.DeviceID.toLocaleLowerCase().includes(keyword)
      || node.DeviceName.toLocaleLowerCase().includes(keyword)
    )
    .sort((left, right) => rank(left) - rank(right) || left.DeviceID.localeCompare(right.DeviceID))
})

const visibleSearchResults = computed(() => matchingSearchResults.value.slice(0, 50))

const graph = computed(() => {
  if (!records.value.length) return null

  const nodeByID = new Map(records.value.map((node) => [node.DeviceID, node]))
  const childrenByID = new Map<string, RepairableLocationMapNode[]>()
  const roots: RepairableLocationMapNode[] = []

  for (const node of records.value) {
    if (!node.CurrentLocationDeviceID || !nodeByID.has(node.CurrentLocationDeviceID)) {
      roots.push(node)
      continue
    }
    const children = childrenByID.get(node.CurrentLocationDeviceID) || []
    children.push(node)
    childrenByID.set(node.CurrentLocationDeviceID, children)
  }

  const compare = (left: RepairableLocationMapNode, right: RepairableLocationMapNode) =>
    left.DeviceID.localeCompare(right.DeviceID)
  roots.sort(compare)
  for (const children of childrenByID.values()) children.sort(compare)

  const columnGap = 320
  const rowGap = 128
  const nodeHalfWidth = 120
  const nodeHalfHeight = 46
  const marginX = 48
  const marginY = 48
  const placed: GraphNode[] = []
  const rawLinks: Array<{ parentID: string; childID: string }> = []
  const visited = new Set<string>()
  let leafIndex = 0

  const place = (node: RepairableLocationMapNode, depth: number): GraphNode => {
    visited.add(node.DeviceID)
    const allChildren = childrenByID.get(node.DeviceID) || []
    const childNodes = expandedIDs.value.has(node.DeviceID)
      ? allChildren
          .filter((child) => !visited.has(child.DeviceID))
          .map((child) => place(child, depth + 1))
      : []
    const y = childNodes.length
      ? (childNodes[0].y + childNodes[childNodes.length - 1].y) / 2
      : leafIndex++ * rowGap
    const graphNode = { ...node, x: depth * columnGap, y, hasChildren: allChildren.length > 0 }
    placed.push(graphNode)
    for (const child of childNodes) {
      rawLinks.push({ parentID: node.DeviceID, childID: child.DeviceID })
    }
    return graphNode
  }

  for (const root of roots) place(root, 0)

  if (!placed.length) return null

  const minX = Math.min(...placed.map((node) => node.x - nodeHalfWidth))
  const maxX = Math.max(...placed.map((node) => node.x + nodeHalfWidth))
  const minY = Math.min(...placed.map((node) => node.y - nodeHalfHeight))
  const maxY = Math.max(...placed.map((node) => node.y + nodeHalfHeight))
  const width = Math.max(680, maxX - minX + marginX * 2)
  const height = Math.max(360, maxY - minY + marginY * 2)
  const shiftX = marginX - minX
  const shiftY = marginY - minY
  const nodes = placed.map((node) => ({ ...node, x: node.x + shiftX, y: node.y + shiftY }))
  const positions = new Map(nodes.map((node) => [node.DeviceID, node]))
  const links: GraphLink[] = rawLinks.flatMap((link, index) => {
    const parent = positions.get(link.parentID)
    const child = positions.get(link.childID)
    if (!parent || !child) return []
    const startX = parent.x + nodeHalfWidth
    const endX = child.x - nodeHalfWidth
    const controlX = (startX + endX) / 2
    return [{
      id: `${link.parentID}-${link.childID}-${index}`,
      path: `M ${startX} ${parent.y} C ${controlX} ${parent.y} ${controlX} ${child.y} ${endX} ${child.y}`,
    }]
  })

  return { width, height, nodes, links }
})

const typeLabel = (node: RepairableLocationMapNode) => {
  return node.CurrentLocationDeviceID ? '可修件' : '位置'
}

const nodeSymbol = (node: RepairableLocationMapNode) => {
  return node.CurrentLocationDeviceID ? '修' : '位'
}

const toggleExpanded = (deviceID: string) => {
  const next = new Set(expandedIDs.value)
  if (next.has(deviceID)) next.delete(deviceID)
  else next.add(deviceID)
  expandedIDs.value = next
}

const onSearchInput = () => {
  highlightedDeviceID.value = null
  searchPanelOpen.value = Boolean(searchKeyword.value.trim())
}

const clearSearch = () => {
  searchKeyword.value = ''
  highlightedDeviceID.value = null
  searchPanelOpen.value = false
}

const locateSearchResult = async (node: RepairableLocationMapNode) => {
  const nodeByID = new Map(records.value.map((item) => [item.DeviceID, item]))
  const nextExpandedIDs = new Set(expandedIDs.value)
  const visited = new Set<string>()
  let parentID = node.CurrentLocationDeviceID

  while (parentID && !visited.has(parentID)) {
    visited.add(parentID)
    nextExpandedIDs.add(parentID)
    parentID = nodeByID.get(parentID)?.CurrentLocationDeviceID || null
  }

  expandedIDs.value = nextExpandedIDs
  highlightedDeviceID.value = node.DeviceID
  searchPanelOpen.value = false
  await nextTick()

  const candidates = mapViewport.value?.querySelectorAll<HTMLElement>('[data-mind-map-device-id]')
  const target = Array.from(candidates || [])
    .find((element) => element.dataset.mindMapDeviceId === node.DeviceID)
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  target?.scrollIntoView({ behavior: reducedMotion ? 'auto' : 'smooth', block: 'center', inline: 'center' })
  target?.querySelector<HTMLButtonElement>('[data-primary-node]')?.focus({ preventScroll: true })
}

const locateFirstSearchResult = () => {
  const firstResult = visibleSearchResults.value[0]
  if (firstResult) void locateSearchResult(firstResult)
}

const loadMap = async () => {
  loading.value = true
  errorMessage.value = ''
  try {
    const result = await getRepairableLocationMap(
      props.system,
      props.subSystem,
      props.excludeDeviceId
    )
    records.value = result
    const deviceIDs = new Set(result.map((node) => node.DeviceID))
    expandedIDs.value = new Set(
      result
        .filter((node) => !node.CurrentLocationDeviceID || !deviceIDs.has(node.CurrentLocationDeviceID))
        .map((node) => node.DeviceID)
    )
  } catch (error) {
    errorMessage.value = `載入目前位置心智圖失敗：${(error as Error).message}`
  } finally {
    loading.value = false
  }
}

onMounted(loadMap)
</script>

<template>
  <div class="fixed inset-0 z-[70] flex items-center justify-center bg-slate-900/60 p-4" role="dialog" aria-modal="true" aria-labelledby="location-map-title">
    <button type="button" class="fixed inset-0 cursor-default" aria-label="關閉目前位置心智圖" @click="emit('close')"></button>
    <div class="relative z-10 flex h-[88dvh] max-h-[960px] w-full max-w-7xl flex-col overflow-hidden rounded-2xl border border-white/60 bg-[#f7f6f2] shadow-2xl">
      <div class="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-white px-6 py-4">
        <div>
          <p class="mb-1 text-xs font-medium tracking-wider text-blue-700">位置心智圖</p>
          <h3 id="location-map-title" class="text-xl font-semibold text-slate-900">選擇目前位置</h3>
          <p class="mt-1 text-sm text-slate-500">
            <template v-if="system && subSystem">系統 {{ system }} · 子系統 {{ subSystem }}</template>
            <template v-else>未指定系統分類，顯示可用位置</template>
          </p>
          <p class="mt-2 text-xs leading-5 text-slate-600">點選卡片設定位置，使用右側＋／−瀏覽下層。也可以搜尋名稱或 DeviceID 快速定位。</p>
        </div>
        <button type="button" class="rounded-md bg-slate-800 px-4 py-2 text-sm font-medium text-white hover:bg-slate-900" @click="emit('close')">關閉</button>
      </div>

      <div v-if="!loading && !errorMessage && records.length" class="relative z-30 border-b border-slate-200 bg-white px-6 py-3">
        <div class="relative max-w-2xl">
          <label for="mind-map-search" class="sr-only">依名稱或 DeviceID 搜尋心智圖節點</label>
          <svg class="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="m21 21-4.35-4.35m2.1-5.4a7.5 7.5 0 1 1-15 0 7.5 7.5 0 0 1 15 0Z" />
          </svg>
          <input
            id="mind-map-search"
            v-model="searchKeyword"
            type="search"
            autocomplete="off"
            placeholder="輸入名稱或 DeviceID 搜尋"
            class="block w-full rounded-lg border border-slate-300 bg-slate-50 py-2 pl-10 pr-24 text-sm text-slate-900 shadow-sm outline-none focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-100"
            @input="onSearchInput"
            @focus="searchPanelOpen = Boolean(searchKeyword.trim())"
            @keydown.enter.prevent="locateFirstSearchResult"
            @keydown.esc.stop="searchPanelOpen = false"
          />
          <button
            v-if="searchKeyword"
            type="button"
            class="absolute right-3 top-1/2 -translate-y-1/2 rounded px-2 py-1 text-xs font-medium text-slate-500 hover:bg-slate-200 hover:text-slate-800"
            @click="clearSearch"
          >
            清除
          </button>

          <div
            v-if="searchPanelOpen && searchKeyword.trim()"
            class="absolute left-0 right-0 top-full z-40 mt-2 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl"
          >
            <p class="border-b border-slate-100 bg-slate-50 px-3 py-2 text-xs text-slate-500" aria-live="polite">
              找到 {{ matchingSearchResults.length }} 筆
              <template v-if="matchingSearchResults.length > visibleSearchResults.length">，顯示前 {{ visibleSearchResults.length }} 筆</template>
            </p>
            <div v-if="visibleSearchResults.length" class="max-h-64 overflow-y-auto py-1">
              <button
                v-for="node in visibleSearchResults"
                :key="node.DeviceID"
                type="button"
                class="flex w-full items-center gap-3 px-3 py-2 text-left hover:bg-blue-50 focus:bg-blue-50 focus:outline-none"
                @mousedown.prevent
                @click="locateSearchResult(node)"
              >
                <span class="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-blue-100 text-[10px] font-bold text-blue-700">{{ nodeSymbol(node) }}</span>
                <span class="min-w-0 flex-1">
                  <span class="block truncate text-sm font-medium text-slate-900">{{ node.DeviceName }}</span>
                  <span class="block truncate font-mono text-xs text-slate-500">{{ node.DeviceID }}</span>
                </span>
                <span class="shrink-0 text-xs text-blue-600">定位</span>
              </button>
            </div>
            <p v-else class="px-4 py-6 text-center text-sm text-slate-500">找不到符合名稱或 DeviceID 的節點</p>
          </div>
        </div>
      </div>

      <div ref="mapViewport" class="mind-map-canvas min-h-0 flex-1 overflow-auto p-3 sm:p-6">
        <div v-if="loading" class="flex min-h-[360px] items-center justify-center text-slate-500">
          <div class="text-center">
            <svg class="mx-auto h-8 w-8 animate-spin text-blue-600" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="9" stroke="currentColor" stroke-width="3" />
              <path class="opacity-75" fill="currentColor" d="M12 3a9 9 0 0 1 9 9h-3a6 6 0 0 0-6-6V3Z" />
            </svg>
            <p class="mt-3 text-sm">正在載入完整心智圖…</p>
          </div>
        </div>
        <div v-else-if="errorMessage" role="alert" class="rounded-lg border border-red-200 bg-red-50 px-4 py-8 text-center text-sm text-red-700">
          <p>{{ errorMessage }}</p>
          <button type="button" class="mt-4 rounded-lg border border-red-300 bg-white px-4 py-2 font-medium" @click="loadMap">重新載入</button>
        </div>
        <div v-else-if="graph" class="min-w-max">
          <div class="relative" :style="{ width: `${graph.width}px`, height: `${graph.height}px` }">
            <svg class="pointer-events-none absolute inset-0 h-full w-full" :viewBox="`0 0 ${graph.width} ${graph.height}`" preserveAspectRatio="none" aria-hidden="true">
              <path v-for="link in graph.links" :key="link.id" :d="link.path" fill="none" stroke="#9bafbd" stroke-linecap="round" stroke-width="2" />
            </svg>

            <div
              v-for="node in graph.nodes"
              :key="node.DeviceID"
              class="group absolute z-10 h-[92px] w-[240px] -translate-x-1/2 -translate-y-1/2 hover:z-20 focus-within:z-20"
              :style="{ left: `${node.x}px`, top: `${node.y}px` }"
              :data-mind-map-device-id="node.DeviceID"
            >
              <button
                type="button"
                data-primary-node
                :aria-disabled="!node.CanSelect"
                :aria-label="`${node.CanSelect ? '選擇' : '查看'}${typeLabel(node)} ${node.DeviceName}`"
                class="flex h-full w-full flex-col justify-center rounded-xl border border-l-4 px-4 py-3 text-left shadow-sm transition-colors focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-600"
                :class="[
                  node.CanSelect
                    ? 'cursor-pointer border-blue-300 border-l-blue-600 bg-white text-slate-900 hover:border-blue-600 hover:bg-blue-50'
                    : 'cursor-default border-slate-300 bg-stone-50 text-slate-600',
                  highlightedDeviceID === node.DeviceID ? 'ring-4 ring-blue-200 ring-offset-2' : '',
                ]"
                @click="node.CanSelect && emit('select', node)"
              >
                <span class="mb-1 flex w-full items-center justify-between gap-2 text-[10px] font-medium">
                  <span :class="node.CanSelect ? 'text-blue-700' : 'text-slate-600'">{{ typeLabel(node) }}</span>
                  <span class="text-slate-500">{{ node.CanSelect ? '可選擇' : '路徑節點' }}</span>
                </span>
                <span class="block w-full truncate text-sm font-semibold">{{ node.DeviceName }}</span>
                <span class="mt-1 block w-full truncate font-mono text-xs text-slate-500">{{ node.DeviceID }}</span>
              </button>

              <button
                v-if="node.hasChildren"
                type="button"
                class="absolute -right-4 top-1/2 z-20 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full border border-blue-200 bg-white text-lg font-medium leading-none text-blue-700 shadow-sm hover:border-blue-500 hover:bg-blue-50"
                :aria-expanded="expandedIDs.has(node.DeviceID)"
                :aria-label="expandedIDs.has(node.DeviceID) ? `收合 ${node.DeviceName} 的下層` : `展開 ${node.DeviceName} 的下層`"
                :title="expandedIDs.has(node.DeviceID) ? '收合下層' : '展開下層'"
                @click.stop="toggleExpanded(node.DeviceID)"
              >
                {{ expandedIDs.has(node.DeviceID) ? '−' : '+' }}
              </button>

              <div
                class="pointer-events-none invisible absolute z-50 w-72 rounded-lg bg-slate-900 px-3 py-2 text-left text-xs text-white opacity-0 shadow-xl transition-opacity group-hover:visible group-hover:opacity-100 group-focus-within:visible group-focus-within:opacity-100"
                :class="[
                  node.y < 190 ? 'top-full mt-2' : 'bottom-full mb-2',
                  node.x > graph.width - 300 ? 'right-0' : 'left-0',
                ]"
              >
                <div class="flex items-start justify-between gap-2">
                  <p class="font-semibold leading-5">{{ node.DeviceName }}</p>
                  <span class="shrink-0 rounded bg-white/15 px-1.5 py-0.5 text-[10px]">{{ typeLabel(node) }}</span>
                </div>
                <dl class="mt-1 grid grid-cols-[4rem_1fr] gap-x-2 gap-y-0.5 text-slate-200">
                  <dt class="text-slate-400">DeviceID</dt><dd class="break-all font-mono">{{ node.DeviceID }}</dd>
                  <template v-if="node.MaterialNo"><dt class="text-slate-400">料號</dt><dd class="break-all font-mono">{{ node.MaterialNo }}</dd></template>
                  <template v-if="node.SerialNumber"><dt class="text-slate-400">序號</dt><dd class="break-all font-mono">{{ node.SerialNumber }}</dd></template>
                  <template v-if="node.System"><dt class="text-slate-400">系統</dt><dd>{{ node.System }}</dd></template>
                  <template v-if="node.SubSystem"><dt class="text-slate-400">子系統</dt><dd>{{ node.SubSystem }}</dd></template>
                </dl>
                <p class="mt-1 border-t border-white/15 pt-1" :class="node.CanSelect ? 'text-blue-200' : 'text-slate-400'">
                  {{ node.CanSelect ? '點選卡片以設定目前位置' : '此節點僅供顯示完整路徑' }}
                </p>
                <span
                  class="absolute border-4 border-transparent"
                  :class="[
                    node.y < 190 ? 'bottom-full border-b-slate-900' : 'top-full border-t-slate-900',
                    node.x > graph.width - 300 ? 'right-2' : 'left-2',
                  ]"
                ></span>
              </div>
            </div>
          </div>
        </div>
        <p v-else class="py-12 text-center text-slate-500">找不到相同系統與子系統的心智圖資料。</p>
      </div>
      <div class="flex shrink-0 flex-wrap items-center justify-between gap-2 border-t border-stone-200 bg-white px-6 py-3 text-xs text-slate-600">
        <div class="flex items-center gap-4" aria-label="節點圖例">
          <span class="flex items-center gap-2"><span class="h-3 w-1 rounded bg-blue-600" aria-hidden="true"></span>可選擇位置</span>
          <span class="flex items-center gap-2"><span class="h-3 w-1 rounded bg-slate-300" aria-hidden="true"></span>路徑節點</span>
        </div>
        <span v-if="graph && !loading && !errorMessage">顯示 {{ graph.nodes.length }} / {{ records.length }} 個節點</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.mind-map-canvas {
  background-image: radial-gradient(#d5d9dc 1px, transparent 1px);
  background-size: 20px 20px;
  overscroll-behavior: contain;
}
</style>
