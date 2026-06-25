// API 服務 - 用於與後端 API 通訊
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

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

// EquipmentMaintenanceRecords API
export async function getEquipmentMaintenanceRecords() {
  const response = await fetch(`${API_BASE_URL}/equipment-maintenance-records`);
  return handleResponse<EquipmentMaintenanceRecord[]>(response);
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

export interface EquipmentMaintenanceRecord {
  MaterialNo: string;
  SerialNumber: string;
  Id: number;
  SystemCode: string;
  InChargeID: string;
  PurchaseDate: string | null;
  MaintTypeCode: string | null;
  MaintTypeYear: string | null;
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
