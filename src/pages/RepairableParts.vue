<script setup lang="ts">
import { ref, onMounted } from 'vue'
import {
  getActionPhrases,
  getFaultReasonPhrases,
  getMaintTypePhrases,
  getEquipmentMaintenanceRecords,
  createActionPhrase,
  createFaultReasonPhrase,
  createMaintTypePhrase,
  createEquipmentMaintenanceRecord,
  updateActionPhrase,
  updateFaultReasonPhrase,
  updateMaintTypePhrase,
  updateEquipmentMaintenanceRecord,
  deleteActionPhrase,
  deleteFaultReasonPhrase,
  deleteMaintTypePhrase,
  deleteEquipmentMaintenanceRecord,
  type ActionPhrase,
  type FaultReasonPhrase,
  type MaintTypePhrase,
  type EquipmentMaintenanceRecord,
} from '../services/apiService'

const activeTab = ref<'maint-type' | 'fault-reason' | 'action' | 'equipment'>('equipment')

// Data lists
const maintTypePhrases = ref<MaintTypePhrase[]>([])
const faultReasonPhrases = ref<FaultReasonPhrase[]>([])
const actionPhrases = ref<ActionPhrase[]>([])
const equipmentRecords = ref<EquipmentMaintenanceRecord[]>([])

// Loading states
const loading = {
  'maint-type': false,
  'fault-reason': false,
  'action': false,
  'equipment': false,
}

// Modal states
const modal = {
  visible: false,
  type: '' as 'maint-type' | 'fault-reason' | 'action' | 'equipment' | '',
  mode: 'create' as 'create' | 'update',
  data: {} as any,
}

// Form data
const form = ref({
  // For maintain type
  maintTypeName: '',
  maintTypeSortOrder: '',
  maintTypeIsActive: true,

  // For fault reason
  faultReasonName: '',
  faultReasonSortOrder: '',
  faultReasonIsActive: true,

  // For action
  actionName: '',
  actionSortOrder: '',
  actionIsActive: true,

  // For equipment
  materialNo: '',
  serialNumber: '',
  id: '',
  systemCode: '',
  inChargeID: '',
  purchaseDate: '',
  maintTypeCode: '',
  maintTypeYear: '',
  maintTypeOther: '',
  maintStartDate: '',
  maintEndDate: '',
  workOrderNumber: '',
  removalDate: '',
  removalLocation: '',
  installationDate: '',
  installationLocation: '',
  faultReasonCode: '',
  faultReasonOther: '',
  actionCode: '',
  actionOther: '',
  replacementParts: '',
  completionDate: '',
  remarks: '',
})

// Load data
const loadData = async () => {
  loading['maint-type'] = true
  loading['fault-reason'] = true
  loading['action'] = true
  loading['equipment'] = true

  try {
    const [maint, fault, action, equipment] = await Promise.all([
      getMaintTypePhrases(),
      getFaultReasonPhrases(),
      getActionPhrases(),
      getEquipmentMaintenanceRecords(),
    ])
    maintTypePhrases.value = maint
    faultReasonPhrases.value = fault
    actionPhrases.value = action
    equipmentRecords.value = equipment
  } catch (error) {
    console.error('Failed to load data:', error)
  } finally {
    loading['maint-type'] = false
    loading['fault-reason'] = false
    loading['action'] = false
    loading['equipment'] = false
  }
}

onMounted(() => {
  loadData()
})

// Modal handlers
const openModal = (
  type: 'maint-type' | 'fault-reason' | 'action' | 'equipment',
  mode: 'create' | 'update',
  data?: any
) => {
  modal.visible = true
  modal.type = type
  modal.mode = mode

  if (mode === 'update' && data) {
    modal.data = { ...data }
    populateForm(type, data)
  } else {
    resetForm(type)
  }
}

const closeModal = () => {
  modal.visible = false
  modal.type = ''
  modal.mode = 'create'
}

