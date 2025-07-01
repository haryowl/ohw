# 📱 OHW Parser - PWA (Progressive Web App) Setup Guide

## 🎯 Overview

This guide shows you how to set up the OHW parser as a Progressive Web App (PWA) that can be installed on your mobile device like a native app.

## ✨ PWA Benefits

- **No installation required** - Works in any modern browser
- **App-like experience** - Can be installed on home screen
- **Offline capability** - Works without internet connection
- **Automatic updates** - Always uses the latest version
- **Cross-platform** - Works on Android, iOS, and desktop

---

## 🚀 Quick Start

### Option 1: Use Existing PWA (Recommended)

1. **Open your browser** and go to:
   ```
   https://haryowl.github.io/ohw/
   ```

2. **Install the PWA**:
   - Look for the **"Install"** prompt
   - Or tap the **menu** → **"Add to Home Screen"**
   - Or tap the **share** button → **"Add to Home Screen"**

3. **Configure backend connection**:
   - Open the PWA
   - Go to **Settings**
   - Enter your backend server URL
   - Test the connection

### Option 2: Self-Hosted PWA

1. **Clone the repository**:
   ```bash
   git clone https://github.com/haryowl/ohw.git
   cd ohw
   ```

2. **Build the PWA**:
   ```bash
   cd frontend
   npm install
   npm run build
   ```

3. **Serve the PWA**:
   ```bash
   # Using Python
   python -m http.server 8080
   
   # Using Node.js
   npx serve -s build -l 8080
   
   # Using PHP
   php -S localhost:8080
   ```

4. **Access and install**:
   ```
   http://localhost:8080
   ```

---

## 📱 Installation on Different Devices

### Android (Chrome)
1. **Open Chrome** and navigate to the PWA
2. **Tap the menu** (three dots)
3. **Select "Add to Home Screen"**
4. **Choose app name** and tap "Add"

### Android (Firefox)
1. **Open Firefox** and navigate to the PWA
2. **Tap the menu** (three dots)
3. **Select "Install App"**
4. **Confirm installation**

### Android (Samsung Internet)
1. **Open Samsung Internet** and navigate to the PWA
2. **Tap the menu** (three dots)
3. **Select "Add page to"** → **"Home screen"**
4. **Confirm installation**

### iOS (Safari)
1. **Open Safari** and navigate to the PWA
2. **Tap the share button** (square with arrow)
3. **Select "Add to Home Screen"**
4. **Choose app name** and tap "Add"

---

## 🔧 PWA Configuration

### Manifest File
The PWA uses a `manifest.json` file for configuration:

```json
{
  "name": "OHW Parser",
  "short_name": "OHW",
  "description": "Galileosky Parser for IoT tracking",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#ffffff",
  "theme_color": "#2196f3",
  "icons": [
    {
      "src": "icon-192.png",
      "sizes": "192x192",
      "type": "image/png"
    },
    {
      "src": "icon-512.png",
      "sizes": "512x512",
      "type": "image/png"
    }
  ]
}
```

### Service Worker
The PWA includes a service worker for offline functionality:

```javascript
// sw.js
const CACHE_NAME = 'ohw-parser-v1';
const urlsToCache = [
  '/',
  '/static/js/bundle.js',
  '/static/css/main.css',
  '/manifest.json'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(urlsToCache))
  );
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => response || fetch(event.request))
  );
});
```

---

## 🌐 Backend Connection Setup

### Local Backend (Termux)
If you're running the backend on your phone with Termux:

1. **Start the backend**:
   ```bash
   cd ~/ohw
   ~/galileosky-start.sh
   ```

2. **Get your phone's IP address**:
   ```bash
   ip route get 1 | awk '{print $7; exit}'
   ```

3. **Configure PWA**:
   - Open PWA settings
   - Set backend URL to: `http://YOUR_IP:3001`
   - Test connection

### Remote Backend (Cloud)
If you're using a cloud-hosted backend:

1. **Deploy to cloud** (Heroku, Vercel, etc.)
2. **Get your app URL**:
   ```
   https://your-ohw-app.herokuapp.com
   ```

3. **Configure PWA**:
   - Open PWA settings
   - Set backend URL to your cloud app URL
   - Test connection

### No Backend (Offline Mode)
The PWA can work offline with cached data:

1. **Enable offline mode** in PWA settings
2. **Data will be cached** locally
3. **Sync when online** to update data

---

## 📊 PWA Features

