// Default production cloud relay host (change to your company cloud endpoint or keep localhost for local dev)
const DEFAULT_CLOUD_RELAY = 'localhost';

export const getServerHost = (): string => {
  try {
    const saved = localStorage.getItem('creative_ai_server_host');
    if (saved) return saved;
    if (
      typeof window !== 'undefined' &&
      window.location &&
      window.location.hostname &&
      window.location.hostname !== 'localhost' &&
      window.location.hostname !== '127.0.0.1'
    ) {
      return window.location.hostname;
    }
    return DEFAULT_CLOUD_RELAY;
  } catch {
    return DEFAULT_CLOUD_RELAY;
  }
};

export const setServerHost = (host: string): void => {
  try {
    let clean = host.trim();
    if (!clean) clean = DEFAULT_CLOUD_RELAY;
    localStorage.setItem('creative_ai_server_host', clean);
  } catch (e) {
    console.error('Failed to save server host:', e);
  }
};

export const getApiBaseUrl = (): string => {
  const host = getServerHost();
  if (host.startsWith('http://') || host.startsWith('https://')) {
    return `${host.replace(/\/+$/, '')}/api/v1`;
  }
  return `http://${host}:8000/api/v1`;
};

export const getWsUrl = (userId: number, role: string): string => {
  const host = getServerHost();
  if (host.startsWith('https://')) {
    const wsDomain = host.replace(/\/+$/, '').replace('https://', 'wss://');
    return `${wsDomain}/ws?user_id=${userId}&role=${role}`;
  }
  if (host.startsWith('http://')) {
    const wsDomain = host.replace(/\/+$/, '').replace('http://', 'ws://');
    return `${wsDomain}/ws?user_id=${userId}&role=${role}`;
  }
  return `ws://${host}:8000/ws?user_id=${userId}&role=${role}`;
};
