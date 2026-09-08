/// <reference types="vite/client" />

// API 服務 - 用於與後端 API 通訊
const API_BASE_URL = (import.meta as ImportMeta & { env?: Record<string, string | undefined> }).env?.VITE_API_URL || 'http://localhost:3000/api';

// 通用 response 處理
async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
  }
  return response.json();
}

// ActionPhrases API
export async function getActionPhrases() {
  const response = await fetch(`${API_BASE_URL}/action-phrases`);
  return handleResponse<ActionPhrase[]>(response);
}

export async function getActionPhraseById(id: number) {
  const response = await fetch(`${API_BASE_URL}/action-phrases/${id}`);
  return handleResponse<ActionPhrase>(response);
}

export async function createActionPhrase(data: Omit<ActionPhrase, 'ActionID'>) {
  const response = await fetch(`${API_BASE_URL}/action-phrases`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return handleResponse<ActionPhrase>(response);
}

export async function updateActionPhrase(id: number, data: Partial<ActionPhrase>) {
  const response = await fetch(`${API_BASE_URL}/action-phrases/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return handleResponse<ActionPhrase>(response);
}

export async function deleteActionPhrase(id: number) {
  const response = await fetch(`${API_BASE_URL}/action-phrases/${id}`, {
    method: 'DELETE',
  });
  if (!response.ok) {
    throw new Error(`Failed to delete action phrase ${id}`);
  }
}

// FaultReasonPhrases API
export async function getFaultReasonPhrases() {
  const response = await fetch(`${API_BASE_URL}/fault-reason-phrases`);
  return handleResponse<FaultReasonPhrase[]>(response);
}

export async function getFaultReasonPhraseById(id: number) {
  const response = await fetch(`${API_BASE_URL}/fault-reason-phrases/${id}`);
  return handleResponse<FaultReasonPhrase>(response);
}

export async function createFaultReasonPhrase(data: Omit<FaultReasonPhrase, 'ReasonID'>) {
  const response = await fetch(`${API_BASE_URL}/fault-reason-phrases`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return handleResponse<FaultReasonPhrase>(response);
}

export async function updateFaultReasonPhrase(id: number, data: Partial<FaultReasonPhrase>) {
  const response = await fetch(`${API_BASE_URL}/fault-reason-phrases/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return handleResponse<FaultReasonPhrase>(response);
}

export async function deleteFaultReasonPhrase(id: number) {
  const response = await fetch(`${API_BASE_URL}/fault-reason-phrases/${id}`, {
    method: 'DELETE',
  });
  if (!response.ok) {
    throw new Error(`Failed to delete fault reason phrase ${id}`);
  }
}

// MaintTypePhrases API
export async function getMaintTypePhrases() {
  const response = await fetch(`${API_BASE_URL}/maint-type-phrases`);
  return handleResponse<MaintTypePhrase[]>(response);
}

export async function getMaintTypePhraseById(id: number) {
  const response = await fetch(`${API_BASE_URL}/maint-type-phrases/${id}`);
  return handleResponse<MaintTypePhrase>(response);
}

export async function createMaintTypePhrase(data: Omit<MaintTypePhrase, 'MaintTypeID'>) {
  const response = await fetch(`${API_BASE_URL}/maint-type-phrases`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return handleResponse<MaintTypePhrase>(response);
}

export async function updateMaintTypePhrase(id: number, data: Partial<MaintTypePhrase>) {
  const response = await fetch(`${API_BASE_URL}/maint-type-phrases/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return handleResponse<MaintTypePhrase>(response);
}

export async function deleteMaintTypePhrase(id: number) {
  const response = await fetch(`${API_BASE_URL}/maint-type-phrases/${id}`, {
    method: 'DELETE',
  });
  if (!response.ok) {
    throw new Error(`Failed to delete maint type phrase ${id}`);
  }
}

// RepairableDevices API
export async function getRepairableDevices(parentDeviceID: string | null = null) {
  const query = parentDeviceID ? `?parentId=${encodeURIComponent(parentDeviceID)}` : '';
  const response = await fetch(`${API_BASE_URL}/repairable-devices${query}`);
  return handleResponse<RepairableDevice[]>(response);
}

export async function getRepairableDeviceSubtree(deviceID: string) {
  const response = await fetch(
    `${API_BASE_URL}/repairable-devices?subtreeOf=${encodeURIComponent(deviceID)}`
  );
  return handleResponse<RepairableDevice[]>(response);
}

export async function createRepairableDevice(data: RepairableDeviceInput) {
  const response = await fetch(`${API_BASE_URL}/repairable-devices`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      DeviceID: data.DeviceID,
      DeviceName: data.DeviceName,
      MaterialNo: data.MaterialNo,
      SerialNumber: data.SerialNumber,
      CurrentLocationDeviceID: data.CurrentLocationDeviceID,
    }),
  });
  return handleResponse<RepairableDevice>(response);
}

export async function updateRepairableDevice(deviceID: string, data: RepairableDeviceInput) {
  const response = await fetch(`${API_BASE_URL}/repairable-devices/${encodeURIComponent(deviceID)}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      DeviceName: data.DeviceName,
      MaterialNo: data.MaterialNo,
      SerialNumber: data.SerialNumber,
      CurrentLocationDeviceID: data.CurrentLocationDeviceID,
    }),
  });
  return handleResponse<RepairableDevice>(response);
}

