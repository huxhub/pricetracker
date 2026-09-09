import app from './app.js';
import env from './config/environment.js';
import { initDatabase } from './config/database.js';
import priceMonitorJob from './jobs/price-monitor.job.js';

async function startServer() {
  try {
    console.log('[Server] Connecting and initializing MySQL database...');
    await initDatabase();

    const server = app.listen(env.PORT, () => {
      console.log(`=======================================================`);
      console.log(`🚀 Price Tracker API Server running on port ${env.PORT}`);
      console.log(`📡 Environment: ${env.NODE_ENV}`);
      console.log(`🌐 Frontend Allowed: ${env.FRONTEND_URL}`);
      console.log(`⚡ Scrapfly ASP: ${env.SCRAPER?.scrapflyApiKey ? 'Enabled (Noon Only)' : 'Disabled'}`);
      console.log(`=======================================================`);
    });

    priceMonitorJob.start();

    const shutdown = () => {
      console.log('\n[Server] Graceful shutdown initiated...');
      priceMonitorJob.stop();
      server.close(() => {
        console.log('[Server] HTTP server closed.');
        process.exit(0);
      });
    };

    process.on('SIGINT', shutdown);
    process.on('SIGTERM', shutdown);

  } catch (error) {
    console.error('[Server] Fatal startup failure:', error);
    process.exit(1);
  }
}

startServer();
