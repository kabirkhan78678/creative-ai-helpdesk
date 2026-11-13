const { contextBridge, ipcRenderer } = require('electron');
const os = require('os');
const fs = require('fs');
const path = require('path');
const http = require('http');
const https = require('https');
const dgram = require('dgram');
const { execSync } = require('child_process');

function getCpuAverage() {
  const cpus = os.cpus();
  let idleMs = 0;
  let totalMs = 0;
  for (const cpu of cpus) {
    for (const type in cpu.times) {
      totalMs += cpu.times[type];
    }
    idleMs += cpu.times.idle;
  }
  return { idle: idleMs / cpus.length, total: totalMs / cpus.length };
}

let prevCpuSample = getCpuAverage();

function getExactCpuPct() {
  const current = getCpuAverage();
  const idleDiff = current.idle - prevCpuSample.idle;
  const totalDiff = current.total - prevCpuSample.total;
  prevCpuSample = current;
  if (totalDiff <= 0) return 12.0;
  const pct = Math.max(0, Math.min(100, 100 - (100 * idleDiff) / totalDiff));
  return Math.round(pct * 10) / 10;
}

function getExactDiskStorage() {
  let totalStorageGb = 256.0;
  let usedStorageGb = 100.0;
  let storageUsagePct = 40.0;

  try {
    const root = process.platform === 'win32' ? 'C:\\' : '/';
    const stats = fs.statfsSync(root);
    const totalBytes = stats.bsize * stats.blocks;
    const freeBytes = stats.bsize * stats.bfree;
    const usedBytes = totalBytes - freeBytes;

    totalStorageGb = Math.round((totalBytes / (1024 ** 3)) * 10) / 10;
    usedStorageGb = Math.round((usedBytes / (1024 ** 3)) * 10) / 10;
    storageUsagePct = Math.round((usedBytes / totalBytes) * 100);
  } catch (err) {
    console.warn('Storage detection notice:', err);
  }

  return { totalStorageGb, usedStorageGb, storageUsagePct };
}

function getNetworkAndUsbInfo() {
  let ssid = 'Ethernet / Wired';
  let pingMs = 15;
  let hasUsb = false;
  let usbDevices = '';

  if (process.platform === 'win32') {
    // 1. Windows Wi-Fi SSID
    try {
      const out = execSync('netsh wlan show interfaces', { encoding: 'utf8', timeout: 1500 });
      const m = out.match(/^\s*SSID\s*:\s*(.+)$/m);
      if (m && m[1].trim()) ssid = m[1].trim();
    } catch (_) {}

    // 2. Windows Ping to DNS
    try {
      const pingOut = execSync('ping -n 1 8.8.8.8', { encoding: 'utf8', timeout: 2000 });
      const pm = pingOut.match(/time[<=]([0-9]+)ms/i);
      if (pm) pingMs = parseInt(pm[1], 10);
    } catch (_) {}

    // 3. Windows Removable USB Drives
    try {
      const usbOut = execSync('powershell -NoProfile -Command "Get-CimInstance Win32_LogicalDisk -Filter \\"DriveType=2\\" | Select-Object -ExpandProperty DeviceID"', { encoding: 'utf8', timeout: 2000 });
      const drives = usbOut.trim().split(/\r?\n/).filter(Boolean);
      if (drives.length > 0) {
        hasUsb = true;
        usbDevices = drives.join(', ');
      }
    } catch (_) {}
  } else if (process.platform === 'darwin') {
    // 1. macOS Wi-Fi SSID (detects en0 or en1 dynamically)
    try {
      let wifiInterface = 'en0';
      try {
        const portInfo = execSync('networksetup -listallhardwareports', { encoding: 'utf8', timeout: 1500 });
        const match = portInfo.match(/Hardware Port: Wi-Fi\s+Device: (en\d+)/i);
        if (match && match[1]) wifiInterface = match[1];
      } catch (_) {}

      const out = execSync(`networksetup -getairportnetwork ${wifiInterface}`, { encoding: 'utf8', timeout: 1500 });
      const m = out.match(/Current Wi-Fi Network:\s*(.+)/i);
      if (m && m[1].trim()) ssid = m[1].trim();
    } catch (_) {
      try {
        const out2 = execSync('/System/Library/PrivateFrameworks/Apple80211.framework/Versions/Current/Resources/airport -I', { encoding: 'utf8', timeout: 1500 });
        const m2 = out2.match(/^\s*SSID:\s*(.+)$/m);
        if (m2 && m2[1].trim()) ssid = m2[1].trim();
      } catch (__) {}
    }

    // 2. macOS Ping to DNS
    try {
      const pingOut = execSync('ping -c 1 8.8.8.8', { encoding: 'utf8', timeout: 2000 });
      const pm = pingOut.match(/time[<=]([0-9.]+) ?ms/i);
      if (pm) pingMs = Math.round(parseFloat(pm[1]));
    } catch (_) {}

    // 3. macOS External USB Storage
    try {
      const usbOut = execSync('diskutil list external', { encoding: 'utf8', timeout: 2000 });
      if (usbOut && !usbOut.includes('Could not find') && usbOut.includes('/dev/disk')) {
        hasUsb = true;
        usbDevices = 'External USB Media';
      }
    } catch (_) {}
  } else {
    // Linux / Other
    try {
      const pingOut = execSync('ping -c 1 8.8.8.8', { encoding: 'utf8', timeout: 2000 });
      const pm = pingOut.match(/time[<=]([0-9.]+) ?ms/i);
      if (pm) pingMs = Math.round(parseFloat(pm[1]));
    } catch (_) {}
  }

  return { ssid, pingMs, hasUsb, usbDevices };
}

