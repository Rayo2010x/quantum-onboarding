const { execSync } = require('child_process');
const fs = require('fs');
try {
  console.log("BUILDING");
  const out = execSync('npm run build', { encoding: 'utf8', stdio: 'pipe' });
  fs.writeFileSync('build_output.txt', out);
} catch (e) {
  fs.writeFileSync('build_output.txt', (e.stdout || '') + '\n' + (e.stderr || ''));
}
