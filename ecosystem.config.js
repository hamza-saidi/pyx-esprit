module.exports = {
  apps: [
    {
      name: 'pylon-pyx-backend',
      script: 'server.js',
      cwd: './backend',
      instances: 'max',
      exec_mode: 'cluster',
      watch: false,
      max_memory_restart: '512M',
      env: {
        NODE_ENV: 'development',
        PORT: 5000,
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 5000,
      },
      error_file: './backend/logs/pm2_err.log',
      out_file:   './backend/logs/pm2_out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      combine_logs: true,
    },
  ],
};