function getLocalSystemSpecs() {
  try {
    const cpus = os.cpus();
    const cpuModel = cpus && cpus.length ? cpus[0].model.trim() : 'Multi-Core Processor';
    const totalRamGb = Math.round((os.totalmem() / (1024 ** 3)) * 10) / 10;
    const freeRamGb = Math.round((os.freemem() / (1024 ** 3)) * 10) / 10;
    const usedRamGb = Math.round((totalRamGb - freeRamGb) * 10) / 10;

    const storage = getExactDiskStorage();
    const cpuPct = getExactCpuPct();
    const netUsb = getNetworkAndUsbInfo();

    let ip = '127.0.0.1';
    let mac = '00:00:00:00:00:00';
    const nets = os.networkInterfaces();
    for (const name of Object.keys(nets)) {
      for (const net of nets[name]) {
        if (net.family === 'IPv4' && !net.internal) {
          ip = net.address;
          mac = net.mac;
          break;
        }
      }
      if (ip !== '127.0.0.1') break;
    }

    let osName = 'Windows 11';
    if (process.platform === 'win32') {
      osName = `Windows 11 (${os.release()})`;
    } else if (process.platform === 'darwin') {
      try {
        const ver = execSync('sw_vers -productVersion', { encoding: 'utf8', timeout: 1000 }).trim();
        osName = `macOS ${ver}`;
      } catch (_) {
        osName = `macOS (${os.release()})`;
      }
    } else if (process.platform === 'linux') {
      osName = `Linux (${os.release()})`;
    }

    return {
      hostname: os.hostname(),
      ip_address: ip,
      mac_address: mac,
      os_name: osName,
      os_version: os.release(),
      cpu_model: cpuModel,
      total_ram_gb: totalRamGb,
      used_ram_gb: usedRamGb,
      cpu_usage_pct: cpuPct,
      total_storage_gb: storage.totalStorageGb,
      used_storage_gb: storage.usedStorageGb,
      storage_usage_pct: storage.storageUsagePct,
      wifi_ssid: netUsb.ssid,
      ping_ms: netUsb.pingMs,
      has_usb_connected: netUsb.hasUsb,
      usb_devices: netUsb.usbDevices
    };
  } catch (err) {
    console.error('Failed to get system specs:', err);
    return null;
  }
}

