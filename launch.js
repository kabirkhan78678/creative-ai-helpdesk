import { spawn, execSync } from 'child_process';
import http from 'http';
import net from 'net';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ANSI Styling Helpers
const C = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  gray: '\x1b[90m',
  cyan: '\x1b[36m',
  brightCyan: '\x1b[96m',
  green: '\x1b[32m',
  brightGreen: '\x1b[92m',
  yellow: '\x1b[33m',
  brightYellow: '\x1b[93m',
  magenta: '\x1b[35m',
  brightMagenta: '\x1b[95m',
  blue: '\x1b[34m',
  brightBlue: '\x1b[94m',
  red: '\x1b[31m',
  brightRed: '\x1b[91m',
  white: '\x1b[37m',
  brightWhite: '\x1b[97m',
};

function getTimestamp() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `${C.gray}[${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}]${C.reset}`;
}

// Line buffer to prevent fragmented chunk logging
function createLineStream(onLine) {
  let buffer = '';
  return (chunk) => {
    buffer += chunk.toString();
    const lines = buffer.split(/\r?\n/);
    buffer = lines.pop(); // keep last incomplete line in buffer
    for (const line of lines) {
      if (line.trim().length > 0) {
        onLine(line.trim());
      }
    }
  };
}

// Patterns to completely silence from console
const NOISE_FILTERS = [
  /Will watch for changes/i,
  /Uvicorn running on/i,
  /Started reloader process/i,
  /Started server process/i,
  /Waiting for application startup/i,
  /Application startup complete/i,
  /Press CTRL\+C to quit/i,
  /Initializing database schema/i,
  /UDP Discovery Beacon ACTIVE/i,
  /connection open/i,
  /connection closed/i,
  /WebSocket \/ws.*\[accepted\]/i,
  /"OPTIONS /i,
  /"GET \/ HTTP/i,
  /"HEAD \/ HTTP/i,
  /"GET \/api\/v1\//i,
  /"POST \/api\/v1\/(devices\/telemetry|devices\/auto-enroll|announcements)/i,
  /"OPTIONS \/api\/v1\//i,
  /"POST \/api\/v1\/auth\/login HTTP/i,
  /gpu_init\.cc/i,
  /gl_surface/i,
  /passthrough_program_cache/i,
  /Autofill\.enable/i,
  /DevTools listening/i,
  /Electron security warning/i,
  /electron:dev/i,
  /> electron electron\/main\.cjs/i,
  /> cyberdesk-it-management/i
];

function shouldFilter(line) {
  return NOISE_FILTERS.some((regex) => regex.test(line));
}

