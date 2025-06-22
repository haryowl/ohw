
      const { execSync } = require('child_process');
      execSync('pm2 resurrect', { stdio: 'inherit' });
    