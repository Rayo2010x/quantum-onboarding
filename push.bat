@echo off
echo Configuring git identity...
git config --global user.email "rafael_cuculiza@hotmail.com"
git config --global user.name "Rayo2010x"

echo Resetting added files to respect gitignore...
git reset

echo Adding files again...
git add .

echo Executing git commit...
git commit -m "feat: educational content overhaul on PQ-security and LN role"

echo Pushing to GitHub...
git branch -M main
git push -u origin main
echo Done.