// Beautiful Log Formatter
function formatLogLine(rawLine) {
  if (shouldFilter(rawLine)) return null;

  const line = rawLine.trim();

  // 1. WebSocket Client Connected
  const connectMatch = line.match(/Client connected:\s*User\s*(\d+)\s*\(Role:\s*([^)]+)\)\.\s*Total active users:\s*(\d+)/i);
  if (connectMatch) {
    const [, userId, role, count] = connectMatch;
    const roleColor = role.toUpperCase() === 'ADMIN' ? C.brightMagenta : C.brightCyan;
    return `${getTimestamp()} ${C.brightGreen}🟢 [ONLINE]     ${C.reset}${roleColor}${role.toUpperCase()}${C.reset} connected (User #${userId}) • Active: ${C.bold}${count}${C.reset}`;
  }

  // 2. WebSocket Client Disconnected
  const disconnectMatch = line.match(/Client disconnected:\s*User\s*(\d+)\.\s*Active users:\s*(\d+)/i);
  if (disconnectMatch) {
    const [, userId, count] = disconnectMatch;
    return `${getTimestamp()} ${C.gray}⚪ [OFFLINE]    ${C.reset}User #${userId} disconnected • Active: ${C.bold}${count}${C.reset}`;
  }

  // 3. User Login
  const loginMatch = line.match(/User login successful:\s*(.*?)\s*\((.*?)\)\s*\[Role:\s*(.*?)\]/i);
  if (loginMatch) {
    const [, name, email, role] = loginMatch;
    return `${getTimestamp()} ${C.cyan}🔐 [AUTH]       ${C.reset}User Login: ${C.bold}${name}${C.reset} (${email}) [${C.yellow}${role}${C.reset}]`;
  }

  // 4. User Registration / Creation
  const regMatch = line.match(/New user registered:\s*(.*)/i);
  if (regMatch) {
    return `${getTimestamp()} ${C.cyan}👤 [ACCOUNTS]   ${C.reset}New User Created: ${C.bold}${regMatch[1]}${C.reset}`;
  }

  // 5. User Deleted
  const delMatch = line.match(/User #(\d+) \(([^)]+)\) deleted/i);
  if (delMatch) {
    return `${getTimestamp()} ${C.red}🗑️  [ACCOUNTS]   ${C.reset}Employee Removed: User #${delMatch[1]} (${delMatch[2]})`;
  }

  // 6. Workstation Enrolled
  const enrollMatch = line.match(/Workstation enrolled:\s*'([^']+)'\s*\(([^)]+)\)\s*bound to User ID:\s*(.*)/i);
  if (enrollMatch) {
    const [, host, ip, uid] = enrollMatch;
    const userStr = uid && uid !== 'None' ? `User #${uid}` : 'Unassigned';
    return `${getTimestamp()} ${C.brightMagenta}💻 [FLEET]      ${C.reset}Workstation Synced: ${C.bold}${host}${C.reset} (${ip}) → ${userStr}`;
  }

  // 7. Helpdesk Tickets
  const ticketNewMatch = line.match(/New ticket #([^\s]+) created:\s*'([^']+)'\s*by User ID:\s*(\d+)/i);
  if (ticketNewMatch) {
    const [, tckNum, title, uid] = ticketNewMatch;
    return `${getTimestamp()} ${C.brightCyan}🎫 [HELPDESK]   ${C.reset}New Ticket ${C.bold}#${tckNum}${C.reset}: '${title}' (User #${uid})`;
  }

  const ticketUpMatch = line.match(/Ticket #([^\s]+) updated:\s*(.*)/i);
  if (ticketUpMatch) {
    return `${getTimestamp()} ${C.brightCyan}🎫 [HELPDESK]   ${C.reset}Ticket ${C.bold}#${ticketUpMatch[1]}${C.reset} updated: ${ticketUpMatch[2]}`;
  }

  // 8. Remote Assistance Sessions & Actions
  const remReqMatch = line.match(/Remote session requested:\s*Code=([^\s]+)\s*Target=([^\s]+)\s*by Admin ID=(\d+)/i);
  if (remReqMatch) {
    const [, code, target, adminId] = remReqMatch;
    return `${getTimestamp()} ${C.magenta}🖥️  [REMOTE]     ${C.reset}Assistance Requested: Code ${C.bold}${code}${C.reset} for '${target}' (Admin #${adminId})`;
  }

  const remRespMatch = line.match(/Remote session #(\d+) response:\s*(APPROVED|DENIED)/i);
  if (remRespMatch) {
    const [, sessId, status] = remRespMatch;
    const color = status.toUpperCase() === 'APPROVED' ? C.brightGreen : C.brightRed;
    return `${getTimestamp()} ${C.magenta}🖥️  [REMOTE]     ${C.reset}Session #${sessId} was ${color}${C.bold}${status}${C.reset} by employee`;
  }

  const remStopMatch = line.match(/Remote session #(\d+) STOPPED/i);
  if (remStopMatch) {
    return `${getTimestamp()} ${C.magenta}🖥️  [REMOTE]     ${C.reset}Remote Session #${remStopMatch[1]} ${C.yellow}ENDED${C.reset}`;
  }

  const remActionMatch = line.match(/Remote action requested:\s*([^\s]+)\s*on target PC:\s*(.*)/i);
  if (remActionMatch) {
    return `${getTimestamp()} ${C.yellow}⚡ [ACTION]     ${C.reset}Remote Action ${C.bold}${remActionMatch[1]}${C.reset} dispatched to ${remActionMatch[2]}`;
  }

  // 9. LAN Auto-Discovery
  const probeMatch = line.match(/Answered auto-discovery probe from\s*([^\s]+)/i);
  if (probeMatch) {
    return `${getTimestamp()} ${C.brightYellow}📡 [DISCOVERY]  ${C.reset}Answered LAN discovery probe from ${C.bold}${probeMatch[1]}${C.reset}`;
  }

  // 10. Announcements
  const annMatch = line.match(/Company announcement broadcasted:\s*'([^']+)'/i);
  if (annMatch) {
    return `${getTimestamp()} ${C.brightYellow}📢 [BROADCAST]  ${C.reset}Company Announcement: ${C.bold}'${annMatch[1]}'${C.reset}`;
  }

  // 11. Errors and Warnings
  if (/ERROR:/i.test(line) || /Traceback/i.test(line)) {
    const cleanMsg = line.replace(/^(?:ERROR:[^:]*:|ERROR:\s*)/i, '').trim();
    return `${getTimestamp()} ${C.brightRed}❌ [ERROR]      ${C.reset}${cleanMsg}`;
  }

  if (/WARNING:/i.test(line)) {
    const cleanMsg = line.replace(/^(?:WARNING:[^:]*:|WARNING:\s*)/i, '').trim();
    return `${getTimestamp()} ${C.brightYellow}⚠️  [WARNING]    ${C.reset}${cleanMsg}`;
  }

  // 12. Fallback for clean application info messages
  const cleanMsg = line
    .replace(/^INFO:[^:]*:/i, '')
    .replace(/^INFO:\s*/i, '')
    .trim();

  if (cleanMsg.length > 0) {
    return `${getTimestamp()} ${C.brightBlue}ℹ️  [SYSTEM]     ${C.reset}${cleanMsg}`;
  }

  return null;
}

// Port Connectivity Check
function checkPort(host, port, timeoutMs = 1500) {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    socket.setTimeout(timeoutMs);
    socket.on('connect', () => {
      socket.destroy();
      resolve(true);
    });
    socket.on('error', () => {
      socket.destroy();
      resolve(false);
    });
    socket.on('timeout', () => {
      socket.destroy();
      resolve(false);
    });
    socket.connect(port, host);
  });
}