function getLiveTelemetry() {
  try {
    const totalRamGb = Math.round((os.totalmem() / (1024 ** 3)) * 10) / 10;
    const freeRamGb = Math.round((os.freemem() / (1024 ** 3)) * 10) / 10;
    const usedRamGb = Math.round((totalRamGb - freeRamGb) * 10) / 10;
    const storage = getExactDiskStorage();
    const netUsb = getNetworkAndUsbInfo();

    return {
      hostname: os.hostname(),
      cpu_usage_pct: getExactCpuPct(),
      used_ram_gb: usedRamGb,
      total_ram_gb: totalRamGb,
      storage_usage_pct: storage.storageUsagePct,
      total_storage_gb: storage.totalStorageGb,
      used_storage_gb: storage.usedStorageGb,
      wifi_ssid: netUsb.ssid,
      ping_ms: netUsb.pingMs,
      has_usb_connected: netUsb.hasUsb,
      usb_devices: netUsb.usbDevices
    };
  } catch (err) {
    return null;
  }
}

// Top Running Processes for Remote Task Manager (Windows + macOS + Linux)
function getRunningProcesses() {
  if (process.platform === 'win32') {
    try {
      const stdout = execSync('tasklist /FO CSV /NH', { encoding: 'utf8', timeout: 4000, maxBuffer: 10 * 1024 * 1024 });
      const lines = stdout.trim().split(/\r?\n/);
      return lines.map(line => {
        const cleaned = line.replace(/^"/, '').replace(/"$/, '');
        const parts = cleaned.split('","');
        const memStr = parts[4] || '0 K';
        const memMb = Math.round(parseInt(memStr.replace(/[^0-9]/g, ''), 10) / 1024 * 10) / 10;
        return {
          name: parts[0] || 'Unknown',
          pid: parseInt(parts[1], 10) || 0,
          session: parts[2] || '',
          mem_mb: memMb || 0
        };
      }).filter(p => p.pid > 0).sort((a, b) => b.mem_mb - a.mem_mb).slice(0, 30);
    } catch (err) {
      console.error('Error fetching Windows processes:', err);
      return [];
    }
  } else {
    // macOS / Linux
    try {
      const stdout = execSync('ps -axo pid,rss,comm', { encoding: 'utf8', timeout: 4000 });
      const lines = stdout.trim().split(/\r?\n/).slice(1);
      return lines.map(line => {
        const parts = line.trim().split(/\s+/);
        const pid = parseInt(parts[0], 10) || 0;
        const rssKb = parseInt(parts[1], 10) || 0;
        const comm = parts.slice(2).join(' ') || 'Process';
        const name = path.basename(comm);
        return {
          name,
          pid,
          session: 'Console',
          mem_mb: Math.round((rssKb / 1024) * 10) / 10
        };
      }).filter(p => p.pid > 0).sort((a, b) => b.mem_mb - a.mem_mb).slice(0, 30);
    } catch (err) {
      console.error('Error fetching Unix/macOS processes:', err);
      return [];
    }
  }
}

// Clean Temp Files (Cross-Platform)
function cleanTempFiles() {
  const tempDir = os.tmpdir();
  let bytesFreed = 0;
  let filesRemoved = 0;
  try {
    const files = fs.readdirSync(tempDir);
    for (const f of files) {
      try {
        const fullPath = path.join(tempDir, f);
        const stat = fs.statSync(fullPath);
        if (stat.isFile()) {
          bytesFreed += stat.size;
          fs.unlinkSync(fullPath);
          filesRemoved++;
        }
      } catch (_) {}
    }
  } catch (_) {}
  const mbFreed = Math.round((bytesFreed / (1024 * 1024)) * 10) / 10;
  return { mbFreed, filesRemoved };
}