export async function deleteRepairableDevice(deviceID: string) {
  const response = await fetch(`${API_BASE_URL}/repairable-devices/${encodeURIComponent(deviceID)}`, {
    method: 'DELETE',
  });
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `刪除失敗：${response.status}`);
  }
}

// Locations API
export interface LocationListParams {
  page?: number;
  pageSize?: number;
  sortBy?: 'LocationCode' | 'LocationName' | 'SortOrder' | 'IsActive';
  sortDir?: 'asc' | 'desc';
  keyword?: string;
  unit?: string;
}

export interface LocationListResult {
  data: Location[];
  total: number;
  page: number;
  pageSize: number;
}

export async function getLocations(params: LocationListParams = {}) {
  const query = new URLSearchParams();
  if (params.page) query.set('page', String(params.page));
  if (params.pageSize) query.set('pageSize', String(params.pageSize));
  if (params.sortBy) query.set('sortBy', params.sortBy);
  if (params.sortDir) query.set('sortDir', params.sortDir);
  if (params.keyword) query.set('keyword', params.keyword);
  if (params.unit) query.set('unit', params.unit);
  const qs = query.toString();
  const response = await fetch(`${API_BASE_URL}/locations${qs ? `?${qs}` : ''}`);
  return handleResponse<LocationListResult>(response);
}

export async function getLocationById(id: number) {
  const response = await fetch(`${API_BASE_URL}/locations/${id}`);
  return handleResponse<Location>(response);
}

