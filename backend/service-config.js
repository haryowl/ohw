const path = require('path');
const os = require('os');

module.exports = {
  name: 'galileosky-parser-backend',
  description: 'Galileosky Parser Backend Service',
  script: path.join(__dirname, 'src', 'server.js'),
  env: {
    NODE_ENV: 'production',
    PORT: '3001',
    WS_PORT: '3001',
    TCP_PORT: '3003'
  },
  error_file: path.join(os.homedir(), 'galileosky-parser', 'logs', 'backend-error.log'),
  out_file: path.join(os.homedir(), 'galileosky-parser', 'logs', 'backend-out.log'),
  log_date_format: 'YYYY-MM-DD HH:mm:ss',
  merge_logs: true,
  autorestart: true,
  watch: false,
  max_memory_restart: '1G',
  exp_backoff_restart_delay: 100
}; 