# 🚀 Quick Fix Commands

## 🔧 Current Issues
1. Git user not configured
2. Remote already exists
3. No commit made (no main branch)

## ⚡ Run These Commands

```cmd
REM 1. Configure Git user (replace with your info)
git config --global user.name "Haryo"
git config --global user.email "haryo@example.com"

REM 2. Remove existing remote
git remote remove origin

REM 3. Add all files
git add .

REM 4. Make initial commit
git commit -m "Initial commit: Galileosky Parser project"

REM 5. Create main branch
git branch -M main

REM 6. Add remote
git remote add origin https://github.com/haryowl/galileosky-parser.git

REM 7. Push to GitHub
git push -u origin main
```

## 🎯 Or Use the Script

```cmd
complete-fix.bat
```

## 🔍 What Each Command Does

1. **`git config`** - Sets your name and email for commits
2. **`git remote remove origin`** - Removes the existing remote
3. **`git add .`** - Stages all files for commit
4. **`git commit`** - Creates the first commit (creates the branch)
5. **`git branch -M main`** - Renames branch to main
6. **`git remote add origin`** - Adds the GitHub repository
7. **`git push -u origin main`** - Pushes to GitHub

## ⚠️ Important

**Make sure you create the repository on GitHub first:**
1. Go to https://github.com/new
2. Repository name: `galileosky-parser`
3. Description: `Galileosky Protocol Parser - IoT tracking and telemetry system`
4. Make it Public or Private
5. **Don't** initialize with README
6. Click "Create repository"

## 🔐 Authentication

If you get authentication errors, you'll need to:
1. Go to GitHub Settings → Developer settings → Personal access tokens
2. Generate new token
3. Use the token as password when prompted 