export async function createLocation(data: Omit<Location, 'LocationID'>) {
  const response = await fetch(`${API_BASE_URL}/locations`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return handleResponse<Location>(response);
}

export async function updateLocation(id: number, data: Partial<Location>) {
  const response = await fetch(`${API_BASE_URL}/locations/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return handleResponse<Location>(response);
}

export async function deleteLocation(id: number) {
  const response = await fetch(`${API_BASE_URL}/locations/${id}`, {
    method: 'DELETE',
  });
  if (!response.ok) {
    throw new Error(`Failed to delete location ${id}`);
  }
}

// Materials API
export async function searchMaterials(keyword: string) {
  const response = await fetch(`${API_BASE_URL}/materials?keyword=${encodeURIComponent(keyword)}`);
  return handleResponse<Material[]>(response);
}

// Employee API
export async function searchEmployees(keyword: string) {
  const response = await fetch(`${API_BASE_URL}/employee/employees?keyword=${encodeURIComponent(keyword)}`);
  return handleResponse<Employee[]>(response);
}

export async function getEmployeeByKeyno(keyno: string) {
  const response = await fetch(`${API_BASE_URL}/employee/employees/keyno/${encodeURIComponent(keyno)}`);
  return handleResponse<Employee>(response);
}

// EquipmentMaintenanceRecords API
export async function getEquipmentMaintenanceRecords() {
  const response = await fetch(`${API_BASE_URL}/equipment-maintenance-records`);
  return handleResponse<EquipmentMaintenanceRecord[]>(response);
}

export async function checkMaterialNoExists(materialNo: string) {
  const response = await fetch(
    `${API_BASE_URL}/equipment-maintenance-records/exists/${encodeURIComponent(materialNo)}`
  );
  const data = await handleResponse<{ exists: boolean }>(response);
  return data.exists;
}

export async function getEquipmentMaintenanceRecord(
  materialNo: string,
  serialNumber: string,
  id: number
) {
  const response = await fetch(
    `${API_BASE_URL}/equipment-maintenance-records/${materialNo}/${serialNumber}/${id}`
  );
  return handleResponse<EquipmentMaintenanceRecord>(response);
}

export async function createEquipmentMaintenanceRecord(
  data: Omit<EquipmentMaintenanceRecord, 'CreatedAt' | 'UpdatedAt'>
) {
  const response = await fetch(`${API_BASE_URL}/equipment-maintenance-records`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return handleResponse<EquipmentMaintenanceRecord>(response);
}

export async function updateEquipmentMaintenanceRecord(
  materialNo: string,
  serialNumber: string,
  id: number,
  data: Partial<EquipmentMaintenanceRecord>
) {
  const response = await fetch(
    `${API_BASE_URL}/equipment-maintenance-records/${materialNo}/${serialNumber}/${id}`,
    {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    }
  );
  return handleResponse<EquipmentMaintenanceRecord>(response);
}

export async function deleteEquipmentMaintenanceRecord(
  materialNo: string,
  serialNumber: string,
  id: number
) {
  const response = await fetch(
    `${API_BASE_URL}/equipment-maintenance-records/${materialNo}/${serialNumber}/${id}`,
    { method: 'DELETE' }
  );
  if (!response.ok) {
    throw new Error(
      `Failed to delete equipment maintenance record ${materialNo}/${serialNumber}/${id}`
    );
  }
}

// TypeScript interfaces
export interface ActionPhrase {
  ActionID: number;
  ActionName: string;
  SortOrder: number | null;
  IsActive: boolean | null;
}

export interface FaultReasonPhrase {
  ReasonID: number;
  ReasonName: string;
  SortOrder: number | null;
  IsActive: boolean | null;
}

export interface MaintTypePhrase {
  MaintTypeID: number;
  TypeName: string;
  SortOrder: number | null;
  IsActive: boolean | null;
}

export interface RepairableDeviceInput {
  DeviceID: string;
  DeviceName: string;
  MaterialNo: string | null;
  SerialNumber: string | null;
  CurrentLocationDeviceID: string | null;
}

export interface RepairableDevice extends RepairableDeviceInput {
  CreatedAt: string;
  UpdatedAt: string;
  HierarchyLevel: number;
  HierarchyPath: string;
  CurrentLocationDeviceName: string | null;
  HasChildren: boolean;
}

export interface Location {
  LocationID: number;
  LocationCode: string;
  LocationName: string;
  SortOrder: number | null;
  IsActive: boolean | null;
  CreatedBy: string | null;
  CreatedByUnit: string | null;
}

export interface Material {
  物料編號: string;
  物料名稱: string;
  規格: string | null;
  系統代號: string | null;
  系統名稱: string | null;
  子系統代號: string | null;
  子系統名稱: string | null;
}

export interface Employee {
  KEYNO: string;
  TMNAME: string;
  EMAIL: string | null;
  TelExtension: string | null;
  UNITNO: string | null;
  JOBName: string | null;
  OFFJOBDATE: string | null;
  CreatedTime: string | null;
  UpdatedTime: string | null;
}

export interface EquipmentMaintenanceRecord {
  MaterialNo: string;
  SerialNumber: string;
  Id: number;
  SystemCode: string;
  InChargeID: string;
  PurchaseDate: string | null;
  MaintTypeCode: string | null;
  MaintTypeOther: string | null;
  MaintStartDate: string | null;
  MaintEndDate: string | null;
  WorkOrderNumber: string | null;
  RemovalDate: string | null;
  RemovalLocation: string | null;
  InstallationDate: string | null;
  InstallationLocation: string | null;
  FaultReasonCode: string | null;
  FaultReasonOther: string | null;
  ActionCode: string | null;
  ActionOther: string | null;
  ReplacementParts: string | null;
  CompletionDate: string | null;
  Remarks: string | null;
  CreatedAt: string | null;
  UpdatedAt: string | null;
  // Joined fields
  MaintTypeName?: string;
  FaultReasonName?: string;
  ActionName?: string;
}