### Available Features
- ✅ **Real-time data display**
- ✅ **Device management**
- ✅ **Data export (CSV)**
- ✅ **Map visualization**
- ✅ **Offline data viewing**
- ✅ **Push notifications** (if configured)

### Limitations
- ❌ **No direct device communication** (requires backend)
- ❌ **Limited file system access**
- ❌ **Browser storage limitations**
- ❌ **No background processing**

---

## 🔧 Advanced Configuration

### Custom PWA Setup

1. **Create custom manifest**:
   ```json
   {
     "name": "My OHW Parser",
     "short_name": "MyOHW",
     "theme_color": "#your-color",
     "background_color": "#your-bg-color"
   }
   ```

2. **Custom service worker**:
   ```javascript
   // Add custom caching strategies
   const CACHE_STRATEGIES = {
     'api': 'network-first',
     'static': 'cache-first',
     'images': 'stale-while-revalidate'
   };
   ```

3. **Custom icons**:
   - Create icons in multiple sizes (192x192, 512x512)
   - Place in `public/` directory
   - Update manifest.json

### PWA Analytics
Track PWA usage with Google Analytics:

```javascript
// Add to your PWA
gtag('config', 'GA_MEASUREMENT_ID', {
  'custom_map': {
    'dimension1': 'pwa_install',
    'dimension2': 'offline_usage'
  }
});
```

---

## 🛠️ Troubleshooting

### PWA Won't Install
1. **Check HTTPS** - PWA requires secure connection
2. **Verify manifest** - Check browser console for errors
3. **Clear cache** - Clear browser cache and try again
4. **Check browser support** - Ensure you're using a modern browser

### Backend Connection Issues
1. **Check URL format** - Ensure correct protocol (http/https)
2. **Verify CORS** - Backend must allow PWA domain
3. **Test connectivity** - Try accessing backend URL directly
4. **Check firewall** - Ensure ports are open

### Offline Mode Not Working
1. **Check service worker** - Verify it's registered
2. **Clear cache** - Clear browser cache
3. **Check manifest** - Ensure offline URLs are cached
4. **Test offline** - Use browser's offline mode

### Performance Issues
1. **Optimize images** - Use WebP format
2. **Minimize bundle size** - Use code splitting
3. **Enable compression** - Use gzip/brotli
4. **Cache strategies** - Implement proper caching

---

## 📱 PWA Best Practices

### Performance
- **Lazy load** components and data
- **Optimize images** and assets
- **Use service worker** for caching
- **Minimize bundle size**

### User Experience
- **Fast loading** - Under 3 seconds
- **Smooth animations** - 60fps
- **Responsive design** - Works on all screen sizes
- **Accessibility** - Follow WCAG guidelines

### Offline Experience
- **Cache essential data** for offline use
- **Show offline indicator** when no connection
- **Sync data** when connection restored
- **Graceful degradation** for missing features

---

## 🔄 Updates and Maintenance

### Automatic Updates
The PWA automatically updates when:
- **Service worker** detects new version
- **Manifest** changes
- **Cache** is updated

### Manual Updates
To force an update:
1. **Clear browser cache**
2. **Uninstall and reinstall** PWA
3. **Refresh page** multiple times

### Version Management
Track PWA versions:
```javascript
// In service worker
const VERSION = '1.2.3';
const CACHE_NAME = `ohw-parser-${VERSION}`;
```

---

## 📞 Support

### Browser Support
- **Chrome**: Full support
- **Firefox**: Full support
- **Safari**: Full support (iOS 11.3+)
- **Edge**: Full support

### Common Issues
- **Installation fails**: Check HTTPS and manifest
- **Offline not working**: Verify service worker
- **Slow performance**: Optimize assets and caching
- **Connection errors**: Check backend and CORS

### Getting Help
- **Browser DevTools** - Check console for errors
- **PWA Audit** - Use Lighthouse for testing
- **GitHub Issues** - Report problems
- **Documentation** - Check OHW docs

---

## 🎯 Quick Reference

### Installation Commands
```bash
# Clone repository
git clone https://github.com/haryowl/ohw.git

# Build PWA
cd ohw/frontend && npm run build

# Serve locally
npx serve -s build -l 8080
```

### Configuration
- **Backend URL**: Set in PWA settings
- **Offline mode**: Enable in settings
- **Notifications**: Configure in browser
- **Cache**: Managed by service worker

### URLs
- **GitHub**: https://github.com/haryowl/ohw
- **PWA Demo**: https://haryowl.github.io/ohw/
- **Documentation**: Check README.md

---

**Your OHW PWA is ready to use! 🚀** 