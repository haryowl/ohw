# 🛰️ Galileosky Parser

A comprehensive IoT tracking and telemetry system for Galileosky GPS devices with real-time data processing, interactive maps, and mobile support.

[![GitHub release (latest by date)](https://img.shields.io/github/v/release/haryowl/galileosky-parser)](https://github.com/haryowl/galileosky-parser/releases)
[![GitHub stars](https://img.shields.io/github/stars/haryowl/galileosky-parser)](https://github.com/haryowl/galileosky-parser/stargazers)
[![GitHub forks](https://img.shields.io/github/forks/haryowl/galileosky-parser)](https://github.com/haryowl/galileosky-parser/network)
[![GitHub issues](https://img.shields.io/github/issues/haryowl/galileosky-parser)](https://github.com/haryowl/galileosky-parser/issues)
[![GitHub pull requests](https://img.shields.io/github/issues-pr/haryowl/galileosky-parser)](https://github.com/haryowl/galileosky-parser/pulls)

## ✨ Features

- **📡 Protocol Parsing**: Complete Galileosky protocol implementation
- **🌐 Web Interface**: React-based responsive dashboard
- **📱 Mobile Support**: PWA and Android server capabilities
- **🗺️ Interactive Maps**: Real-time tracking with offline grid support
- **📊 Data Management**: SQLite database with export capabilities
- **🔔 Alert System**: Configurable alerts and notifications
- **📈 Analytics**: Data visualization and reporting
- **🔒 Security**: CORS, validation, and rate limiting
- **⚡ Performance**: Optimized for mobile and low-resource environments

## 🚀 Quick Start

### Prerequisites

- Node.js 14.18.0+
- npm or yarn
- Git

### Installation

```bash
# Clone the repository
git clone https://github.com/haryowl/galileosky-parser.git
cd galileosky-parser

# Install dependencies
npm install
cd backend && npm install
cd ../frontend && npm install

# Build frontend
npm run build

# Start servers
npm start
```

### Mobile Setup

For Android deployment, see [MOBILE_SETUP.md](MOBILE_SETUP.md)

## 📁 Project Structure

```
galileosky-parser/
├── backend/                 # Node.js/Express server
│   ├── src/
│   │   ├── models/         # Database models
│   │   ├── routes/         # API routes
│   │   ├── services/       # Business logic
│   │   └── config/         # Configuration
│   └── package.json
├── frontend/               # React application
│   ├── src/
│   │   ├── components/     # React components
│   │   ├── pages/         # Page components
│   │   └── services/      # API services
│   └── package.json
├── documentP/             # Protocol documentation
├── scripts/              # Deployment scripts
└── docs/                 # Additional documentation
```

## 🔧 Configuration

### Environment Variables

Create `.env` file in backend directory:

```env
NODE_ENV=production
PORT=3001
TCP_PORT=3003
WS_PORT=3001
DATABASE_URL=sqlite://./data/prod.sqlite
LOG_LEVEL=info
MAX_PACKET_SIZE=1024
CORS_ORIGIN=*
```

## 📡 API Endpoints

### Device Management
- `GET /api/devices` - Get all devices
- `GET /api/devices/:id` - Get specific device
- `POST /api/devices` - Create device
- `PUT /api/devices/:id` - Update device
- `DELETE /api/devices/:id` - Delete device

### Data Access
- `GET /api/data/:deviceId` - Get device data
- `GET /api/data/:deviceId/tracking` - Get tracking data
- `GET /api/data/:deviceId/export` - Export data (CSV/Excel)

### System Status
- `GET /api/mobile/status` - Mobile device status
- `GET /api/mobile/info` - Device information
- `POST /api/mobile/optimize` - Control optimizations

### WebSocket
- `ws://localhost:3001/ws` - Real-time data streaming

## 🗺️ Map Features

- **Online Maps**: OpenStreetMap integration
- **Offline Grid**: Coordinate-based mapping
- **Real-time Tracking**: Live device locations
- **Route Visualization**: Historical track display
- **Geofencing**: Virtual boundary alerts
- **Multi-device View**: All devices on one map

## 📱 Mobile Features

- **PWA Support**: Install as mobile app
- **Android Server**: Run server on Android devices
- **Offline Capability**: Work without internet
- **Touch Optimized**: Mobile-friendly interface
- **Battery Optimization**: Smart power management
- **Storage Management**: Automatic cleanup

## 🔒 Security

- CORS configuration
- Input validation
- SQL injection protection
- Rate limiting
- Network access control
- Data encryption

## 📊 Performance

- Efficient data parsing
- Database optimization
- Caching strategies
- Memory management
- Mobile optimization
- Battery efficiency

## 🚀 Deployment

### Local Development
```bash
npm run dev
```

### Production
```bash
npm start
```

### Docker
```bash
docker-compose up -d
```

### Mobile (Termux)
```bash
./termux-backend-only.sh start
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Development Guidelines

- Follow existing code style
- Add tests for new features
- Update documentation
- Test on mobile devices

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Galileosky protocol documentation
- React and Material-UI communities
- OpenStreetMap for map data
- Termux community for mobile support

## 📞 Support

For support and questions:
- Create an issue on GitHub
- Check the documentation in `/documentP/`
- Review troubleshooting guides
- Check [MOBILE_SETUP.md](MOBILE_SETUP.md) for mobile issues

## 🔄 Changelog

### v1.0.0
- Initial release
- Complete protocol parsing
- Web interface
- Mobile support
- Offline capabilities
- Android server support
- PWA functionality

## 📊 Project Status

- **Protocol Parsing**: ✅ Complete
- **Web Interface**: ✅ Complete
- **Mobile Support**: ✅ Complete
- **Documentation**: ✅ Complete
- **Testing**: 🔄 In Progress
- **Deployment**: ✅ Ready

## 🌟 Star History

[![Star History Chart](https://api.star-history.com/svg?repos=haryowl/galileosky-parser&type=Date)](https://star-history.com/#haryowl/galileosky-parser&Date)

---

**Made with ❤️ for the IoT community** 
