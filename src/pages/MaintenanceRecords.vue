<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import RepairableDeviceSelect from '../components/RepairableDeviceSelect.vue'
import EmployeeSelect from '../components/EmployeeSelect.vue'
import LocationSelect from '../components/LocationSelect.vue'
import {
  getMaintTypePhrases,
  getFaultReasonPhrases,
  getActionPhrases,
  getLocations,
  getEquipmentMaintenanceRecords,
  createEquipmentMaintenanceRecord,
  updateEquipmentMaintenanceRecord,
  deleteEquipmentMaintenanceRecord,
  checkDeviceMaintenanceRecordExists,
  getEmployeeByKeyno,
  type MaintTypePhrase,
  type FaultReasonPhrase,
  type ActionPhrase,
  type EquipmentMaintenanceRecord,
  type RepairableDevice,
  type Location,
} from '../services/apiService'

// Data lists
const maintTypePhrases = ref<MaintTypePhrase[]>([])
const faultReasonPhrases = ref<FaultReasonPhrase[]>([])
const actionPhrases = ref<ActionPhrase[]>([])
const locations = ref<Location[]>([])
const equipmentRecords = ref<EquipmentMaintenanceRecord[]>([])

// Loading state
const loading = ref(false)

// 可修件搜尋：表格一開始不顯示資料，選定 RepairableDevices 項目後才顯示記錄。
const searchKeyword = ref('')
const hasSearched = ref(false)
const searchedDeviceID = ref('')
// InChargeID(員工編號) -> 中文姓名，用於表格顯示
const employeeNameMap = ref<Record<string, string>>({})

const onSearchDeviceSelected = (device: RepairableDevice) => {
  hasSearched.value = true
  searchedDeviceID.value = device.DeviceID
}

const clearSearch = () => {
  searchKeyword.value = ''
  hasSearched.value = false
  searchedDeviceID.value = ''
}

const filteredEquipmentRecords = computed(() => {
  if (!hasSearched.value) return []
  return equipmentRecords.value.filter((item) => item.DeviceId === searchedDeviceID.value)
})

// 依目前顯示的記錄，補齊尚未查過的負責人中文姓名
watch(filteredEquipmentRecords, async (records) => {
  const missingKeynos = [...new Set(records.map((r) => r.InChargeID).filter(Boolean))].filter(
    (keyno) => !(keyno in employeeNameMap.value)
  )
  if (missingKeynos.length === 0) return

  await Promise.all(
    missingKeynos.map(async (keyno) => {
      try {
        const employee = await getEmployeeByKeyno(keyno)
        employeeNameMap.value[keyno] = employee.TMNAME
      } catch (error) {
        console.error(`Failed to fetch employee ${keyno}:`, error)
        employeeNameMap.value[keyno] = keyno
      }
    })
  )
})

// Modal states
const modal = ref<{
  visible: boolean
  mode: 'create' | 'update'
  data: any
}>({
  visible: false,
  mode: 'create',
  data: {},
})

// Form data
const getLocalToday = () => {
  const now = new Date()
  const localTime = new Date(now.getTime() - now.getTimezoneOffset() * 60_000)
  return localTime.toISOString().slice(0, 10)
}

const form = ref({
  deviceID: '',
  deviceName: '',
  materialNo: '',
  serialNumber: '',
  inChargeID: '',
  maintTypeCode: '',
  maintTypeOther: '',
  maintStartDate: '',
  maintEndDate: '',
  workOrderNumber: '',
  removalDate: '',
  removalLocation: '',
  removalLocationName: '',
  installationDate: '',
  installationLocation: '',
  faultReasonCode: '',
  faultReasonOther: '',
  actionCode: [] as string[],
  actionOther: '',
  replacementParts: '',
  completionDate: '',
  remarks: '',
})

// Load data
const loadData = async () => {
  loading.value = true
  try {
    const [maint, fault, action, location, equipment] = await Promise.all([
      getMaintTypePhrases(),
      getFaultReasonPhrases(),
      getActionPhrases(),
      getLocations({ pageSize: 1000, sortBy: 'SortOrder', sortDir: 'asc' }),
      getEquipmentMaintenanceRecords(),
    ])
    maintTypePhrases.value = maint
    faultReasonPhrases.value = fault
    actionPhrases.value = action
    locations.value = location.data
    equipmentRecords.value = equipment
  } catch (error) {
    console.error('Failed to load data:', error)
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  loadData()
})

// Modal handlers
const openModal = (mode: 'create' | 'update', data?: any) => {
  modal.value.visible = true
  modal.value.mode = mode

  if (mode === 'update' && data) {
    modal.value.data = { ...data }
    populateForm(data)
  } else {
    modal.value.data = {}
    resetForm()
  }
}

const closeModal = () => {
  modal.value.visible = false
  modal.value.mode = 'create'
  modal.value.data = {}
}

