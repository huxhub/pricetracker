import mysql from 'mysql2/promise';
import bcrypt from 'bcryptjs';
import env from './environment.js';

let pool = null;

export async function initDatabase() {
  try {
    // 1. Connect without database to ensure DB exists
    const adminConn = await mysql.createConnection({
      host: env.DB.host,
      port: env.DB.port,
      user: env.DB.user,
      password: env.DB.password,
    });

    await adminConn.query(`CREATE DATABASE IF NOT EXISTS \`${env.DB.database}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;`);
    await adminConn.end();

    // 2. Create connection pool with DB selected
    pool = mysql.createPool({
      host: env.DB.host,
      port: env.DB.port,
      user: env.DB.user,
      password: env.DB.password,
      database: env.DB.database,
      waitForConnections: true,
      connectionLimit: 15,
      queueLimit: 0,
      timezone: '+00:00',
    });

    console.log(`[Database] Connected to MySQL (${env.DB.database}) at ${env.DB.host}:${env.DB.port}`);

    await createTables();
    await seedInitialData();

    return pool;
  } catch (error) {
    console.error('[Database] Initialization error:', error.message);
    throw error;
  }
}

async function createTables() {
  const schemaQueries = [
    `CREATE TABLE IF NOT EXISTS users (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      email VARCHAR(255) NOT NULL UNIQUE,
      password_hash VARCHAR(255) NOT NULL,
      role ENUM('USER', 'ADMIN') NOT NULL DEFAULT 'USER',
      is_active BOOLEAN NOT NULL DEFAULT TRUE,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_users_email (email)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`,

    `CREATE TABLE IF NOT EXISTS platforms (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(100) NOT NULL,
      slug VARCHAR(50) NOT NULL UNIQUE,
      domain VARCHAR(100) NOT NULL,
      scraper_key VARCHAR(50) NOT NULL UNIQUE,
      logo_url TEXT,
      is_active BOOLEAN NOT NULL DEFAULT TRUE,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_platforms_domain (domain)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`,

    `CREATE TABLE IF NOT EXISTS products (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NULL,
      title VARCHAR(500) NOT NULL,
      normalized_title VARCHAR(500),
      brand VARCHAR(100),
      category VARCHAR(100),
      description TEXT,
      image TEXT,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
      INDEX idx_products_user (user_id),
      INDEX idx_products_normalized (normalized_title)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`,

    `CREATE TABLE IF NOT EXISTS product_links (
      id INT AUTO_INCREMENT PRIMARY KEY,
      product_id INT NOT NULL,
      platform_id INT NOT NULL,
      url TEXT NOT NULL,
      external_product_id VARCHAR(100),
      current_price DECIMAL(12,2) NULL,
      current_mrp DECIMAL(12,2) NULL,
      current_discount DECIMAL(5,2) NULL,
      currency VARCHAR(10) NOT NULL DEFAULT 'SAR',
      availability VARCHAR(100),
      rating DECIMAL(3,2) NULL,
      review_count INT NOT NULL DEFAULT 0,
      seller VARCHAR(255),
      last_checked_at DATETIME NULL,
      last_successful_check_at DATETIME NULL,
      next_check_at DATETIME NULL,
      status ENUM('ACTIVE', 'PAUSED', 'FAILED', 'UNAVAILABLE', 'REMOVED') NOT NULL DEFAULT 'ACTIVE',
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
      FOREIGN KEY (platform_id) REFERENCES platforms(id) ON DELETE CASCADE,
      INDEX idx_product_links_product (product_id),
      INDEX idx_product_links_platform (platform_id),
      INDEX idx_product_links_next_check (next_check_at, status)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`,

    `CREATE TABLE IF NOT EXISTS countries (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(100) NOT NULL,
      code VARCHAR(10) NOT NULL UNIQUE,
      currency VARCHAR(10) NOT NULL DEFAULT 'SAR',
      locale VARCHAR(20) NOT NULL DEFAULT 'en-SA',
      timezone VARCHAR(50) NOT NULL DEFAULT 'Asia/Riyadh',
      is_active BOOLEAN NOT NULL DEFAULT TRUE,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`,

    `CREATE TABLE IF NOT EXISTS price_history (
      id INT AUTO_INCREMENT PRIMARY KEY,
      product_link_id INT NOT NULL,
      price DECIMAL(12,2) NOT NULL,
      mrp DECIMAL(12,2) NULL,
      discount DECIMAL(5,2) NULL,
      currency VARCHAR(10) NOT NULL DEFAULT 'SAR',
      availability VARCHAR(100),
      checked_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (product_link_id) REFERENCES product_links(id) ON DELETE CASCADE,
      INDEX idx_price_history_link (product_link_id, checked_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`,

    `CREATE TABLE IF NOT EXISTS price_alerts (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL,
      product_link_id INT NOT NULL,
      alert_type ENUM('PRICE_DROP', 'TARGET_PRICE', 'ANY_PRICE_CHANGE') NOT NULL,
      target_price DECIMAL(12,2) NULL,
      is_active BOOLEAN NOT NULL DEFAULT TRUE,
      last_triggered_at DATETIME NULL,
      last_notified_price DECIMAL(12,2) NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (product_link_id) REFERENCES product_links(id) ON DELETE CASCADE,
      INDEX idx_alerts_user (user_id),
      INDEX idx_alerts_link (product_link_id, is_active)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`,

    `CREATE TABLE IF NOT EXISTS scrape_logs (
      id INT AUTO_INCREMENT PRIMARY KEY,
      product_link_id INT NULL,
      platform_id INT NULL,
      status ENUM('SUCCESS', 'FAILED', 'BLOCKED', 'CAPTCHA', 'PRICE_NOT_FOUND', 'PRODUCT_NOT_FOUND', 'TIMEOUT') NOT NULL,
      old_price DECIMAL(12,2) NULL,
      new_price DECIMAL(12,2) NULL,
      error_code VARCHAR(100) NULL,
      error_message TEXT NULL,
      started_at DATETIME NULL,
      completed_at DATETIME NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (product_link_id) REFERENCES product_links(id) ON DELETE SET NULL,
      FOREIGN KEY (platform_id) REFERENCES platforms(id) ON DELETE SET NULL,
      INDEX idx_scrape_logs_status (status),
      INDEX idx_scrape_logs_platform (platform_id),
      INDEX idx_scrape_logs_created (created_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`
  ];

  for (const q of schemaQueries) {
    await pool.query(q);
  }
  console.log('[Database] All database tables verified and initialized.');
}

