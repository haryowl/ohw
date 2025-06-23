# Android Shortcut Setup for Galileosky Server

This guide shows you how to create shortcuts on your Android home screen to start, stop, and check the status of your Galileosky server running in Termux.

## 📱 Method 1: Termux Widget (Recommended)

### Step 1: Install Termux Widget
1. Open **Google Play Store**
2. Search for **"Termux:Widget"**
3. Install the app

### Step 2: Create Shortcut Scripts
1. Open **Termux**
2. Create the shortcuts directory:
   ```bash
   mkdir -p ~/.shortcuts
   ```

3. Copy the widget scripts to Termux:
   ```bash
   # Copy from your project directory
   cp termux-widget-start-server.sh ~/.shortcuts/
   cp termux-widget-stop-server.sh ~/.shortcuts/
   cp termux-widget-status.sh ~/.shortcuts/
   ```

4. Make scripts executable:
   ```bash
   chmod +x ~/.shortcuts/termux-widget-*.sh
   ```

### Step 3: Add Widgets to Home Screen
1. Long press on your **Android home screen**
2. Select **"Widgets"**
3. Find **"Termux:Widget"** in the widget list
4. Drag it to your home screen
5. Select the script you want to run:
   - `termux-widget-start-server.sh` - Start server
   - `termux-widget-stop-server.sh` - Stop server
   - `termux-widget-status.sh` - Check status

## 🔗 Method 2: Direct App Shortcut

### Step 1: Create Shortcut Script
```bash
# In Termux, create a simple launcher
echo '#!/data/data/com.termux/files/usr/bin/bash
cd ~/gali-parse
node termux-enhanced-backend.js' > ~/start-server.sh

chmod +x ~/start-server.sh
```

### Step 2: Use Android Shortcut Apps
1. Install **"Shortcut Maker"** from Play Store
2. Create new shortcut
3. Select **"Script"** or **"Terminal"**
4. Point to: `/data/data/com.termux/files/usr/bin/bash ~/start-server.sh`

## 🎯 Method 3: Tasker Integration (Advanced)

### Step 1: Install Tasker
1. Install **Tasker** from Play Store
2. Grant necessary permissions

### Step 2: Create Task
1. Create new **Task**
2. Add **Action** → **App** → **Launch App**
3. Select **Termux**
4. Add **Action** → **Input** → **Text**
5. Enter: `cd ~/gali-parse && node termux-enhanced-backend.js`

### Step 3: Create Shortcut
1. Long press home screen
2. Add **Tasker** widget
3. Select your task

## 📋 Method 4: Quick Settings Tile

### Step 1: Create Notification Script
```bash
# Create a script that shows notification
echo '#!/data/data/com.termux/files/usr/bin/bash
cd ~/gali-parse
termux-notification --title "Galileosky Server" --content "Starting server..." --ongoing
node termux-enhanced-backend.js' > ~/start-with-notification.sh

chmod +x ~/start-with-notification.sh
```

### Step 2: Add to Quick Settings
1. Pull down notification panel
2. Edit quick settings
3. Add custom tile (if supported by your ROM)

## 🔧 Troubleshooting

### Script Not Working
1. Check file permissions: `ls -la ~/.shortcuts/`
2. Test manually: `bash ~/.shortcuts/termux-widget-start-server.sh`
3. Check Termux logs: `termux-logcat`

### Server Won't Start
1. Check if port is in use: `netstat -tlnp | grep 3001`
2. Kill existing processes: `pkill -f node`
3. Check project directory: `ls -la ~/gali-parse/`

### Widget Not Appearing
1. Restart Termux
2. Check Termux:Widget app permissions
3. Reinstall Termux:Widget

## 📱 Recommended Setup

### For Daily Use:
1. **Start Server Widget** - Main shortcut
2. **Status Widget** - Quick check
3. **Stop Server Widget** - When needed

### Widget Placement:
- Place **Start** widget prominently
- Place **Status** widget nearby
- Place **Stop** widget in a folder or secondary screen

## 🎨 Customization

### Custom Icons:
1. Use **"Icon Pack Studio"** to create custom icons
2. Apply to your shortcuts
3. Use Galileosky-themed colors

### Custom Names:
- "🚀 Start Galileosky"
- "📊 Server Status"
- "⏹️ Stop Server"

## 🔒 Security Notes

- Scripts run with your user permissions
- Keep scripts in `~/.shortcuts/` directory
- Don't share scripts with sensitive information
- Consider using environment variables for paths

## 📞 Support

If you encounter issues:
1. Check Termux logs
2. Verify script paths
3. Test commands manually
4. Check Android permissions

---

**Happy shortcutting! 🎯** 