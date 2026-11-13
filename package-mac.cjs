const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const stagingDir = path.join(__dirname, 'mac-staging');
if (fs.existsSync(stagingDir)) {
  fs.rmSync(stagingDir, { recursive: true, force: true });
}
fs.mkdirSync(stagingDir, { recursive: true });

// Copy root files
['README-MAC.md', 'run-mac.sh', 'build-mac-dmg.sh'].forEach(f => {
  fs.copyFileSync(path.join(__dirname, f), path.join(stagingDir, f));
});

// Copy desktop files without node_modules, release, .git
const desktopStaging = path.join(stagingDir, 'desktop');
fs.mkdirSync(desktopStaging, { recursive: true });

function copyDir(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  const entries = fs.readdirSync(src, { withFileTypes: true });
  for (const entry of entries) {
    if (['node_modules', 'release', '.git', '.cache'].includes(entry.name)) continue;
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDir(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

copyDir(path.join(__dirname, 'desktop'), desktopStaging);

console.log('Staging complete! Compressing to Creative-AI-Helpdesk-Mac.zip...');

const zipPath = path.join(__dirname, 'Creative-AI-Helpdesk-Mac.zip');
if (fs.existsSync(zipPath)) fs.unlinkSync(zipPath);

execSync(`powershell -NoProfile -Command "Compress-Archive -Path 'mac-staging/*' -DestinationPath 'Creative-AI-Helpdesk-Mac.zip' -Force"`, { stdio: 'inherit' });

fs.rmSync(stagingDir, { recursive: true, force: true });
console.log('Creative-AI-Helpdesk-Mac.zip created successfully!');
