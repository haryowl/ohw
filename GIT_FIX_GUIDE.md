# 🔧 Git Setup Fix Guide

## ❌ Problem
You're getting these errors:
- `error: src refspec main does not match any`
- `error: failed to push some refs to 'https://github.com//galileosky-parser.git'`

## 🔍 Root Causes
1. **Git not installed** or not in PATH
2. **No commits yet** (main branch doesn't exist)
3. **Wrong repository URL** (missing username)
4. **Repository doesn't exist** on GitHub

## 🚀 Quick Fix

### Option 1: Use the Fix Script
```cmd
fix-git-setup.bat
```

### Option 2: Manual Fix

#### Step 1: Install Git
1. Download: https://git-scm.com/download/win
2. Install with default settings
3. Restart your terminal

#### Step 2: Create GitHub Repository
1. Go to: https://github.com/new
2. Repository name: `galileosky-parser`
3. Description: `Galileosky Protocol Parser - IoT tracking and telemetry system`
4. Make it Public or Private
5. **Don't** initialize with README (we have one)
6. Click "Create repository"

#### Step 3: Fix Local Repository
```cmd
REM Check if Git is installed
git --version

REM Initialize repository (if needed)
git init

REM Add your GitHub username
set GITHUB_USERNAME=haryowl

REM Remove wrong remote
git remote remove origin

REM Add correct remote
git remote add origin https://github.com/%GITHUB_USERNAME%/galileosky-parser.git

REM Add all files
git add .

REM Make first commit
git commit -m "Initial commit: Galileosky Parser project"

REM Create main branch
git branch -M main

REM Push to GitHub
git push -u origin main
```

## 🔧 Alternative: Step-by-Step Commands

If you prefer to run commands manually:

```cmd
REM 1. Check Git installation
git --version

REM 2. Initialize repository
git init

REM 3. Configure Git (if first time)
git config --global user.name "Your Name"
git config --global user.email "your.email@example.com"

REM 4. Add remote (replace YOUR_USERNAME)
git remote add origin https://github.com/YOUR_USERNAME/galileosky-parser.git

REM 5. Add files
git add .

REM 6. Commit
git commit -m "Initial commit: Galileosky Parser project"

REM 7. Create main branch
git branch -M main

REM 8. Push
git push -u origin main
```

## 🔐 Authentication

If you get authentication errors:

### Option 1: Personal Access Token
1. Go to GitHub Settings → Developer settings → Personal access tokens
2. Generate new token
3. Use token as password when prompted

### Option 2: GitHub CLI
```cmd
REM Install GitHub CLI
winget install GitHub.cli

REM Login
gh auth login

REM Then push
git push -u origin main
```

## ✅ Verification

After successful push, verify:
```cmd
REM Check remote
git remote -v

REM Check status
git status

REM Check branches
git branch -a
```

## 🆘 Common Issues

### Issue: "Repository not found"
**Solution**: Create repository on GitHub first

### Issue: "Authentication failed"
**Solution**: Use Personal Access Token or GitHub CLI

### Issue: "Permission denied"
**Solution**: Check repository permissions on GitHub

### Issue: "Branch main not found"
**Solution**: Make sure you have at least one commit

## 📞 Need More Help?

- Check Git documentation: https://git-scm.com/doc
- GitHub help: https://help.github.com/
- Create an issue in your repository

---

**After fixing, your repository will be live at:**
`https://github.com/YOUR_USERNAME/galileosky-parser` 