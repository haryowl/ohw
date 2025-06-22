# 🚀 Manual Git Setup Steps

## 🔧 Step-by-Step Commands

Since the scripts have syntax issues, let's do this manually. Run these commands one by one:

### Step 1: Find Git
```powershell
# Check if Git is in PATH
git --version
```

If that fails, try:
```powershell
# Use full path
"C:\Program Files\Git\bin\git.exe" --version
```

### Step 2: Configure Git User
```powershell
# If Git is in PATH
git config --global user.name "haryowl"
git config --global user.email "haryowl@example.com"

# Or with full path
"C:\Program Files\Git\bin\git.exe" config --global user.name "haryowl"
"C:\Program Files\Git\bin\git.exe" config --global user.email "haryowl@example.com"
```

### Step 3: Initialize Repository
```powershell
git init
# or
"C:\Program Files\Git\bin\git.exe" init
```

### Step 4: Remove Existing Remote
```powershell
git remote remove origin
# or
"C:\Program Files\Git\bin\git.exe" remote remove origin
```

### Step 5: Add All Files
```powershell
git add .
# or
"C:\Program Files\Git\bin\git.exe" add .
```

### Step 6: Make Initial Commit
```powershell
git commit -m "Initial commit: Galileosky Parser project"
# or
"C:\Program Files\Git\bin\git.exe" commit -m "Initial commit: Galileosky Parser project"
```

### Step 7: Create Main Branch
```powershell
git branch -M main
# or
"C:\Program Files\Git\bin\git.exe" branch -M main
```

### Step 8: Add Remote
```powershell
git remote add origin https://github.com/haryowl/galileosky-parser.git
# or
"C:\Program Files\Git\bin\git.exe" remote add origin https://github.com/haryowl/galileosky-parser.git
```

### Step 9: Push to GitHub
```powershell
git push -u origin main
# or
"C:\Program Files\Git\bin\git.exe" push -u origin main
```

## 🔐 Authentication

When prompted:
- **Username**: `haryowl`
- **Password**: Use a Personal Access Token (not your GitHub password)

### Create Personal Access Token:
1. Go to https://github.com/settings/tokens
2. Click "Generate new token (classic)"
3. Name: "Galileosky Parser"
4. Select scopes: `repo`
5. Click "Generate token"
6. Copy the token and use it as password

## ✅ Success Indicators

After successful push:
- ✅ Files appear in your GitHub repository
- ✅ No error messages
- ✅ Repository shows commits and files

## 🆘 If Commands Fail

If any command fails, try:
1. **Restart PowerShell** - Git might not be in PATH
2. **Use full path** - `"C:\Program Files\Git\bin\git.exe"`
3. **Check Git installation** - Download from https://git-scm.com/download/win

## 📞 Need Help?

- GitHub Help: https://help.github.com/
- Git Documentation: https://git-scm.com/doc 