// HTTP Health Check
function checkHttpEndpoint(url, timeoutMs = 1500) {
  return new Promise((resolve) => {
    const req = http.get(url, (res) => {
      resolve(res.statusCode === 200);
    });
    req.on('error', () => resolve(false));
    req.setTimeout(timeoutMs, () => {
      req.destroy();
      resolve(false);
    });
  });
}

// Kill port occupant cleanly on Windows
function killPortOccupant(port) {
  if (process.platform !== 'win32') return;
  try {
    const stdout = execSync(`netstat -ano | findstr :${port}`, { encoding: 'utf8' });
    const lines = stdout.trim().split('\n');
    for (const line of lines) {
      const parts = line.trim().split(/\s+/);
      const state = parts[3];
      const pid = parts[parts.length - 1];
      if (state === 'LISTENING' && pid && pid !== '0' && pid !== `${process.pid}`) {
        try {
          execSync(`taskkill /F /PID ${pid} 2>nul`);
        } catch (_) {}
      }
    }
  } catch (_) {}
}

async function waitForBackend(url, timeoutMs = 25000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const isUp = await checkHttpEndpoint(url, 1000);
    if (isUp) return true;
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error('Backend startup timed out.');
}

async function main() {
  console.clear();

  // Print Futuristic Banner
  console.log(`${C.cyan}╔══════════════════════════════════════════════════════════════════════════════╗${C.reset}`);
  console.log(`${C.cyan}║                                                                              ║${C.reset}`);
  console.log(`${C.cyan}║   ${C.brightWhite}${C.bold}⚡ CREATIVE AI  •  IT MANAGEMENT & HELPDESK SUITE${C.reset}${C.cyan}                          ║${C.reset}`);
  console.log(`${C.cyan}║      ${C.gray}Unified Enterprise Orchestrator (Backend Core + Desktop Client)${C.reset}${C.cyan}         ║${C.reset}`);
  console.log(`${C.cyan}║                                                                              ║${C.reset}`);
  console.log(`${C.cyan}╚══════════════════════════════════════════════════════════════════════════════╝${C.reset}\n`);

  // Step 1: Verify MySQL Database Connectivity
  process.stdout.write(`  ${C.cyan}[1/3]${C.reset} 🗄️  Checking MySQL Database (Port 3306)... `);
  const isMySQLUp = await checkPort('127.0.0.1', 3306);
  if (isMySQLUp) {
    console.log(`${C.brightGreen}${C.bold}ACTIVE${C.reset} ${C.gray}(127.0.0.1:3306 / it_helpdesk_db)${C.reset}`);
  } else {
    console.log(`${C.brightYellow}${C.bold}OFFLINE / UNREACHABLE${C.reset}`);
    console.log(`        ${C.yellow}⚠️  Please ensure MySQL service is running on port 3306.${C.reset}`);
  }

  // Step 2: Initialize & Launch FastAPI Backend
  process.stdout.write(`  ${C.cyan}[2/3]${C.reset} 🚀 Starting FastAPI Engine Core (Port 8000)... `);
  killPortOccupant(8000);
  await new Promise((r) => setTimeout(r, 600));

  let backendProcess = null;
  const pythonPath = process.platform === 'win32'
    ? path.join(__dirname, 'backend', '.venv', 'Scripts', 'python.exe')
    : path.join(__dirname, 'backend', '.venv', 'bin', 'python');

  // Spawn uvicorn with --no-access-log to prevent repetitive raw HTTP spam
  backendProcess = spawn(
    pythonPath,
    ['-m', 'uvicorn', 'main:app', '--host', '0.0.0.0', '--port', '8000', '--reload', '--no-access-log'],
    {
      cwd: path.join(__dirname, 'backend'),
      shell: false,
      stdio: ['pipe', 'pipe', 'pipe']
    }
  );

  const streamHandler = (line) => {
    const formatted = formatLogLine(line);
    if (formatted) console.log(formatted);
  };

  const lineStreamOut = createLineStream(streamHandler);
  const lineStreamErr = createLineStream(streamHandler);

  backendProcess.stdout.on('data', lineStreamOut);
  backendProcess.stderr.on('data', lineStreamErr);

  try {
    await waitForBackend('http://127.0.0.1:8000/');
    console.log(`${C.brightGreen}${C.bold}LIVE & READY${C.reset} ${C.gray}(http://0.0.0.0:8000)${C.reset}`);
    console.log(`        ${C.cyan}📡 UDP Auto-Beacon  ::${C.reset} ${C.brightGreen}ACTIVE${C.reset} ${C.gray}(Port 41234 - Zero-Config LAN)${C.reset}`);
    console.log(`        ${C.cyan}🔄 WebSocket Relay  ::${C.reset} ${C.brightGreen}ACTIVE${C.reset} ${C.gray}(ws://0.0.0.0:8000/ws)${C.reset}`);
  } catch (err) {
    console.log(`${C.brightRed}${C.bold}FAILED${C.reset} (${err.message})`);
  }

  // Step 3: Launch Creative AI Desktop GUI (Electron)
  process.stdout.write(`  ${C.cyan}[3/3]${C.reset} 🖥️  Launching Creative AI Desktop App... `);
  
  const electronBin = process.platform === 'win32'
    ? path.join(__dirname, 'desktop', 'node_modules', 'electron', 'dist', 'electron.exe')
    : path.join(__dirname, 'desktop', 'node_modules', '.bin', 'electron');

  const desktopEnv = { ...process.env };
  delete desktopEnv.ELECTRON_RUN_AS_NODE;

  let desktopProcess = null;
  if (fs.existsSync(electronBin)) {
    desktopProcess = spawn(electronBin, ['electron/main.cjs'], {
      cwd: path.join(__dirname, 'desktop'),
      shell: false,
      env: desktopEnv,
      stdio: ['pipe', 'pipe', 'pipe']
    });
  } else {
    const npmCmd = process.platform === 'win32' ? 'npm.cmd' : 'npm';
    desktopProcess = spawn(npmCmd, ['run', 'electron:dev'], {
      cwd: path.join(__dirname, 'desktop'),
      shell: true,
      env: desktopEnv,
      stdio: ['pipe', 'pipe', 'pipe']
    });
  }

  console.log(`${C.brightGreen}${C.bold}RUNNING${C.reset}\n`);

  desktopProcess.stdout.on('data', lineStreamOut);
  desktopProcess.stderr.on('data', lineStreamErr);

  // Live Activity Stream Section
  console.log(`${C.gray}──────────────────────────────────────────────────────────────────────────────${C.reset}`);
  console.log(`                   ${C.brightCyan}${C.bold}📊 REAL-TIME ACTIVITY & SYSTEM LOGS${C.reset}`);
  console.log(`${C.gray}──────────────────────────────────────────────────────────────────────────────${C.reset}`);

  // Clean Exit Management
  let isShuttingDown = false;
  const cleanExit = () => {
    if (isShuttingDown) return;
    isShuttingDown = true;
    console.log(`\n${getTimestamp()} ${C.yellow}ℹ️  [SYSTEM]     Shutting down Creative AI services cleanly...${C.reset}`);
    
    if (backendProcess && backendProcess.pid) {
      try {
        if (process.platform === 'win32') {
          execSync(`taskkill /F /T /PID ${backendProcess.pid} 2>nul`);
        } else {
          backendProcess.kill('SIGTERM');
        }
      } catch (_) {}
    }
    if (desktopProcess && desktopProcess.pid) {
      try {
        if (process.platform === 'win32') {
          execSync(`taskkill /F /T /PID ${desktopProcess.pid} 2>nul`);
        } else {
          desktopProcess.kill('SIGTERM');
        }
      } catch (_) {}
    }
    process.exit(0);
  };

  process.on('SIGINT', cleanExit);
  process.on('SIGTERM', cleanExit);

  desktopProcess.on('exit', () => {
    console.log(`${getTimestamp()} ${C.gray}ℹ️  [SYSTEM]     Creative AI Desktop window closed.${C.reset}`);
    cleanExit();
  });
}

main().catch(console.error);
