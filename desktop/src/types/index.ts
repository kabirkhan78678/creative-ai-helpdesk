export interface User {
  id: number;
  employee_code: string;
  full_name: string;
  email: string;
  role: 'ADMIN' | 'TECHNICIAN' | 'EMPLOYEE';
  department: string;
  designation?: string;
  avatar_url?: string;
}

export interface Device {
  id: number;
  hostname: string;
  assigned_user_id?: number | null;
  assigned_user?: User | null;
  ip_address: string;
  mac_address: string;
  os_name: string;
  os_version: string;
  cpu_model: string;
  total_ram_gb: number;
  used_ram_gb: number;
  cpu_usage_pct: number;
  storage_usage_pct: number;
  total_storage_gb?: number;
  used_storage_gb?: number;
  wifi_ssid?: string;
  ping_ms?: number;
  has_usb_connected?: boolean;
  usb_devices?: string;
  is_online: boolean;
  last_heartbeat?: string | null;
  agent_version: string;
}

export type TicketPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type TicketStatus = 'PENDING' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED';
export type TicketCategory = 'HARDWARE' | 'NETWORK' | 'SOFTWARE' | 'ACCESS' | 'OTHER';

export interface Ticket {
  id: number;
  ticket_uuid: string;
  ticket_number: string;
  title: string;
  description: string;
  category: TicketCategory;
  priority: TicketPriority;
  status: TicketStatus;
  creator_id: number;
  assigned_tech_id?: number | null;
  device_id?: number | null;
  creator?: User | null;
  assigned_tech?: User | null;
  device?: Device | null;
  created_at: string;
  updated_at?: string;
  resolved_at?: string | null;
  attachment_image?: string | null;
}

export interface ChatMessage {
  id: number;
  ticket_id?: number | null;
  sender_id: number;
  recipient_id: number;
  message_body: string;
  is_read: boolean;
  created_at: string;
  sender?: User;
}

export interface RemoteSessionPrompt {
  session_code: string;
  session_id: number;
  admin_id: number;
  admin_name?: string;
  device_id: number;
  target_hostname?: string;
  ticket_id?: number;
}

export interface Announcement {
  id: number;
  title: string;
  message: string;
  priority: 'INFO' | 'WARNING' | 'CRITICAL';
  created_by_id?: number;
  is_active: boolean;
  created_at: string;
  created_by?: User;
}

export interface ProcessItem {
  name: string;
  pid: number;
  session: string;
  mem_mb: number;
}

export interface DiagnosticStep {
  name: string;
  status: 'PASS' | 'WARNING' | 'INFO';
  detail: string;
}

export interface DiagnosticReport {
  timestamp: string;
  overallStatus: string;
  totalMbFreed: number;
  pingMs: number;
  steps: DiagnosticStep[];
}

export interface SpeedTestResult {
  downloadMbps: number;
  uploadMbps: number;
  pingMs: number;
  jitterMs: number;
  quality: 'EXCELLENT' | 'GOOD' | 'FAIR' | 'POOR';
  qualityLabel: string;
  timestamp: string;
  wifiSsid?: string;
}