const populateForm = (type: string, data: any) => {
  if (type === 'maint-type') {
    form.value.maintTypeName = data.TypeName
    form.value.maintTypeSortOrder = String(data.SortOrder ?? '')
    form.value.maintTypeIsActive = data.IsActive ?? true
  } else if (type === 'fault-reason') {
    form.value.faultReasonName = data.ReasonName
    form.value.faultReasonSortOrder = String(data.SortOrder ?? '')
    form.value.faultReasonIsActive = data.IsActive ?? true
  } else if (type === 'action') {
    form.value.actionName = data.ActionName
    form.value.actionSortOrder = String(data.SortOrder ?? '')
    form.value.actionIsActive = data.IsActive ?? true
  } else if (type === 'equipment') {
    form.value.materialNo = data.MaterialNo
    form.value.serialNumber = data.SerialNumber
    form.value.id = String(data.Id)
    form.value.systemCode = data.SystemCode
    form.value.inChargeID = data.InChargeID
    form.value.purchaseDate = data.PurchaseDate?.split('T')[0] || ''
    form.value.maintTypeCode = data.MaintTypeCode || ''
    form.value.maintTypeYear = data.MaintTypeYear || ''
    form.value.maintTypeOther = data.MaintTypeOther || ''
    form.value.maintStartDate = data.MaintStartDate?.split('T')[0] || ''
    form.value.maintEndDate = data.MaintEndDate?.split('T')[0] || ''
    form.value.workOrderNumber = data.WorkOrderNumber || ''
    form.value.removalDate = data.RemovalDate?.split('T')[0] || ''
    form.value.removalLocation = data.RemovalLocation || ''
    form.value.installationDate = data.InstallationDate?.split('T')[0] || ''
    form.value.installationLocation = data.InstallationLocation || ''
    form.value.faultReasonCode = data.FaultReasonCode || ''
    form.value.faultReasonOther = data.FaultReasonOther || ''
    form.value.actionCode = data.ActionCode || ''
    form.value.actionOther = data.ActionOther || ''
    form.value.replacementParts = data.ReplacementParts || ''
    form.value.completionDate = data.CompletionDate?.split('T')[0] || ''
    form.value.remarks = data.Remarks || ''
  }
}

const resetForm = (type: string) => {
  if (type === 'maint-type') {
    form.value.maintTypeName = ''
    form.value.maintTypeSortOrder = ''
    form.value.maintTypeIsActive = true
  } else if (type === 'fault-reason') {
    form.value.faultReasonName = ''
    form.value.faultReasonSortOrder = ''
    form.value.faultReasonIsActive = true
  } else if (type === 'action') {
    form.value.actionName = ''
    form.value.actionSortOrder = ''
    form.value.actionIsActive = true
  } else if (type === 'equipment') {
    form.value.materialNo = ''
    form.value.serialNumber = ''
    form.value.id = ''
    form.value.systemCode = ''
    form.value.inChargeID = ''
    form.value.purchaseDate = ''
    form.value.maintTypeCode = ''
    form.value.maintTypeYear = ''
    form.value.maintTypeOther = ''
    form.value.maintStartDate = ''
    form.value.maintEndDate = ''
    form.value.workOrderNumber = ''
    form.value.removalDate = ''
    form.value.removalLocation = ''
    form.value.installationDate = ''
    form.value.installationLocation = ''
    form.value.faultReasonCode = ''
    form.value.faultReasonOther = ''
    form.value.actionCode = ''
    form.value.actionOther = ''
    form.value.replacementParts = ''
    form.value.completionDate = ''
    form.value.remarks = ''
  }
}

