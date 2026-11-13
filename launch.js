import { spawn, execSync } from 'child_process';
import http from 'http';
import net from 'net';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('\x1b[36m%s\x1b[0m', '==========================================================');
console.log('\x1b[36m%s\x1b[0m', '   CREATIVE AI - IT MANAGEMENT & HELPDESK');
console.log('\x1b[36m%s\x1b[0m', '   Unified System Orchestrator (Backend + Desktop)');
console.log('\x1b[36m%s\x1b[0m', '==========================================================\n');

// 1. Verify Socket Port Connectivity
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

// 2. Poll HTTP endpoint
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

// Kill port occupant on Windows
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
        console.log(`\x1b[33mFreeing port ${port} (terminating stale PID ${pid})...\x1b[0m`);
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
  // Step 1: Check MySQL
  console.log('\x1b[33m%s\x1b[0m', '🔍 [1/3] Checking MySQL database connectivity...');
  const isMySQLUp = await checkPort('127.0.0.1', 3306);
  if (isMySQLUp) {
    console.log('\x1b[32m%s\x1b[0m', '✓ MySQL Server is ACTIVE on 127.0.0.1:3306 (Database: it_helpdesk_db)\n');
  } else {
    console.log('\x1b[31m%s\x1b[0m', '⚠️  Warning: MySQL not responding on port 3306. Check your MySQL service.');
  }

  // Step 2: FastAPI Backend
  console.log('\x1b[33m%s\x1b[0m', '🚀 [2/3] Starting FastAPI Backend Core (Port 8000)...');
  killPortOccupant(8000);
  await new Promise((r) => setTimeout(r, 800));

  let backendProcess = null;
  const pythonPath = process.platform === 'win32'
    ? path.join(__dirname, 'backend', '.venv', 'Scripts', 'python.exe')
    : path.join(__dirname, 'backend', '.venv', 'bin', 'python');

  backendProcess = spawn(
    pythonPath,
    ['-m', 'uvicorn', 'main:app', '--host', '0.0.0.0', '--port', '8000', '--reload'],
    {
      cwd: path.join(__dirname, 'backend'),
      shell: false,
      stdio: ['pipe', 'pipe', 'pipe']
    }
  );

  backendProcess.stdout.on('data', (data) => {
    const text = data.toString().trim();
    if (text) console.log('\x1b[35m[BACKEND]\x1b[0m', text);
  });

  backendProcess.stderr.on('data', (data) => {
    const text = data.toString().trim();
    if (text) console.log('\x1b[90m[BACKEND LOG]\x1b[0m', text);
  });

  try {
    await waitForBackend('http://127.0.0.1:8000/');
    console.log('\x1b[32m%s\x1b[0m', '✓ FastAPI Backend is LIVE at http://127.0.0.1:8000 (MySQL Connected)\n');
  } catch (err) {
    console.error('\x1b[31m%s\x1b[0m', 'Failed to connect to backend:', err.message);
  }

  // Step 3: Launch Desktop App (Electron)
  console.log('\x1b[33m%s\x1b[0m', '🖥️  [3/3] Launching Electron & React Desktop App (Creative AI)...');
  const npmCmd = process.platform === 'win32' ? 'npm.cmd' : 'npm';
  
  // Clean IDE terminal environment variables that interfere with Electron
  const desktopEnv = { ...process.env };
  delete desktopEnv.ELECTRON_RUN_AS_NODE;

  const desktopProcess = spawn(npmCmd, ['run', 'electron:dev'], {
    cwd: path.join(__dirname, 'desktop'),
    shell: true,
    env: desktopEnv,
    stdio: 'inherit'
  });

  // Handle Clean Shutdown
  const cleanExit = () => {
    console.log('\n\x1b[33m%s\x1b[0m', 'Shutting down Creative AI services cleanly...');
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

  desktopProcess.on('exit', (code) => {
    console.log(`Desktop window closed (code ${code}).`);
    cleanExit();
  });
}

main().catch(console.error);