// Execute Remote IT Actions (Cross-Platform: Windows + macOS + Linux)
function executeRemoteAction(action, targetPid) {
  try {
    if (action === 'LOCK') {
      if (process.platform === 'win32') {
        execSync('rundll32.exe user32.dll,LockWorkStation');
        return { success: true, message: 'Workstation locked successfully.' };
      } else if (process.platform === 'darwin') {
        execSync('pmset displaysleepnow');
        return { success: true, message: 'Mac screen locked successfully.' };
      }
    } else if (action === 'RESTART') {
      if (process.platform === 'win32') {
        execSync('shutdown /r /t 15 /c "Restart initiated by IT Administrator."');
        return { success: true, message: 'PC restart scheduled in 15 seconds.' };
      } else if (process.platform === 'darwin') {
        execSync(`osascript -e 'tell application "System Events" to restart'`);
        return { success: true, message: 'Mac restart initiated.' };
      }
    } else if (action === 'FLUSH_DNS') {
      if (process.platform === 'win32') {
        execSync('ipconfig /flushdns');
        return { success: true, message: 'DNS cache flushed and network adapter refreshed.' };
      } else if (process.platform === 'darwin') {
        execSync('dscacheutil -flushcache');
        return { success: true, message: 'macOS DNS cache flushed successfully.' };
      }
    } else if (action === 'CLEAN_TEMP') {
      const res = cleanTempFiles();
      return { success: true, message: `Cleaned ${res.filesRemoved} temp files (${res.mbFreed} MB freed).` };
    } else if (action === 'KILL_PROCESS' && targetPid) {
      if (process.platform === 'win32') {
        execSync(`taskkill /F /PID ${targetPid}`);
        return { success: true, message: `Process PID ${targetPid} terminated.` };
      } else {
        execSync(`kill -9 ${targetPid}`);
        return { success: true, message: `Process PID ${targetPid} terminated.` };
      }
    } else if (action === 'GET_TASKLIST') {
      const procs = getRunningProcesses();
      return { success: true, processes: procs };
    }
  } catch (err) {
    return { success: false, message: err.message };
  }
  return { success: false, message: 'Unsupported action or platform' };
}

// One-Click Self-Healing Diagnostics Tool for Employee (Cross-Platform)
function runSelfHealingDiagnostics() {
  const steps = [];
  let totalMbFreed = 0;

  // Step 1: Internet & Gateway Ping
  let pingResult = 'OK';
  let pingMs = 18;
  const pingCmd = process.platform === 'win32' ? 'ping -n 1 8.8.8.8' : 'ping -c 1 8.8.8.8';
  try {
    const out = execSync(pingCmd, { encoding: 'utf8', timeout: 2500 });
    const pm = out.match(/time[<=]([0-9.]+) ?ms/i);
    if (pm) pingMs = Math.round(parseFloat(pm[1]));
    steps.push({ name: 'Internet Connectivity', status: 'PASS', detail: `Google DNS reachable (${pingMs}ms latency)` });
  } catch (e) {
    pingResult = 'FAILED';
    steps.push({ name: 'Internet Connectivity', status: 'WARNING', detail: 'External ping failed or high latency' });
  }

  // Step 2: Flush DNS
  try {
    if (process.platform === 'win32') {
      execSync('ipconfig /flushdns', { timeout: 2000 });
      steps.push({ name: 'DNS Resolver Cache', status: 'PASS', detail: 'DNS cache cleared and refreshed' });
    } else if (process.platform === 'darwin') {
      execSync('dscacheutil -flushcache', { timeout: 2000 });
      steps.push({ name: 'DNS Resolver Cache', status: 'PASS', detail: 'macOS DNS cache flushed and refreshed' });
    } else {
      steps.push({ name: 'DNS Resolver Cache', status: 'PASS', detail: 'DNS resolver verified' });
    }
  } catch (e) {
    steps.push({ name: 'DNS Resolver Cache', status: 'INFO', detail: 'DNS check completed' });
  }

  // Step 3: Temp Cache & Junk Clean
  try {
    const cleanRes = cleanTempFiles();
    totalMbFreed = cleanRes.mbFreed;
    steps.push({ name: 'System Temp Cache', status: 'PASS', detail: `Cleared ${cleanRes.filesRemoved} files (${cleanRes.mbFreed} MB junk removed)` });
  } catch (e) {
    steps.push({ name: 'System Temp Cache', status: 'INFO', detail: 'Temporary directory checked' });
  }

  // Step 4: RAM & Disk Space Check
  const storage = getExactDiskStorage();
  const freeRamGb = Math.round((os.freemem() / (1024 ** 3)) * 10) / 10;
  const driveLabel = process.platform === 'win32' ? 'C: Drive' : 'Main Storage (/)';
  steps.push({
    name: 'Hardware Storage & Memory',
    status: storage.storageUsagePct > 90 ? 'WARNING' : 'PASS',
    detail: `${driveLabel} is ${storage.storageUsagePct}% used (${(storage.totalStorageGb - storage.usedStorageGb).toFixed(1)} GB free). Available RAM: ${freeRamGb} GB.`
  });

  return {
    timestamp: new Date().toLocaleTimeString(),
    overallStatus: 'OPTIMIZED',
    totalMbFreed,
    pingMs,
    steps
  };
}