const populateForm = (data: any) => {
  form.value.deviceID = data.DeviceId
  form.value.deviceName = data.DeviceName || ''
  form.value.materialNo = data.MaterialNo
  form.value.serialNumber = data.SerialNumber || ''
  form.value.inChargeID = data.InChargeID
  form.value.maintTypeCode = data.MaintTypeCode || ''
  form.value.maintTypeOther = data.MaintTypeOther || ''
  form.value.maintStartDate = data.MaintStartDate?.split('T')[0] || ''
  form.value.maintEndDate = data.MaintEndDate?.split('T')[0] || ''
  form.value.workOrderNumber = data.WorkOrderNumber || ''
  form.value.removalDate = data.RemovalDate?.split('T')[0] || ''
  form.value.removalLocation = data.RemovalLocation || ''
  form.value.removalLocationName = ''
  form.value.installationDate = data.InstallationDate?.split('T')[0] || ''
  form.value.installationLocation = data.InstallationLocation || ''
  form.value.faultReasonCode = data.FaultReasonCode || ''
  form.value.faultReasonOther = data.FaultReasonOther || ''
  form.value.actionCode = data.ActionCode ? data.ActionCode.split(',').filter(Boolean) : []
  form.value.actionOther = data.ActionOther || ''
  form.value.replacementParts = data.ReplacementParts || ''
  form.value.completionDate = data.CompletionDate?.split('T')[0] || ''
  form.value.remarks = data.Remarks || ''

}

const resetForm = () => {
  form.value.deviceID = ''
  form.value.deviceName = ''
  form.value.materialNo = ''
  form.value.serialNumber = ''
  form.value.inChargeID = ''
  form.value.maintTypeCode = ''
  form.value.maintTypeOther = ''
  form.value.maintStartDate = ''
  form.value.maintEndDate = ''
  form.value.workOrderNumber = ''
  form.value.removalDate = getLocalToday()
  form.value.removalLocation = ''
  form.value.removalLocationName = ''
  form.value.installationDate = ''
  form.value.installationLocation = ''
  form.value.faultReasonCode = ''
  form.value.faultReasonOther = ''
  form.value.actionCode = []
  form.value.actionOther = ''
  form.value.replacementParts = ''
  form.value.completionDate = ''
  form.value.remarks = ''
}

// 檢修類別選擇「其它」時才需要（也才允許）填寫其它檢修類別
const isMaintTypeOther = computed(() => {
  const selected = maintTypePhrases.value.find(
    (item) => String(item.MaintTypeID) === form.value.maintTypeCode
  )
  return !!selected && (selected.TypeName === '其它' || selected.TypeName === '其他')
})

watch(isMaintTypeOther, (isOther) => {
  if (!isOther) form.value.maintTypeOther = ''
})

// 故障原因選擇「其它」時才需要（也才允許）填寫其它故障原因
const isFaultReasonOther = computed(() => {
  const selected = faultReasonPhrases.value.find(
    (item) => String(item.ReasonID) === form.value.faultReasonCode
  )
  return !!selected && (selected.ReasonName === '其它' || selected.ReasonName === '其他')
})

watch(isFaultReasonOther, (isOther) => {
  if (!isOther) form.value.faultReasonOther = ''
})

// 檢修動作選擇「其它」時才需要（也才允許）填寫其它檢修動作
const isActionOther = computed(() => {
  return form.value.actionCode.some((code) => {
    const selected = actionPhrases.value.find((item) => String(item.ActionID) === code)
    return !!selected && (selected.ActionName === '其它' || selected.ActionName === '其他')
  })
})

watch(isActionOther, (isOther) => {
  if (!isOther) form.value.actionOther = ''
})

// 選定可修件後帶入 DeviceID、設備序號與目前位置。
const onDeviceSelected = async (device: RepairableDevice) => {
  if (modal.value.mode === 'create') {
    try {
      const exists = await checkDeviceMaintenanceRecordExists(device.DeviceID)
      if (exists) {
        alert(`可修件 ${device.DeviceName}（${device.DeviceID}）已建立過設備維修記錄`)
        resetForm()
        return
      }
    } catch (error) {
      console.error('Failed to check material existence:', error)
    }
  }

  form.value.deviceID = device.DeviceID
  form.value.deviceName = device.DeviceName
  form.value.materialNo = device.MaterialNo || ''
  form.value.serialNumber = device.SerialNumber || ''
  form.value.removalLocation = device.CurrentLocationDeviceID || ''
  form.value.removalLocationName = device.CurrentLocationDeviceName || ''
}

// 必填欄位檢查
const validateRequiredFields = () => {
  const missing: string[] = []
  if (!form.value.deviceID) missing.push('可修件名稱')
  if (!form.value.inChargeID) missing.push('維修負責人')
  if (!form.value.workOrderNumber) missing.push('工單號碼')
  if (!form.value.maintTypeCode) missing.push('檢修類別')
  if (!form.value.removalLocation) missing.push('拆下位置')
  if (!form.value.faultReasonCode) missing.push('故障原因')
  if (form.value.actionCode.length === 0) missing.push('檢修動作')

  if (missing.length > 0) {
    alert(`請填寫必填欄位：${missing.join('、')}`)
    return false
    
  }
  return true
}

