const { execSync } = require('child_process');
try {
  console.log('Adding files...');
  execSync('git add .', { stdio: 'inherit' });
  console.log('Committing...');
  execSync('git commit -m "fix: resolve TS JSX syntax error and Vercel build crashing"', { stdio: 'inherit' });
  console.log('Pushing...');
  execSync('git push', { stdio: 'inherit' });
  console.log('Push complete!');
} catch (e) {
  console.log('Error:', e.message);
}
