import dotenv from 'dotenv';
dotenv.config();

const env = {
  PORT: process.env.PORT || 5000,
  NODE_ENV: process.env.NODE_ENV || 'development',
  DB: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT, 10) || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || 'root',
    database: process.env.DB_NAME || 'price_tracker_db',
  },
  JWT_SECRET: process.env.JWT_SECRET || 'super_secret_jwt_key_price_tracker_prod_2026',
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '7d',
  FRONTEND_URL: process.env.FRONTEND_URL || 'http://localhost:3000',
  MONITORING: {
    intervalHours: parseInt(process.env.MONITORING_INTERVAL_HOURS, 10) || 24,
    cronSchedule: process.env.MONITOR_CRON_SCHEDULE || '0 * * * *',
  },
  SCRAPER: {
    timeoutMs: parseInt(process.env.SCRAPING_TIMEOUT_MS, 10) || 30000,
    headless: process.env.HEADLESS_BROWSER !== 'false',
    scrapflyApiKey: process.env.SCRAPFLY_API_KEY || '',
  },
  EMAIL: {
    host: process.env.SMTP_HOST || 'smtp.ethereal.email',
    port: parseInt(process.env.SMTP_PORT, 10) || 587,
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASS || '',
    from: process.env.SMTP_FROM || 'Price Alert <alerts@pricetracker.local>',
  }
};

export default env;
export { env };
