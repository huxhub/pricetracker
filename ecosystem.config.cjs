module.exports = {
  apps: [
    {
      name: 'pricetracker-backend',
      cwd: './backend',
      script: 'src/server.js',
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