// CRUD handlers
const handleSave = async () => {
  if (!validateRequiredFields()) return

  try {
    const data = {
      DeviceId: form.value.deviceID,
      InChargeID: form.value.inChargeID,
      MaintTypeCode: form.value.maintTypeCode || null,
      MaintTypeOther: form.value.maintTypeOther || null,
      MaintStartDate: form.value.maintStartDate || null,
      MaintEndDate: form.value.maintEndDate || null,
      WorkOrderNumber: form.value.workOrderNumber || null,
      RemovalDate: form.value.removalDate || null,
      RemovalLocation: form.value.removalLocation || null,
      InstallationDate: form.value.installationDate || null,
      InstallationLocation: form.value.installationLocation || null,
      FaultReasonCode: form.value.faultReasonCode || null,
      FaultReasonOther: form.value.faultReasonOther || null,
      ActionCode: form.value.actionCode.length > 0 ? form.value.actionCode.join(',') : null,
      ActionOther: form.value.actionOther || null,
      ReplacementParts: form.value.replacementParts || null,
      CompletionDate: form.value.completionDate || null,
      Remarks: form.value.remarks || null,
    }
    if (modal.value.mode === 'create') {
      await createEquipmentMaintenanceRecord(data)
    } else {
      await updateEquipmentMaintenanceRecord(modal.value.data.DeviceId, data)
    }
    closeModal()
    loadData()
  } catch (error) {
    console.error('Save error:', error)
    alert(`儲存失敗: ${(error as Error).message}`)
  }
}

// 完工彈窗：顯示可修件編號/名稱，並讓使用者填寫完工時才需要的資料
const completeModal = ref<{
  visible: boolean
  record: EquipmentMaintenanceRecord | null
  deviceName: string
  form: {
    maintEndDate: string
    installationDate: string
    installationLocation: string
    replacementParts: string
    completionDate: string
    remarks: string
  }
}>({
  visible: false,
  record: null,
  deviceName: '',
  form: {
    maintEndDate: '',
    installationDate: '',
    installationLocation: '',
    replacementParts: '',
    completionDate: '',
    remarks: '',
  },
})

const openCompleteModal = (record: EquipmentMaintenanceRecord, deviceName: string) => {
  completeModal.value.visible = true
  completeModal.value.record = record
  completeModal.value.deviceName = deviceName
  completeModal.value.form = {
    maintEndDate: record.MaintEndDate?.split('T')[0] || '',
    installationDate: record.InstallationDate?.split('T')[0] || '',
    installationLocation: record.InstallationLocation || '',
    replacementParts: record.ReplacementParts || '',
    completionDate: new Date().toISOString().split('T')[0],
    remarks: record.Remarks || '',
  }
}

const closeCompleteModal = () => {
  completeModal.value.visible = false
  completeModal.value.record = null
}

const handleCompleteSave = async () => {
  const record = completeModal.value.record
  if (!record) return

  if (!completeModal.value.form.completionDate) {
    alert('請填寫完成日期')
    return
  }

  try {
    const data = {
      InChargeID: record.InChargeID,
      MaintTypeCode: record.MaintTypeCode,
      MaintTypeOther: record.MaintTypeOther,
      MaintStartDate: record.MaintStartDate?.split('T')[0] || null,
      MaintEndDate: completeModal.value.form.maintEndDate || null,
      WorkOrderNumber: record.WorkOrderNumber,
      RemovalDate: record.RemovalDate?.split('T')[0] || null,
      RemovalLocation: record.RemovalLocation,
      InstallationDate: completeModal.value.form.installationDate || null,
      InstallationLocation: completeModal.value.form.installationLocation || null,
      FaultReasonCode: record.FaultReasonCode,
      FaultReasonOther: record.FaultReasonOther,
      ActionCode: record.ActionCode,
      ActionOther: record.ActionOther,
      ReplacementParts: completeModal.value.form.replacementParts || null,
      CompletionDate: completeModal.value.form.completionDate,
      Remarks: completeModal.value.form.remarks || null,
    }
    await updateEquipmentMaintenanceRecord(record.DeviceId, data)
    closeCompleteModal()
    loadData()
  } catch (error) {
    console.error('Complete error:', error)
    alert(`標記完工失敗: ${(error as Error).message}`)
  }
}

const handleDelete = async (record: EquipmentMaintenanceRecord) => {
  if (!confirm(`確定要刪除這筆資料嗎？`)) return

  try {
    await deleteEquipmentMaintenanceRecord(record.DeviceId)
    loadData()
  } catch (error) {
    console.error('Delete error:', error)
    alert(`刪除失敗: ${(error as Error).message}`)
  }
}

// Helper to get equipment row key
const getEquipmentIdKey = (record: EquipmentMaintenanceRecord) =>
  record.DeviceId