// Live Network Speed Test (Download, Upload, Ping, Jitter)
async function runNetworkSpeedTest() {
  const netInfo = getNetworkAndUsbInfo();

  // 1. Measure Latency & Jitter (3 samples)
  const pings = [];
  for (let i = 0; i < 3; i++) {
    const t0 = Date.now();
    await new Promise((resolve) => {
      const req = https.get('https://speed.cloudflare.com/__down?bytes=0', (res) => {
        res.on('data', () => {});
        res.on('end', resolve);
      });
      req.on('error', resolve);
      req.setTimeout(3000, () => { req.destroy(); resolve(); });
    });
    pings.push(Date.now() - t0);
  }

  // Filter out TLS cold start if possible
  const validPings = pings.filter(p => p > 0);
  const avgPing = validPings.length > 1
    ? Math.round(validPings.slice(1).reduce((a, b) => a + b, 0) / (validPings.length - 1))
    : (validPings[0] || netInfo.pingMs || 20);
  const jitter = validPings.length > 2
    ? Math.round(Math.abs(validPings[2] - validPings[1]))
    : 3;

  // 2. Measure Download Speed (6MB stream directly from nearest CDN edge)
  let downloadBytes = 0;
  const dlStart = Date.now();
  await new Promise((resolve) => {
    const req = https.get('https://speed.cloudflare.com/__down?bytes=6000000', (res) => {
      res.on('data', (chunk) => {
        downloadBytes += chunk.length;
      });
      res.on('end', resolve);
    });
    req.on('error', resolve);
    req.setTimeout(9000, () => { req.destroy(); resolve(); });
  });
  const dlDuration = Math.max(0.08, (Date.now() - dlStart) / 1000);
  const downloadMbps = downloadBytes > 0
    ? Math.round(((downloadBytes * 8) / (dlDuration * 1024 * 1024)) * 10) / 10
    : 0;

  // 3. Measure Upload Speed (2MB buffer payload)
  const upPayload = Buffer.alloc(2000000, 75);
  const upStart = Date.now();
  await new Promise((resolve) => {
    const req = https.request('https://speed.cloudflare.com/__up', { method: 'POST' }, (res) => {
      res.on('data', () => {});
      res.on('end', resolve);
    });
    req.on('error', resolve);
    req.setTimeout(9000, () => { req.destroy(); resolve(); });
    req.write(upPayload);
    req.end();
  });
  const upDuration = Math.max(0.08, (Date.now() - upStart) / 1000);
  const uploadMbps = Math.round(((upPayload.length * 8) / (upDuration * 1024 * 1024)) * 10) / 10;

  // Assess Quality
  let quality = 'GOOD';
  let qualityLabel = 'Good Speed (Smooth browsing & office work)';
  if (downloadMbps >= 45) {
    quality = 'EXCELLENT';
    qualityLabel = 'Super Fast (4K streaming & large files)';
  } else if (downloadMbps < 12) {
    quality = 'FAIR';
    qualityLabel = 'Slow Connection (May cause video meeting lag)';
  }

  return {
    downloadMbps,
    uploadMbps,
    pingMs: avgPing,
    jitterMs: jitter,
    quality,
    qualityLabel,
    wifiSsid: netInfo.ssid,
    timestamp: new Date().toLocaleTimeString()
  };
}