async function seedInitialData() {
  // Seed Saudi Arabia as default country
  await pool.query(
    `INSERT INTO countries (name, code, currency, locale, timezone, is_active)
     VALUES (?, ?, ?, ?, ?, TRUE)
     ON DUPLICATE KEY UPDATE name = VALUES(name), currency = VALUES(currency)`,
    ['Saudi Arabia', 'SA', 'SAR', 'en-SA', 'Asia/Riyadh']
  );

  // Saudi Arabia priority platforms (MVP)
  const platforms = [
    {
      name: 'Amazon Saudi Arabia',
      slug: 'amazon_sa',
      domain: 'amazon.sa',
      scraper_key: 'amazon_sa',
      logo_url: 'https://upload.wikimedia.org/wikipedia/commons/a/a9/Amazon_logo.svg'
    },
    {
      name: 'Noon Saudi Arabia',
      slug: 'noon_sa',
      domain: 'noon.com',
      scraper_key: 'noon_sa',
      logo_url: 'https://seeklogo.com/images/N/noon-logo-B28A9C0B1C-seeklogo.com.png'
    },
    {
      name: 'Jarir Bookstore',
      slug: 'jarir',
      domain: 'jarir.com',
      scraper_key: 'jarir',
      logo_url: 'https://www.jarir.com/skin/frontend/jarir/default/images/logo.png'
    },
    {
      name: 'eXtra Stores',
      slug: 'extra',
      domain: 'extra.com',
      scraper_key: 'extra',
      logo_url: 'https://www.extra.com/en-sa/assets/images/extra-logo.svg'
    }
  ];

  for (const p of platforms) {
    await pool.query(
      `INSERT INTO platforms (name, slug, domain, scraper_key, logo_url, is_active)
       VALUES (?, ?, ?, ?, ?, TRUE)
       ON DUPLICATE KEY UPDATE name = VALUES(name), domain = VALUES(domain), logo_url = VALUES(logo_url)`,
      [p.name, p.slug, p.domain, p.scraper_key, p.logo_url]
    );
  }

  const defaultPasswordHash = await bcrypt.hash('admin123', 10);
  const demoUserPasswordHash = await bcrypt.hash('user123', 10);

  await pool.query(
    `INSERT INTO users (name, email, password_hash, role, is_active)
     VALUES (?, ?, ?, 'ADMIN', TRUE)
     ON DUPLICATE KEY UPDATE role = 'ADMIN'`,
    ['Administrator', 'admin@pricetracker.com', defaultPasswordHash]
  );

  await pool.query(
    `INSERT INTO users (name, email, password_hash, role, is_active)
     VALUES (?, ?, ?, 'USER', TRUE)
     ON DUPLICATE KEY UPDATE is_active = TRUE`,
    ['Demo User', 'user@pricetracker.com', demoUserPasswordHash]
  );

  console.log('[Database] Default platforms and demo user accounts seeded.');
}

export function getPool() {
  if (!pool) {
    throw new Error('Database pool has not been initialized. Call initDatabase() first.');
  }
  return pool;
}

export const query = async (sql, params) => getPool().query(sql, params);
export const execute = async (sql, params) => getPool().execute(sql, params);

export default {
  initDatabase,
  getPool,
  query,
  execute,
};
