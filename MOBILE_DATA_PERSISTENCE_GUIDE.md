# 📱 Mobile Data Persistence Guide

## 🚨 Problem: Data Loss on Device Restart

When mobile phones are powered off or restarted, the data log returns to 0 or becomes empty. This guide explains the data persistence mechanisms and how to prevent data loss.

## 🔍 Root Causes

### 1. **Browser Storage Limitations**
- **localStorage**: Limited to ~5-10MB, cleared on browser cache clear
- **sessionStorage**: Cleared when browser/tab is closed
- **IndexedDB**: More persistent but can be cleared by user

### 2. **File System Access**
- Mobile browsers have limited file system access
- Data stored in browser storage may not survive app updates
- Device storage policies can clear app data

### 3. **Service Worker Lifecycle**
- Service workers may be terminated on low memory
- Background sync may not complete before device restart

## 🛠️ Solutions Implemented

### 1. **Enhanced Mobile Peer Server (HTML)**
```javascript
// Multiple storage mechanisms
- localStorage (primary)
- sessionStorage (backup)
- IndexedDB (persistent backup)
- Automatic backup every 30 seconds
- Data recovery functions
```

### 2. **Enhanced Mobile Sync Service (Node.js)**
```javascript
// File-based persistence
- Main data file: mobile-sync-data/sync_data.json
- Backup directory: mobile-sync-backups/
- Automatic backups every 5 minutes
- Keep last 10 backups
- Data recovery from backups
```

### 3. **Enhanced Termux Backend**
```javascript
// Robust file persistence
- Main files: data/parsed_data.json, data/devices.json
- Backup directory: backups/
- Automatic backups before each save
- Keep last 5 backups
- Automatic recovery on startup
```

## 📋 Data Persistence Checklist

### ✅ Before Device Restart
1. **Check Data Status**
   - Verify records are saved in UI
   - Check backup creation timestamps
   - Export data as JSON backup

2. **Force Save**
   - Click "Refresh Data" button
   - Wait for auto-save (30 seconds)
   - Check activity log for save confirmations

3. **Create Manual Backup**
   - Use "Export Data" function
   - Save backup file to external storage
   - Note the timestamp

### ✅ After Device Restart
1. **Check Data Recovery**
   - Open mobile peer server
   - Check if data is automatically loaded
   - Look for recovery messages in log

2. **Manual Recovery if Needed**
   - Click "🔧 Recover Data" button
   - Click "📥 Restore Backup" button
   - Check activity log for recovery status

3. **Verify Data Integrity**
   - Check record count matches before restart
   - Verify device information is preserved
   - Test sync functionality

## 🔧 Troubleshooting Steps

### Step 1: Check Storage Status
```javascript
// In browser console
console.log('localStorage size:', JSON.stringify(localStorage).length);
console.log('sessionStorage size:', JSON.stringify(sessionStorage).length);
console.log('IndexedDB available:', !!window.indexedDB);
```

### Step 2: Force Data Recovery
1. Open mobile peer server
2. Click "🔧 Recover Data" button
3. Check activity log for recovery messages
4. If successful, data should be restored

### Step 3: Manual Backup Restoration
1. Click "📥 Restore Backup" button
2. Check if backup exists in localStorage
3. Verify data is restored correctly

### Step 4: Check File System (Termux)
```bash
# Check if data files exist
ls -la data/
ls -la backups/

# Check file sizes
du -h data/*.json
du -h backups/*.json

# Check file permissions
ls -la data/
ls -la backups/
```

## 🚀 Best Practices

### 1. **Regular Backups**
- Export data weekly
- Keep multiple backup copies
- Store backups in external storage

### 2. **Monitor Storage Usage**
- Check localStorage size regularly
- Monitor backup file sizes
- Clean up old backups when needed

### 3. **Test Recovery Procedures**
- Test data recovery after each major update
- Verify backup restoration works
- Document any issues found

### 4. **Use Multiple Storage Methods**
- Don't rely on single storage mechanism
- Use both browser and file storage
- Implement automatic fallback recovery

## 📊 Data Storage Locations

### Mobile Peer Server (HTML)
```
Browser Storage:
├── localStorage: galileosky_server_data
├── sessionStorage: galileosky_server_data (backup)
└── IndexedDB: GalileoskyData/serverData

Backup:
└── localStorage: galileosky_data_backup
```

### Mobile Sync Service (Node.js)
```
File System:
├── mobile-sync-data/
│   └── sync_data.json (main data)
└── mobile-sync-backups/
    ├── sync_data_backup_2025-01-XX-XX-XX-XXXZ.json
    ├── sync_data_backup_2025-01-XX-XX-XX-XXXZ.json
    └── ... (last 10 backups)
```

### Termux Backend
```
File System:
├── data/
│   ├── parsed_data.json (main data)
│   ├── devices.json (device info)
│   └── last_imei.json (last IMEI)
└── backups/
    ├── data_backup_2025-01-XX-XX-XX-XXXZ.json
    ├── data_backup_2025-01-XX-XX-XX-XXXZ.json
    └── ... (last 5 backups)
```

## 🔄 Recovery Procedures

### Automatic Recovery
1. **On Startup**: System automatically tries to load data
2. **Fallback Chain**: localStorage → sessionStorage → IndexedDB → file backup
3. **Error Handling**: If main file corrupted, load from backup
4. **Data Validation**: Verify data integrity before using

### Manual Recovery
1. **UI Recovery**: Use recovery buttons in mobile peer server
2. **API Recovery**: Call `/api/sync/recover` endpoint
3. **File Recovery**: Manually copy backup files
4. **Export/Import**: Use JSON export/import functions

## 📞 Support

If you continue to experience data loss:

1. **Check the activity log** for error messages
2. **Verify storage permissions** on your device
3. **Test with smaller datasets** to isolate the issue
4. **Report the issue** with detailed logs and device information

## 🔮 Future Improvements

- **Cloud Sync**: Implement cloud storage backup
- **Compression**: Compress data to fit more in storage
- **Incremental Backups**: Only backup changed data
- **Cross-Device Sync**: Sync data between multiple devices
- **Real-time Backup**: Continuous backup during operation

---

**Remember**: Always export your data before major updates or device restarts! 