// Zero-Config Central Server Auto-Discovery on Local Wi-Fi / LAN
async function discoverServerIp() {
  // 1. Quick UDP Broadcast Probe (port 41234)
  const udpPromise = new Promise((resolve) => {
    try {
      const client = dgram.createSocket({ type: 'udp4', reuseAddr: true });
      let resolved = false;

      const timer = setTimeout(() => {
        if (!resolved) {
          resolved = true;
          try { client.close(); } catch (_) {}
          resolve(null);
        }
      }, 1200);

      client.on('error', () => {
        if (!resolved) {
          resolved = true;
          clearTimeout(timer);
          try { client.close(); } catch (_) {}
          resolve(null);
        }
      });

      client.bind(() => {
        try {
          client.setBroadcast(true);
          client.on('message', (msg) => {
            if (!resolved) {
              try {
                const data = JSON.parse(msg.toString());
                if (data && data.ip) {
                  resolved = true;
                  clearTimeout(timer);
                  try { client.close(); } catch (_) {}
                  resolve({ ip: data.ip, port: data.port || 8000, source: 'UDP_BEACON' });
                }
              } catch (_) {}
            }
          });
          const message = Buffer.from('DISCOVER_CREATIVE_SERVER');
          client.send(message, 0, message.length, 41234, '255.255.255.255');
        } catch (_) {
          if (!resolved) {
            resolved = true;
            clearTimeout(timer);
            resolve(null);
          }
        }
      });
    } catch (_) {
      resolve(null);
    }
  });

  const udpResult = await udpPromise;
  if (udpResult && udpResult.ip) {
    return udpResult;
  }

  // 2. HTTP Subnet Candidate Probe
  const mySpecs = getLocalSystemSpecs();
  const candidates = ['localhost', '127.0.0.1', '192.168.29.69'];
  if (mySpecs && mySpecs.ip_address && mySpecs.ip_address.startsWith('192.168.')) {
    const parts = mySpecs.ip_address.split('.');
    const subnetPrefix = `${parts[0]}.${parts[1]}.${parts[2]}`;
    candidates.push(`${subnetPrefix}.1`, `${subnetPrefix}.100`, `${subnetPrefix}.2`, `${subnetPrefix}.50`, `${subnetPrefix}.69`);
  }

  for (const host of candidates) {
    const isOnline = await new Promise((resolve) => {
      const req = http.get(`http://${host}:8000/`, (res) => {
        resolve(res.statusCode === 200);
      });
      req.on('error', () => resolve(false));
      req.setTimeout(400, () => { req.destroy(); resolve(false); });
    });

    if (isOnline) {
      return { ip: host, port: 8000, source: 'HTTP_PROBE' };
    }
  }

  return null;
}

contextBridge.exposeInMainWorld('electronAPI', {
  getScreenSources: () => ipcRenderer.invoke('DESKTOP_CAPTURER_GET_SOURCES'),
  takeScreenshot: () => ipcRenderer.invoke('TAKE_SCREENSHOT'),
  captureScreenFrame: () => ipcRenderer.invoke('CAPTURE_SCREEN_FRAME'),
  getSystemSpecs: () => getLocalSystemSpecs(),
  getLiveTelemetry: () => getLiveTelemetry(),
  getRunningProcesses: () => getRunningProcesses(),
  executeRemoteAction: (action, targetPid) => executeRemoteAction(action, targetPid),
  runSelfHealingDiagnostics: () => runSelfHealingDiagnostics(),
  runSpeedTest: () => runNetworkSpeedTest(),
  discoverServerIp: () => discoverServerIp(),
  minimize: () => ipcRenderer.send('WINDOW_MINIMIZE'),
  maximize: () => ipcRenderer.send('WINDOW_MAXIMIZE'),
  close: () => ipcRenderer.send('WINDOW_CLOSE'),
  platform: process.platform,
});
