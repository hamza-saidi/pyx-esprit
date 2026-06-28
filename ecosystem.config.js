module.exports = {
  apps: [
    {
      name: 'golf-huub-backend',
      script: './backend/server.js',
      // Cluster mode for load balancing across available CPU cores (Zero Downtime Reloads)
      instances: 'max',
      exec_mode: 'cluster',
      watch: false,
      max_memory_restart: '1G', // Avoid memory leaks crashing the OS
      env: {
        NODE_ENV: 'development',
        PORT: 5000
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 5000,
        COOKIE_SECURE: 'true'
      },
      // Logging setup
      error_file: './backend/logs/pm2_err.log',
      out_file: './backend/logs/pm2_out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      combine_logs: true
    }
  ]
};
