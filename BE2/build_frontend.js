const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const frontendDir = path.join(__dirname, '../frontend');
const publicDir = path.join(__dirname, 'public');

console.log('Building frontend...');
try {
  // Install frontend dependencies
  console.log('Running npm install in frontend...');
  execSync('npm install', { cwd: frontendDir, stdio: 'inherit' });

  // Build frontend
  console.log('Running npm run build in frontend...');
  execSync('npm run build', { cwd: frontendDir, stdio: 'inherit' });

  // Copy dist to public
  console.log('Copying frontend/dist to BE2/public...');
  if (fs.existsSync(publicDir)) {
    fs.rmSync(publicDir, { recursive: true, force: true });
  }
  fs.cpSync(path.join(frontendDir, 'dist'), publicDir, { recursive: true });
  console.log('Frontend build and copy complete!');
} catch (error) {
  console.error('Error building frontend:', error);
  process.exit(1);
}