// 依 DeviceId 分組，裝置資訊由 RepairableDevices JOIN 後的欄位顯示。
const groupedRecords = computed(() => {
  const groups: { deviceID: string; deviceName: string; serialNumber: string; purchaseDate: string; records: EquipmentMaintenanceRecord[] }[] = []
  const indexByKey = new Map<string, number>()

  for (const item of filteredEquipmentRecords.value) {
    const key = item.DeviceId
    if (!indexByKey.has(key)) {
      indexByKey.set(key, groups.length)
      groups.push({
        deviceID: item.DeviceId,
        deviceName: item.DeviceName || '',
        serialNumber: item.SerialNumber || '',
        purchaseDate: item.PurchaseDate?.split('T')[0] || '',
        records: [],
      })
    }
    groups[indexByKey.get(key)!].records.push(item)
  }

  return groups
})

// 檢修動作可複選，ActionCode 以逗號分隔存放，故列表需自行查名稱組合顯示（後端 JOIN 僅能比對單一代碼）
const getActionNames = (record: EquipmentMaintenanceRecord) => {
  if (!record.ActionCode) return '-'
  const names = record.ActionCode
    .split(',')
    .map((code) => actionPhrases.value.find((item) => String(item.ActionID) === code)?.ActionName || code)
  return names.length > 0 ? names.join('、') : '-'
}

// 拆除/安裝地點欄位存的是 LocationCode，列表顯示時查回「代碼 - 名稱」；查無對應地點（如舊資料仍存名稱）則原樣顯示
const getLocationLabel = (code: string | null) => {
  if (!code) return '-'
  const match = locations.value.find((item) => item.LocationCode === code)
  return match ? `${match.LocationCode} - ${match.LocationName}` : code
}
</script>

