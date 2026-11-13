import { getApiBaseUrl } from '../config/api';
import { User, Device } from '../types';

export async function autoEnrollCurrentPC(user?: User | null): Promise<Device | null> {
  let specs: any = null;

  // 1. Read real system hardware directly from Electron Node API
  if (typeof window !== 'undefined' && (window as any).electronAPI?.getSystemSpecs) {
    try {
      specs = (window as any).electronAPI.getSystemSpecs();
      console.log('[Enrollment] Live hardware specs detected via Electron:', specs);
    } catch (e) {
      console.warn('[Enrollment] electronAPI.getSystemSpecs notice:', e);
    }
  }

  // 2. Fallback if running outside Electron (e.g. browser preview)
  if (!specs) {
    const isMac = typeof navigator !== 'undefined' && navigator.platform.toUpperCase().indexOf('MAC') >= 0;
    specs = {
      hostname: (user ? user.employee_code : 'PC') + '-WORKSTATION',
      ip_address: '127.0.0.1',
      mac_address: 'DEV-' + (user ? user.id : 'HOST'),
      os_name: isMac ? 'macOS' : 'Windows 11',
      os_version: '10.0',
      cpu_model: 'Host Workstation Processor',
      total_ram_gb: 16.0,
      used_ram_gb: 8.0,
      cpu_usage_pct: 25.0,
      total_storage_gb: 256.0,
      used_storage_gb: 120.0,
      storage_usage_pct: 47.0,
    };
  }

  try {
    const res = await fetch(`${getApiBaseUrl()}/devices/auto-enroll`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...specs,
        user_id: user ? user.id : null,
      }),
    });

    if (res.ok) {
      const savedDevice = await res.json();
      console.log('✓ System hardware profile auto-enrolled in MySQL:', savedDevice.hostname, savedDevice.ip_address);
      return savedDevice;
    }
  } catch (err) {
    console.warn('Auto-enrollment network notice:', err);
  }
  return null;
}
