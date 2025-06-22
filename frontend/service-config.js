const path = require('path');
const os = require('os');

module.exports = {
  name: 'galileosky-parser-frontend',
  description: 'Galileosky Parser Frontend Service',
  script: path.join(__dirname, 'node_modules', '.bin', 'serve'),
  args: ['-s', 'build', '-l', '3002'],
  env: {
    NODE_ENV: 'production',
    REACT_APP_API_URL: 'http://localhost:3001',
    REACT_APP_WS_URL: 'ws://localhost:3001/ws'
  },
  error_file: path.join(os.homedir(), 'galileosky-parser', 'logs', 'frontend-error.log'),
  out_file: path.join(os.homedir(), 'galileosky-parser', 'logs', 'frontend-out.log'),
  log_date_format: 'YYYY-MM-DD HH:mm:ss',
  merge_logs: true,
  autorestart: true,
  watch: false,
  max_memory_restart: '1G',
  exp_backoff_restart_delay: 100
}; 