<template>
  <div class="max-w-full mx-auto">
    <h2 class="text-xl font-bold text-slate-900">維修記錄維護</h2>
    <p class="mt-1 mb-5 text-sm text-slate-500">依可修件查詢檢修歷程，管理故障原因、處理方式與完工資訊。</p>

    <div class="bg-white rounded-xl border border-slate-200 shadow-sm">
      <div class="p-4 border-b border-slate-200 flex flex-wrap justify-between items-center gap-3 bg-slate-50/50 rounded-t-xl">
        <p class="text-sm text-slate-600">
          <template v-if="hasSearched">
            共 <span class="font-semibold text-blue-600">{{ filteredEquipmentRecords.length }} 筆資料</span>
            <span class="text-slate-400">（已依「{{ searchKeyword }}」篩選）</span>
          </template>
          <template v-else>請搜尋以顯示資料</template>
        </p>
        <div class="flex w-full sm:w-auto flex-wrap items-center gap-2">
          <div class="w-full sm:w-64">
            <RepairableDeviceSelect
              v-model="searchKeyword"
              placeholder="輸入可修件名稱搜尋"
              @select="onSearchDeviceSelected"
            />
          </div>
          <button
            v-if="hasSearched"
            @click="clearSearch"
            class="px-3 py-2 text-slate-500 hover:text-slate-700 text-sm font-medium rounded-lg transition-colors"
          >
            清除
          </button>
          <button
            @click="openModal('create')"
            class="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors flex items-center gap-2 shadow-sm"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
            </svg>
            新增維修記錄
          </button>
        </div>
      </div>

      <div v-if="loading" class="p-8 text-center rounded-b-xl overflow-hidden">
        <p class="text-slate-500 animate-pulse">載入中...</p>
      </div>

      <div v-else-if="!hasSearched" class="p-8 text-center rounded-b-xl overflow-hidden">
        <div class="mx-auto max-w-sm py-8">
          <svg class="mx-auto mb-4 h-10 w-10 text-slate-400" aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.3"><circle cx="10" cy="10" r="6" /><path d="m15 15 6 6" /></svg>
          <p class="font-semibold text-slate-700">先選擇要查詢的可修件</p>
          <p class="mt-2 text-sm leading-7 text-slate-500">在上方輸入可修件名稱，再從下拉清單選取，即可查看維修記錄。</p>
          <p class="mt-3 text-xs text-slate-500">需要登錄新資料？點選「新增維修記錄」。</p>
        </div>
      </div>

      <div v-else-if="filteredEquipmentRecords.length === 0" class="p-8 text-center rounded-b-xl overflow-hidden">
        <p class="text-slate-500">找不到符合「{{ searchKeyword }}」的資料</p>
      </div>

      <div v-else class="overflow-auto h-[70vh] p-4 space-y-4 rounded-b-xl">
        <div
          v-for="group in groupedRecords"
          :key="group.deviceID"
          class="border border-slate-200 rounded-lg overflow-hidden"
        >
          <!-- 表頭：可修件編號 / 可修件名稱 / 設備序號 / 購買日期 -->
          <div class="bg-slate-100 px-4 py-2.5 flex flex-wrap gap-x-8 gap-y-1 text-sm">
            <div><span class="font-semibold text-slate-600">可修件編號：</span><span class="text-slate-900">{{ group.deviceID }}</span></div>
            <div><span class="font-semibold text-slate-600">可修件名稱：</span><span class="text-slate-900">{{ group.deviceName || '-' }}</span></div>
            <div><span class="font-semibold text-slate-600">設備序號：</span><span class="text-slate-900">{{ group.serialNumber || '-' }}</span></div>
            <div><span class="font-semibold text-slate-600">購買日期：</span><span class="text-slate-900">{{ group.purchaseDate || '-' }}</span></div>
          </div>

          <!-- 表身：同一設備下的各筆維修記錄 -->
          <div class="overflow-x-auto">
            <table class="w-max min-w-full divide-y divide-slate-200">
              <thead class="bg-slate-50">
                <tr>
                  <th class="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider sticky left-0 z-20 bg-slate-50 w-24">完工</th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">負責人</th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">檢修類別</th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">其它檢修類別</th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">檢修開始日期</th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">檢修結束日期</th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">工單號碼</th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">拆除日期</th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">拆除位置</th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">安裝日期</th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">安裝位置</th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">故障原因</th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">其它故障原因</th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">處理方式</th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">其它處理方式</th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">更換零件</th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">完成日期</th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">備註</th>
                  <th class="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider sticky right-0 z-20 bg-slate-50">操作</th>
                </tr>
              </thead>
              <tbody class="bg-white divide-y divide-slate-200">
                <tr v-for="(item, index) in group.records" :key="getEquipmentIdKey(item)" class="group hover:bg-slate-50">
                  <td class="px-6 py-4 whitespace-nowrap text-sm sticky left-0 z-10 bg-white group-hover:bg-slate-50 w-24">
                    <button
                      v-if="!item.CompletionDate"
                      @click="openCompleteModal(item, group.deviceName)"
                      class="px-2 py-1 text-xs font-medium rounded-md bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 transition-colors"
                    >
                      完工
                    </button>
                    <span v-else class="text-xs text-slate-400">已完工</span>
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap text-sm text-slate-500">{{ employeeNameMap[item.InChargeID] || item.InChargeID }}</td>
                  <td class="px-6 py-4 whitespace-nowrap text-sm text-slate-500">{{ item.MaintTypeName || '-' }}</td>
                  <td class="px-6 py-4 whitespace-nowrap text-sm text-slate-500">{{ item.MaintTypeOther || '-' }}</td>
                  <td class="px-6 py-4 whitespace-nowrap text-sm text-slate-500">{{ item.MaintStartDate?.split('T')[0] || '-' }}</td>
                  <td class="px-6 py-4 whitespace-nowrap text-sm text-slate-500">{{ item.MaintEndDate?.split('T')[0] || '-' }}</td>
                  <td class="px-6 py-4 whitespace-nowrap text-sm text-slate-500">{{ item.WorkOrderNumber || '-' }}</td>
                  <td class="px-6 py-4 whitespace-nowrap text-sm text-slate-500">{{ item.RemovalDate?.split('T')[0] || '-' }}</td>
                  <td class="px-6 py-4 whitespace-nowrap text-sm text-slate-500">{{ getLocationLabel(item.RemovalLocation) }}</td>
                  <td class="px-6 py-4 whitespace-nowrap text-sm text-slate-500">{{ item.InstallationDate?.split('T')[0] || '-' }}</td>
                  <td class="px-6 py-4 whitespace-nowrap text-sm text-slate-500">{{ getLocationLabel(item.InstallationLocation) }}</td>
                  <td class="px-6 py-4 whitespace-nowrap text-sm text-slate-500">{{ item.FaultReasonName || '-' }}</td>
                  <td class="px-6 py-4 whitespace-nowrap text-sm text-slate-500">{{ item.FaultReasonOther || '-' }}</td>
                  <td class="px-6 py-4 whitespace-nowrap text-sm text-slate-500">{{ getActionNames(item) }}</td>
                  <td class="px-6 py-4 whitespace-nowrap text-sm text-slate-500">{{ item.ActionOther || '-' }}</td>
                  <td class="px-6 py-4 whitespace-nowrap text-sm text-slate-500 max-w-xs truncate" :title="item.ReplacementParts || ''">{{ item.ReplacementParts || '-' }}</td>
                  <td class="px-6 py-4 whitespace-nowrap text-sm text-slate-500">{{ item.CompletionDate?.split('T')[0] || '-' }}</td>
                  <td class="px-6 py-4 whitespace-nowrap text-sm text-slate-500 max-w-xs truncate" :title="item.Remarks || ''">{{ item.Remarks || '-' }}</td>
                  <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium sticky right-0 z-10 bg-white group-hover:bg-slate-50 flex justify-end gap-3">
                    <template v-if="!item.CompletionDate && index === group.records.length - 1">
                      <button @click="openModal('update', item)" class="text-blue-600 hover:text-blue-900">編輯</button>
                      <button @click="handleDelete(item)" class="text-red-600 hover:text-red-900">刪除</button>
                    </template>
                    <span v-else class="text-slate-400">-</span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>

    <div
      v-if="modal.visible"
      class="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4 bg-slate-900 bg-opacity-50"
      role="dialog"
      aria-modal="true"
    >
      <div class="fixed inset-0" @click="closeModal"></div>

      <div class="bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all w-full sm:max-w-2xl z-10 max-h-[90vh] flex flex-col">
        <div class="bg-white px-6 py-4 border-b border-slate-200">
          <h3 class="text-lg font-medium text-slate-900" id="modal-title">
            {{ modal.mode === 'create' ? '新增' : '編輯' }} - 設備維修記錄
          </h3>
        </div>

        <div class="bg-white px-6 py-4 overflow-y-auto flex-1 space-y-4 max-h-[65vh]">
          <div class="space-y-4">
            <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label class="block text-sm font-medium text-slate-700">可修件名稱 <span class="text-red-500">*</span></label>
                <RepairableDeviceSelect
                  v-model="form.deviceName"
                  placeholder="輸入可修件名稱搜尋"
                  :disabled="modal.mode === 'update'"
                  @select="onDeviceSelected"
                />
              </div>
              <div>
                <label class="block text-sm font-medium text-slate-700">可修件編號</label>
                <input
                  v-model="form.deviceID"
                  type="text"
                  readonly
                  class="mt-1 block w-full rounded-md border-slate-300 shadow-sm bg-slate-50 text-slate-500 cursor-not-allowed sm:text-sm p-2 border"
                  placeholder="選擇可修件後自動帶入"
                />
              </div>
              <div>
                <label class="block text-sm font-medium text-slate-700">設備序號</label>
                <input
                  v-model="form.serialNumber"
                  type="text"
                  readonly
                  class="mt-1 block w-full rounded-md border-slate-300 shadow-sm bg-slate-50 text-slate-500 cursor-not-allowed sm:text-sm p-2 border"
                  placeholder="選擇可修件後自動帶入"
                />
              </div>
            </div>

            <div v-if="modal.mode !== 'create'" class="border-t border-slate-200 pt-4">
              <h4 class="text-sm font-semibold text-slate-900 mb-3">基本資訊</h4>
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label class="block text-sm font-medium text-slate-700">檢修負責人</label>
                  <EmployeeSelect
                    v-model="form.inChargeID"
                    placeholder="輸入姓名或員工編號搜尋"
                  />
                </div>
              </div>
            </div>

            <div class="border-t border-slate-200 pt-4">
              <h4 class="text-sm font-semibold text-slate-900 mb-3">維修資訊</h4>
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div v-if="modal.mode === 'create'">
                  <label class="block text-sm font-medium text-slate-700">拆下日期</label>
                  <input
                    v-model="form.removalDate"
                    type="date"
                    class="mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 border"
                  />
                </div>
                <div v-if="modal.mode === 'create'">
                  <label class="block text-sm font-medium text-slate-700">拆下位置 <span class="text-red-500">*</span></label>
                  <input
                    :value="form.removalLocationName
                      ? `${form.removalLocationName}（${form.removalLocation}）`
                      : form.removalLocation"
                    type="text"
                    readonly
                    placeholder="選擇可修件後自動帶入目前位置"
                    class="mt-1 block w-full cursor-not-allowed rounded-md border border-slate-300 bg-slate-50 p-2 text-sm text-slate-500 shadow-sm"
                  />
                </div>
                <div>
                  <label class="block text-sm font-medium text-slate-700">工單號碼 <span class="text-red-500">*</span></label>
                  <input
                    v-model="form.workOrderNumber"
                    type="text"
                    class="mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 border"
                  />
                </div>
                <div v-if="modal.mode === 'create'">
                  <label class="block text-sm font-medium text-slate-700">維修負責人 <span class="text-red-500">*</span></label>
                  <EmployeeSelect
                    v-model="form.inChargeID"
                    placeholder="輸入姓名或員工編號搜尋"
                  />
                </div>
                <div>
                  <label class="block text-sm font-medium text-slate-700">檢修類別 <span class="text-red-500">*</span></label>
                  <select
                    v-model="form.maintTypeCode"
                    class="mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 border"
                  >
                    <option value="">請選擇檢修類別</option>
                    <option
                      v-for="item in maintTypePhrases"
                      :key="item.MaintTypeID"
                      :value="String(item.MaintTypeID)"
                    >
                      {{ item.TypeName }}{{ item.IsActive === false ? '（已停用）' : '' }}
                    </option>
                  </select>
                </div>
                <div>
                  <label class="block text-sm font-medium text-slate-700">其它檢修類別</label>
                  <input
                    v-model="form.maintTypeOther"
                    type="text"
                    :disabled="!isMaintTypeOther"
                    :placeholder="isMaintTypeOther ? '' : '檢修類別選擇「其它」時才可填寫'"
                    class="mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 border disabled:bg-slate-50 disabled:text-slate-400 disabled:cursor-not-allowed"
                  />
                </div>
                <div v-if="modal.mode !== 'create'">
                  <label class="block text-sm font-medium text-slate-700">檢修日期</label>
                  <input
                    v-model="form.maintStartDate"
                    type="date"
                    class="mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 border"
                  />
                </div>
                <div v-if="modal.mode !== 'create'">
                  <label class="block text-sm font-medium text-slate-700">維修結束日期</label>
                  <input
                    v-model="form.maintEndDate"
                    type="date"
                    class="mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 border"
                  />
                </div>
                <div v-if="modal.mode === 'create'">
                  <label class="block text-sm font-medium text-slate-700">故障原因 <span class="text-red-500">*</span></label>
                  <select
                    v-model="form.faultReasonCode"
                    class="mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 border"
                  >
                    <option value="">請選擇故障原因</option>
                    <option
                      v-for="item in faultReasonPhrases"
                      :key="item.ReasonID"
                      :value="String(item.ReasonID)"
                    >
                      {{ item.ReasonName }}{{ item.IsActive === false ? '（已停用）' : '' }}
                    </option>
                  </select>
                </div>
                <div v-if="modal.mode === 'create'">
                  <label class="block text-sm font-medium text-slate-700">其它故障原因</label>
                  <input
                    v-model="form.faultReasonOther"
                    type="text"
                    :disabled="!isFaultReasonOther"
                    :placeholder="isFaultReasonOther ? '' : '故障原因選擇「其它」時才可填寫'"
                    class="mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 border disabled:bg-slate-50 disabled:text-slate-400 disabled:cursor-not-allowed"
                  />
                </div>
                <div v-if="modal.mode === 'create'">
                  <label class="block text-sm font-medium text-slate-700">檢修動作 <span class="text-red-500">*</span>（可複選）</label>
                  <div class="mt-1 block w-full rounded-md border-slate-300 shadow-sm sm:text-sm border max-h-40 overflow-y-auto p-2 space-y-1">
                    <label
                      v-for="item in actionPhrases"
                      :key="item.ActionID"
                      class="flex items-center gap-2 text-sm text-slate-700 cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        :value="String(item.ActionID)"
                        v-model="form.actionCode"
                        class="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                      />
                      {{ item.ActionName }}{{ item.IsActive === false ? '（已停用）' : '' }}
                    </label>
                  </div>
                </div>
                <div v-if="modal.mode === 'create'">
                  <label class="block text-sm font-medium text-slate-700">其它檢修動作</label>
                  <input
                    v-model="form.actionOther"
                    type="text"
                    :disabled="!isActionOther"
                    :placeholder="isActionOther ? '' : '檢修動作選擇「其它」時才可填寫'"
                    class="mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 border disabled:bg-slate-50 disabled:text-slate-400 disabled:cursor-not-allowed"
                  />
                </div>
              </div>
            </div>

            <div v-if="modal.mode !== 'create'" class="border-t border-slate-200 pt-4">
              <h4 class="text-sm font-semibold text-slate-900 mb-3">安裝/拆除</h4>
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label class="block text-sm font-medium text-slate-700">拆除日期</label>
                  <input
                    v-model="form.removalDate"
                    type="date"
                    class="mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 border"
                  />
                </div>
                <div>
                  <label class="block text-sm font-medium text-slate-700">拆除地點</label>
                  <LocationSelect
                    v-model="form.removalLocation"
                    :locations="locations"
                    placeholder="輸入地點代碼或地點名稱搜尋"
                  />
                </div>
                <div>
                  <label class="block text-sm font-medium text-slate-700">安裝日期</label>
                  <input
                    v-model="form.installationDate"
                    type="date"
                    class="mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 border"
                  />
                </div>
                <div>
                  <label class="block text-sm font-medium text-slate-700">安裝地點</label>
                  <LocationSelect
                    v-model="form.installationLocation"
                    :locations="locations"
                    placeholder="輸入地點代碼或地點名稱搜尋"
                  />
                </div>
              </div>
            </div>

            <div v-if="modal.mode !== 'create'" class="border-t border-slate-200 pt-4">
              <h4 class="text-sm font-semibold text-slate-900 mb-3">故障與處理</h4>
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label class="block text-sm font-medium text-slate-700">故障原因代碼</label>
                  <input
                    v-model="form.faultReasonCode"
                    type="text"
                    class="mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 border"
                    placeholder="對應 FaultReasonPhrases.ReasonID"
                  />
                </div>
                <div>
                  <label class="block text-sm font-medium text-slate-700">其他故障原因</label>
                  <input
                    v-model="form.faultReasonOther"
                    type="text"
                    class="mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 border"
                  />
                </div>
                <div>
                  <label class="block text-sm font-medium text-slate-700">處理方式（可複選）</label>
                  <div class="mt-1 block w-full rounded-md border-slate-300 shadow-sm sm:text-sm border max-h-40 overflow-y-auto p-2 space-y-1">
                    <label
                      v-for="item in actionPhrases"
                      :key="item.ActionID"
                      class="flex items-center gap-2 text-sm text-slate-700 cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        :value="String(item.ActionID)"
                        v-model="form.actionCode"
                        class="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                      />
                      {{ item.ActionName }}{{ item.IsActive === false ? '（已停用）' : '' }}
                    </label>
                  </div>
                </div>
                <div>
                  <label class="block text-sm font-medium text-slate-700">其他處理方式</label>
                  <input
                    v-model="form.actionOther"
                    type="text"
                    class="mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 border"
                  />
                </div>
              </div>
            </div>

            <div class="border-t border-slate-200 pt-4 grid grid-cols-1 gap-4">
              <div>
                <label class="block text-sm font-medium text-slate-700">更換零件</label>
                <textarea
                  v-model="form.replacementParts"
                  rows="2"
                  class="mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 border"
                ></textarea>
              </div>
              <div v-if="modal.mode !== 'create'">
                <label class="block text-sm font-medium text-slate-700">完成日期</label>
                <input
                  v-model="form.completionDate"
                  type="date"
                  class="mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 border"
                />
              </div>
              <div>
                <label class="block text-sm font-medium text-slate-700">備註</label>
                <textarea
                  v-model="form.remarks"
                  rows="2"
                  class="mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 border"
                ></textarea>
              </div>
            </div>
          </div>
        </div>

        <div class="bg-slate-50 px-6 py-3 border-t border-slate-200 flex justify-end gap-3">
          <button
            type="button"
            @click="closeModal"
            class="inline-flex justify-center rounded-md border border-slate-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-slate-700 hover:bg-slate-50 sm:text-sm transition-colors"
          >
            取消
          </button>
          <button
            type="button"
            @click="handleSave"
            class="inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 sm:text-sm transition-colors"
          >
            儲存
          </button>
        </div>
      </div>
    </div>

    <div
      v-if="completeModal.visible"
      class="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4 bg-slate-900 bg-opacity-50"
      role="dialog"
      aria-modal="true"
    >
      <div class="fixed inset-0" @click="closeCompleteModal"></div>

      <div class="bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all w-full sm:max-w-lg z-10 max-h-[90vh] flex flex-col">
        <div class="bg-white px-6 py-4 border-b border-slate-200">
          <h3 class="text-lg font-medium text-slate-900">標記完工</h3>
        </div>

        <div class="bg-white px-6 py-4 overflow-y-auto flex-1 space-y-4 max-h-[65vh]">
          <div class="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span class="font-semibold text-slate-600">可修件編號：</span>
              <span class="text-slate-900">{{ completeModal.record?.DeviceId }}</span>
            </div>
            <div>
              <span class="font-semibold text-slate-600">可修件名稱：</span>
              <span class="text-slate-900">{{ completeModal.deviceName || '-' }}</span>
            </div>
          </div>

          <div class="border-t border-slate-200 pt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-medium text-slate-700">檢修結束日期</label>
              <input
                v-model="completeModal.form.maintEndDate"
                type="date"
                class="mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 border"
              />
            </div>
            <div>
              <label class="block text-sm font-medium text-slate-700">安裝日期</label>
              <input
                v-model="completeModal.form.installationDate"
                type="date"
                class="mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 border"
              />
            </div>
            <div>
              <label class="block text-sm font-medium text-slate-700">安裝位置</label>
              <LocationSelect
                v-model="completeModal.form.installationLocation"
                :locations="locations"
                placeholder="輸入地點代碼或地點名稱搜尋"
              />
            </div>
            <div>
              <label class="block text-sm font-medium text-slate-700">完成日期 <span class="text-red-500">*</span></label>
              <input
                v-model="completeModal.form.completionDate"
                type="date"
                required
                class="mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 border"
              />
            </div>
            <div class="sm:col-span-2">
              <label class="block text-sm font-medium text-slate-700">更換零件</label>
              <textarea
                v-model="completeModal.form.replacementParts"
                rows="2"
                class="mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 border"
              ></textarea>
            </div>
            <div class="sm:col-span-2">
              <label class="block text-sm font-medium text-slate-700">備註</label>
              <textarea
                v-model="completeModal.form.remarks"
                rows="2"
                class="mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 border"
              ></textarea>
            </div>
          </div>
        </div>

        <div class="bg-slate-50 px-6 py-3 border-t border-slate-200 flex justify-end gap-3">
          <button
            type="button"
            @click="closeCompleteModal"
            class="inline-flex justify-center rounded-md border border-slate-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-slate-700 hover:bg-slate-50 sm:text-sm transition-colors"
          >
            取消
          </button>
          <button
            type="button"
            @click="handleCompleteSave"
            class="inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-emerald-600 text-base font-medium text-white hover:bg-emerald-700 sm:text-sm transition-colors"
          >
            確認完工
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
