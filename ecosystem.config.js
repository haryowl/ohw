module.exports = {
  apps: [
    {
      name: 'galileosky-backend',
      script: './backend/src/server.js',
      cwd: './backend',
      env: {
        NODE_ENV: 'production',
        PORT: '3001',
        WS_PORT: '3001',
        TCP_PORT: '3003'
      },
      error_file: './logs/backend-error.log',
      out_file: './logs/backend-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
      merge_logs: true,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G'
    },
    {
      name: 'galileosky-frontend',
      script: 'npx',
      cwd: './frontend',
      args: 'serve -s build -l 3002',
      env: {
        NODE_ENV: 'production',
        REACT_APP_API_URL: 'http://localhost:3001',
        REACT_APP_WS_URL: 'ws://localhost:3001/ws'
      },
      error_file: './logs/frontend-error.log',
      out_file: './logs/frontend-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
      merge_logs: true,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G'
    }
  ]
}; 