// CRUD handlers
const handleSave = async () => {
  try {
    if (modal.type === 'maint-type') {
      const data = {
        TypeName: form.value.maintTypeName,
        SortOrder: form.value.maintTypeSortOrder ? Number(form.value.maintTypeSortOrder) : null,
        IsActive: form.value.maintTypeIsActive,
      }
      if (modal.mode === 'create') {
        await createMaintTypePhrase(data)
      } else {
        await updateMaintTypePhrase(modal.data.MaintTypeID, data)
      }
    } else if (modal.type === 'fault-reason') {
      const data = {
        ReasonName: form.value.faultReasonName,
        SortOrder: form.value.faultReasonSortOrder ? Number(form.value.faultReasonSortOrder) : null,
        IsActive: form.value.faultReasonIsActive,
      }
      if (modal.mode === 'create') {
        await createFaultReasonPhrase(data)
      } else {
        await updateFaultReasonPhrase(modal.data.ReasonID, data)
      }
    } else if (modal.type === 'action') {
      const data = {
        ActionName: form.value.actionName,
        SortOrder: form.value.actionSortOrder ? Number(form.value.actionSortOrder) : null,
        IsActive: form.value.actionIsActive,
      }
      if (modal.mode === 'create') {
        await createActionPhrase(data)
      } else {
        await updateActionPhrase(modal.data.ActionID, data)
      }
    } else if (modal.type === 'equipment') {
      const data = {
        MaterialNo: form.value.materialNo,
        SerialNumber: form.value.serialNumber,
        Id: form.value.id ? Number(form.value.id) : 0,
        SystemCode: form.value.systemCode,
        InChargeID: form.value.inChargeID,
        PurchaseDate: form.value.purchaseDate || null,
        MaintTypeCode: form.value.maintTypeCode || null,
        MaintTypeYear: form.value.maintTypeYear || null,
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
        ActionCode: form.value.actionCode || null,
        ActionOther: form.value.actionOther || null,
        ReplacementParts: form.value.replacementParts || null,
        CompletionDate: form.value.completionDate || null,
        Remarks: form.value.remarks || null,
      }
      if (modal.mode === 'create') {
        await createEquipmentMaintenanceRecord(data)
      } else {
        await updateEquipmentMaintenanceRecord(
          modal.data.MaterialNo,
          modal.data.SerialNumber,
          modal.data.Id,
          data
        )
      }
    }
    closeModal()
    loadData()
  } catch (error) {
    console.error('Save error:', error)
    alert(`儲存失敗: ${(error as Error).message}`)
  }
}

const handleDelete = async (id: number, type: string) => {
  if (!confirm(`確定要刪除這筆資料嗎？`)) return

  try {
    if (type === 'maint-type') {
      await deleteMaintTypePhrase(id)
    } else if (type === 'fault-reason') {
      await deleteFaultReasonPhrase(id)
    } else if (type === 'action') {
      await deleteActionPhrase(id)
    } else if (type === 'equipment') {
      await deleteEquipmentMaintenanceRecord(
        (id as unknown as EquipmentMaintenanceRecord).MaterialNo,
        (id as unknown as EquipmentMaintenanceRecord).SerialNumber,
        (id as unknown as EquipmentMaintenanceRecord).Id
      )
    }
    loadData()
  } catch (error) {
    console.error('Delete error:', error)
    alert(`刪除失敗: ${(error as Error).message}`)
  }
}

// Helper to get equipment ID for delete
const getEquipmentIdKey = (record: EquipmentMaintenanceRecord) =>
  `${record.MaterialNo}-${record.SerialNumber}-${record.Id}`

// Helper to get count for current tab
const getCount = (tab: string) => {
  const counts: Record<string, number> = {
    'maint-type': maintTypePhrases.value.length,
    'fault-reason': faultReasonPhrases.value.length,
    'action': actionPhrases.value.length,
    'equipment': equipmentRecords.value.length,
  }
  return counts[tab] || 0
}

// Helper to get tab label
const getTabLabel = (type: string) => {
  const labels: Record<string, string> = {
    'maint-type': '維修物件類型',
    'fault-reason': '故障原因類型',
    'action': '處理方式類型',
    'equipment': '設備維修記錄',
  }
  return labels[type] || ''
}
</script>

