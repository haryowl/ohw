# 🔐 GitHub Authentication Guide

## 🚀 Quick Fix Script

Run this script to handle Git path and configuration:
```cmd
fix-git-path.bat
```

## 🔍 If Push Still Fails

The most common reason for push failure is **authentication**. Here are the solutions:

## 🔑 Option 1: Personal Access Token (Recommended)

### Step 1: Create Token
1. Go to GitHub: https://github.com/settings/tokens
2. Click "Generate new token (classic)"
3. Give it a name: "Galileosky Parser"
4. Select scopes:
   - ✅ `repo` (Full control of private repositories)
   - ✅ `workflow` (Update GitHub Action workflows)
5. Click "Generate token"
6. **Copy the token** (you won't see it again!)

### Step 2: Use Token
When prompted for password, use the token instead of your GitHub password.

## 🔑 Option 2: GitHub CLI (Easiest)

### Step 1: Install GitHub CLI
```cmd
winget install GitHub.cli
```

### Step 2: Login
```cmd
gh auth login
```
Follow the prompts to authenticate.

### Step 3: Push
```cmd
git push -u origin main
```

## 🔑 Option 3: SSH Keys

### Step 1: Generate SSH Key
```cmd
ssh-keygen -t ed25519 -C "your_email@example.com"
```

### Step 2: Add to GitHub
1. Copy the public key: `type %USERPROFILE%\.ssh\id_ed25519.pub`
2. Go to GitHub Settings → SSH and GPG keys
3. Click "New SSH key"
4. Paste the key and save

### Step 3: Use SSH URL
```cmd
git remote set-url origin git@github.com:haryowl/galileosky-parser.git
git push -u origin main
```

## 🔧 Manual Commands (If Script Fails)

If the script doesn't work, run these manually:

```cmd
REM Find Git (replace with your Git path)
"C:\Program Files\Git\bin\git.exe" config --global user.name "Haryo"
"C:\Program Files\Git\bin\git.exe" config --global user.email "haryo@example.com"

REM Initialize and commit
"C:\Program Files\Git\bin\git.exe" init
"C:\Program Files\Git\bin\git.exe" add .
"C:\Program Files\Git\bin\git.exe" commit -m "Initial commit: Galileosky Parser project"
"C:\Program Files\Git\bin\git.exe" branch -M main

REM Add remote and push
"C:\Program Files\Git\bin\git.exe" remote add origin https://github.com/haryowl/galileosky-parser.git
"C:\Program Files\Git\bin\git.exe" push -u origin main
```

## 🆘 Common Issues

### Issue: "Authentication failed"
**Solution**: Use Personal Access Token instead of password

### Issue: "Repository not found"
**Solution**: Make sure repository exists at https://github.com/haryowl/galileosky-parser

### Issue: "Permission denied"
**Solution**: Check if you have write access to the repository

### Issue: "Git not found"
**Solution**: Install Git from https://git-scm.com/download/win

## ✅ Success Indicators

After successful push, you should see:
- ✅ Files appear in your GitHub repository
- ✅ No error messages
- ✅ Repository shows commits and files

## 📞 Need Help?

- GitHub Help: https://help.github.com/
- Git Documentation: https://git-scm.com/doc
- Create an issue in your repository 