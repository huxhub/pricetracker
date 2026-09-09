module.exports = {
  apps: [
    {
      name: 'pricetracker-backend',
      cwd: './backend',
      script: 'src/server.js',
      exec_mode: 'fork',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '600M',
      env: {
        NODE_ENV: 'production',
        PORT: 5050
      }
    }
  ]
};