<template>
  <div>
    <h2 class="text-xl font-bold text-slate-900 mb-4">可修件維護</h2>

    <!-- Tabs -->
    <div class="mb-4 border-b border-slate-200">
      <nav class="-mb-px flex gap-6" aria-label="Tabs">
        <button
          @click="activeTab = 'maint-type'"
          class="whitespace-nowrap pb-3 px-1 border-b-2 font-medium text-sm transition-colors"
          :class="activeTab === 'maint-type' ? 'border-blue-500 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'"
        >
          維修物件類型
        </button>
        <button
          @click="activeTab = 'fault-reason'"
          class="whitespace-nowrap pb-3 px-1 border-b-2 font-medium text-sm transition-colors"
          :class="activeTab === 'fault-reason' ? 'border-blue-500 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'"
        >
          故障原因類型
        </button>
        <button
          @click="activeTab = 'action'"
          class="whitespace-nowrap pb-3 px-1 border-b-2 font-medium text-sm transition-colors"
          :class="activeTab === 'action' ? 'border-blue-500 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'"
        >
          處理方式類型
        </button>
        <button
          @click="activeTab = 'equipment'"
          class="whitespace-nowrap pb-3 px-1 border-b-2 font-medium text-sm transition-colors"
          :class="activeTab === 'equipment' ? 'border-blue-500 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'"
        >
          設備維修記錄
        </button>
      </nav>
    </div>

    <!-- Content -->
    <div class="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      <!-- Toolbar -->
      <div class="p-4 border-b border-slate-200 flex justify-between items-center">
        <p class="text-sm text-slate-600">
          共
          <span class="font-semibold text-blue-600">{{ getCount(activeTab) }} 筆資料</span>
        </p>
        <button
          @click="openModal(activeTab, 'create')"
          class="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors flex items-center gap-2"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
          </svg>
          新增
        </button>
      </div>

      <!-- Loading state -->
      <div v-if="loading[activeTab]" class="p-8 text-center">
        <p class="text-slate-500">載入中...</p>
      </div>

      <!-- Empty state -->
      <div v-else-if="getCount(activeTab) === 0" class="p-8 text-center">
        <p class="text-slate-500">尚無資料</p>
      </div>

      <!-- Data tables -->
      <div v-else>
        <!-- Maintain Type Table -->
        <div v-if="activeTab === 'maint-type'" class="overflow-x-auto">
          <table class="min-w-full divide-y divide-slate-200">
            <thead class="bg-slate-50">
              <tr>
                <th class="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">名稱</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">排序</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">狀態</th>
                <th class="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">操作</th>
              </tr>
            </thead>
            <tbody class="bg-white divide-y divide-slate-200">
              <tr v-for="item in maintTypePhrases" :key="item.MaintTypeID" class="hover:bg-slate-50">
                <td class="px-6 py-4 whitespace-nowrap text-sm text-slate-900">{{ item.TypeName }}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-slate-500">{{ item.SortOrder ?? '-' }}</td>
                <td class="px-6 py-4 whitespace-nowrap">
                  <span
                    class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full"
                    :class="item.IsActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'"
                  >
                    {{ item.IsActive ? '啟用' : '停用' }}
                  </span>
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium flex justify-end gap-2">
                  <button
                    @click="openModal('maint-type', 'update', item)"
                    class="text-blue-600 hover:text-blue-900"
                  >
                    編輯
                  </button>
                  <button
                    @click="handleDelete(item.MaintTypeID, 'maint-type')"
                    class="text-red-600 hover:text-red-900"
                  >
                    刪除
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Fault Reason Table -->
        <div v-if="activeTab === 'fault-reason'" class="overflow-x-auto">
          <table class="min-w-full divide-y divide-slate-200">
            <thead class="bg-slate-50">
              <tr>
                <th class="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">名稱</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">排序</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">狀態</th>
                <th class="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">操作</th>
              </tr>
            </thead>
            <tbody class="bg-white divide-y divide-slate-200">
              <tr v-for="item in faultReasonPhrases" :key="item.ReasonID" class="hover:bg-slate-50">
                <td class="px-6 py-4 whitespace-nowrap text-sm text-slate-900">{{ item.ReasonName }}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-slate-500">{{ item.SortOrder ?? '-' }}</td>
                <td class="px-6 py-4 whitespace-nowrap">
                  <span
                    class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full"
                    :class="item.IsActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'"
                  >
                    {{ item.IsActive ? '啟用' : '停用' }}
                  </span>
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium flex justify-end gap-2">
                  <button
                    @click="openModal('fault-reason', 'update', item)"
                    class="text-blue-600 hover:text-blue-900"
                  >
                    編輯
                  </button>
                  <button
                    @click="handleDelete(item.ReasonID, 'fault-reason')"
                    class="text-red-600 hover:text-red-900"
                  >
                    刪除
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Action Table -->
        <div v-if="activeTab === 'action'" class="overflow-x-auto">
          <table class="min-w-full divide-y divide-slate-200">
            <thead class="bg-slate-50">
              <tr>
                <th class="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">名稱</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">排序</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">狀態</th>
                <th class="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">操作</th>
              </tr>
            </thead>
            <tbody class="bg-white divide-y divide-slate-200">
              <tr v-for="item in actionPhrases" :key="item.ActionID" class="hover:bg-slate-50">
                <td class="px-6 py-4 whitespace-nowrap text-sm text-slate-900">{{ item.ActionName }}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-slate-500">{{ item.SortOrder ?? '-' }}</td>
                <td class="px-6 py-4 whitespace-nowrap">
                  <span
                    class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full"
                    :class="item.IsActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'"
                  >
                    {{ item.IsActive ? '啟用' : '停用' }}
                  </span>
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium flex justify-end gap-2">
                  <button
                    @click="openModal('action', 'update', item)"
                    class="text-blue-600 hover:text-blue-900"
                  >
                    編輯
                  </button>
                  <button
                    @click="handleDelete(item.ActionID, 'action')"
                    class="text-red-600 hover:text-red-900"
                  >
                    刪除
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Equipment Records Table -->
        <div v-if="activeTab === 'equipment'" class="overflow-x-auto">
          <table class="min-w-full divide-y divide-slate-200">
            <thead class="bg-slate-50">
              <tr>
                <th class="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">物料編號</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">序號</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">ID</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">系統代碼</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">負責人</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">維修物件</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">故障原因</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">處理方式</th>
                <th class="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">操作</th>
              </tr>
            </thead>
            <tbody class="bg-white divide-y divide-slate-200">
              <tr v-for="item in equipmentRecords" :key="getEquipmentIdKey(item)" class="hover:bg-slate-50">
                <td class="px-6 py-4 whitespace-nowrap text-sm text-slate-900">{{ item.MaterialNo }}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-slate-500">{{ item.SerialNumber }}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-slate-500">{{ item.Id }}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-slate-500">{{ item.SystemCode }}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-slate-500">{{ item.InChargeID }}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-slate-500">{{ item.MaintTypeName || '-' }}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-slate-500">{{ item.FaultReasonName || '-' }}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-slate-500">{{ item.ActionName || '-' }}</td>
                <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium flex justify-end gap-2">
                  <button
                    @click="openModal('equipment', 'update', item)"
                    class="text-blue-600 hover:text-blue-900"
                  >
                    編輯
                  </button>
                  <button
                    @click="handleDelete(item.Id, 'equipment')"
                    class="text-red-600 hover:text-red-900"
                  >
                    刪除
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- Modal -->
    <div
      v-if="modal.visible"
      class="fixed inset-0 z-50 overflow-y-auto"
      aria-labelledby="modal-title"
      role="dialog"
      aria-modal="true"
    >
      <div class="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        <div class="fixed inset-0 bg-slate-900 bg-opacity-50 transition-opacity" aria-hidden="true" @click="closeModal"></div>
        <span class="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>

        <div class="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-2xl sm:w-full">
          <div class="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
            <h3 class="text-lg leading-6 font-medium text-slate-900 mb-4" id="modal-title">
              {{ modal.mode === 'create' ? '新增' : '編輯' }} - {{ getTabLabel(modal.type) }}
            </h3>

            <div class="space-y-4">
              <!-- Maintain Type Form -->
              <div v-if="modal.type === 'maint-type'">
                <div>
                  <label class="block text-sm font-medium text-slate-700">名稱 *</label>
                  <input
                    v-model="form.maintTypeName"
                    type="text"
                    required
                    class="mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 border"
                    placeholder="輸入維修物件名稱"
                  />
                </div>
                <div>
                  <label class="block text-sm font-medium text-slate-700">排序 (選填)</label>
                  <input
                    v-model="form.maintTypeSortOrder"
                    type="number"
                    class="mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 border"
                    placeholder="數字，數字越小越靠前"
                  />
                </div>
                <div>
                  <label class="flex items-center gap-2">
                    <input
                      v-model="form.maintTypeIsActive"
                      type="checkbox"
                      class="rounded text-blue-600 focus:ring-blue-500"
                    />
                    <span class="text-sm text-slate-700">啟用</span>
                  </label>
                </div>
              </div>

              <!-- Fault Reason Form -->
              <div v-if="modal.type === 'fault-reason'">
                <div>
                  <label class="block text-sm font-medium text-slate-700">名稱 *</label>
                  <input
                    v-model="form.faultReasonName"
                    type="text"
                    required
                    class="mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 border"
                    placeholder="輸入故障原因名稱"
                  />
                </div>
                <div>
                  <label class="block text-sm font-medium text-slate-700">排序 (選填)</label>
                  <input
                    v-model="form.faultReasonSortOrder"
                    type="number"
                    class="mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 border"
                    placeholder="數字，數字越小越靠前"
                  />
                </div>
                <div>
                  <label class="flex items-center gap-2">
                    <input
                      v-model="form.faultReasonIsActive"
                      type="checkbox"
                      class="rounded text-blue-600 focus:ring-blue-500"
                    />
                    <span class="text-sm text-slate-700">啟用</span>
                  </label>
                </div>
              </div>

              <!-- Action Form -->
              <div v-if="modal.type === 'action'">
                <div>
                  <label class="block text-sm font-medium text-slate-700">名稱 *</label>
                  <input
                    v-model="form.actionName"
                    type="text"
                    required
                    class="mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 border"
                    placeholder="輸入處理方式名稱"
                  />
                </div>
                <div>
                  <label class="block text-sm font-medium text-slate-700">排序 (選填)</label>
                  <input
                    v-model="form.actionSortOrder"
                    type="number"
                    class="mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 border"
                    placeholder="數字，數字越小越靠前"
                  />
                </div>
                <div>
                  <label class="flex items-center gap-2">
                    <input
                      v-model="form.actionIsActive"
                      type="checkbox"
                      class="rounded text-blue-600 focus:ring-blue-500"
                    />
                    <span class="text-sm text-slate-700">啟用</span>
                  </label>
                </div>
              </div>

              <!-- Equipment Form -->
              <div v-if="modal.type === 'equipment'" class="space-y-4">
                <div class="grid grid-cols-3 gap-4">
                  <div>
                    <label class="block text-sm font-medium text-slate-700">物料編號 *</label>
                    <input
                      v-model="form.materialNo"
                      type="text"
                      required
                      class="mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 border"
                      placeholder="13位物料編號"
                      maxlength="13"
                    />
                  </div>
                  <div>
                    <label class="block text-sm font-medium text-slate-700">序號 *</label>
                    <input
                      v-model="form.serialNumber"
                      type="text"
                      required
                      class="mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 border"
                      placeholder="50位內序號"
                      maxlength="50"
                    />
                  </div>
                  <div>
                    <label class="block text-sm font-medium text-slate-700">ID *</label>
                    <input
                      v-model="form.id"
                      type="number"
                      required
                      class="mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 border"
                    />
                  </div>
                </div>

                <div class="border-t border-slate-200 pt-4">
                  <h4 class="text-sm font-semibold text-slate-900 mb-3">基本資訊</h4>
                  <div class="grid grid-cols-2 gap-4">
                    <div>
                      <label class="block text-sm font-medium text-slate-700">系統代碼</label>
                      <input
                        v-model="form.systemCode"
                        type="text"
                        class="mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 border"
                        maxlength="5"
                      />
                    </div>
                    <div>
                      <label class="block text-sm font-medium text-slate-700">負責人 ID</label>
                      <input
                        v-model="form.inChargeID"
                        type="text"
                        class="mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 border"
                        maxlength="6"
                      />
                    </div>
                    <div>
                      <label class="block text-sm font-medium text-slate-700">Purchase Date</label>
                      <input
                        v-model="form.purchaseDate"
                        type="date"
                        class="mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 border"
                      />
                    </div>
                  </div>
                </div>

                <div class="border-t border-slate-200 pt-4">
                  <h4 class="text-sm font-semibold text-slate-900 mb-3">維修資訊</h4>
                  <div class="grid grid-cols-2 gap-4">
                    <div>
                      <label class="block text-sm font-medium text-slate-700">維修物件類型代碼</label>
                      <input
                        v-model="form.maintTypeCode"
                        type="text"
                        class="mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 border"
                        placeholder="對應 MaintTypePhrases.MaintTypeID"
                      />
                    </div>
                    <div>
                      <label class="block text-sm font-medium text-slate-700">維修年份</label>
                      <input
                        v-model="form.maintTypeYear"
                        type="text"
                        class="mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 border"
                      />
                    </div>
                    <div>
                      <label class="block text-sm font-medium text-slate-700">其他維修物件</label>
                      <input
                        v-model="form.maintTypeOther"
                        type="text"
                        class="mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 border"
                      />
                    </div>
                    <div>
                      <label class="block text-sm font-medium text-slate-700">維修開始日期</label>
                      <input
                        v-model="form.maintStartDate"
                        type="date"
                        class="mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 border"
                      />
                    </div>
                    <div>
                      <label class="block text-sm font-medium text-slate-700">維修結束日期</label>
                      <input
                        v-model="form.maintEndDate"
                        type="date"
                        class="mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 border"
                      />
                    </div>
                    <div>
                      <label class="block text-sm font-medium text-slate-700">工單號碼</label>
                      <input
                        v-model="form.workOrderNumber"
                        type="text"
                        class="mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 border"
                      />
                    </div>
                  </div>
                </div>

                <div class="border-t border-slate-200 pt-4">
                  <h4 class="text-sm font-semibold text-slate-900 mb-3">安裝/拆除</h4>
                  <div class="grid grid-cols-2 gap-4">
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
                      <input
                        v-model="form.removalLocation"
                        type="text"
                        class="mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 border"
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
                      <input
                        v-model="form.installationLocation"
                        type="text"
                        class="mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 border"
                      />
                    </div>
                  </div>
                </div>

                <div class="border-t border-slate-200 pt-4">
                  <h4 class="text-sm font-semibold text-slate-900 mb-3">故障與處理</h4>
                  <div class="grid grid-cols-2 gap-4">
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
                      <label class="block text-sm font-medium text-slate-700">處理方式代碼</label>
                      <input
                        v-model="form.actionCode"
                        type="text"
                        class="mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 border"
                        placeholder="對應 ActionPhrases.ActionID"
                      />
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

                <div class="border-t border-slate-200 pt-4">
                  <div class="grid grid-cols-2 gap-4">
                    <div>
                      <label class="block text-sm font-medium text-slate-700">更換零件</label>
                      <textarea
                        v-model="form.replacementParts"
                        rows="2"
                        class="mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 border"
                      ></textarea>
                    </div>
                    <div>
                      <label class="block text-sm font-medium text-slate-700">完成日期</label>
                      <input
                        v-model="form.completionDate"
                        type="date"
                        class="mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 border"
                      />
                    </div>
                  </div>
                  <div class="mt-4">
                    <label class="block text-sm font-medium text-slate-700">備註</label>
                    <textarea
                      v-model="form.remarks"
                      rows="3"
                      class="mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 border"
                    ></textarea>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div class="bg-slate-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
            <button
              type="button"
              @click="handleSave"
              class="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 focus:outline-none sm:ml-3 sm:w-auto sm:text-sm"
            >
              儲存
            </button>
            <button
              type="button"
              @click="closeModal"
              class="mt-3 w-full inline-flex justify-center rounded-md border border-slate-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-slate-700 hover:bg-slate-50 focus:outline-none sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
            >
              取消
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
