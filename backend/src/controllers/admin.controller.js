import { query } from '../config/database.js';
import platformService from '../services/platform.service.js';

export class AdminController {
  async getUsers(req, res, next) {
    try {
      const [users] = await query(
        `SELECT
          u.id, u.name, u.email, u.role, u.is_active, u.created_at,
          COUNT(DISTINCT p.id) AS products_count,
          COUNT(DISTINCT pa.id) AS alerts_count
        FROM users u
        LEFT JOIN products p ON u.id = p.user_id
        LEFT JOIN price_alerts pa ON u.id = pa.user_id
        GROUP BY u.id
        ORDER BY u.created_at DESC`
      );
      res.json({ success: true, count: users.length, users });
    } catch (error) {
      next(error);
    }
  }

  async getProducts(req, res, next) {
    try {
      const [products] = await query(
        `SELECT
          p.*,
          u.name AS owner_name,
          u.email AS owner_email,
          COUNT(DISTINCT pl.id) AS total_links,
          MIN(pl.current_price) AS min_price,
          MAX(pl.current_price) AS max_price
        FROM products p
        LEFT JOIN users u ON p.user_id = u.id
        LEFT JOIN product_links pl ON p.id = pl.product_id
        GROUP BY p.id
        ORDER BY p.created_at DESC`
      );
      res.json({ success: true, count: products.length, products });
    } catch (error) {
      next(error);
    }
  }

  async getPlatforms(req, res, next) {
    try {
      const platforms = await platformService.getAllPlatforms(true);
      const [counts] = await query(
        `SELECT platform_id, COUNT(*) as url_count
         FROM product_links
         GROUP BY platform_id`
      );
      const countMap = new Map(counts.map((c) => [c.platform_id, c.url_count]));

      const enriched = platforms.map((p) => ({
        ...p,
        trackedUrls: countMap.get(p.id) || 0,
      }));

      res.json({ success: true, platforms: enriched });
    } catch (error) {
      next(error);
    }
  }

  async createPlatform(req, res, next) {
    try {
      const { name, slug, domain, scraperKey, logoUrl, isActive } = req.body;
      if (!name || !slug || !domain || !scraperKey) {
        return res.status(400).json({ error: 'name, slug, domain, and scraperKey are required' });
      }

      const platform = await platformService.createPlatform({
        name,
        slug,
        domain,
        scraperKey,
        logoUrl,
        isActive,
      });

      res.status(201).json({ success: true, platform });
    } catch (error) {
      next(error);
    }
  }

  async updatePlatform(req, res, next) {
    try {
      const platform = await platformService.updatePlatform(req.params.id, req.body);
      res.json({ success: true, platform });
    } catch (error) {
      next(error);
    }
  }

  async deletePlatform(req, res, next) {
    try {
      const result = await platformService.deletePlatform(req.params.id);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }

  async getScrapeLogs(req, res, next) {
    try {
      const { status, platformId, limit = 100, offset = 0 } = req.query;

      let sql = `
        SELECT
          sl.*,
          pl.url,
          p.title AS product_title,
          plt.name AS platform_name,
          plt.slug AS platform_slug
        FROM scrape_logs sl
        LEFT JOIN product_links pl ON sl.product_link_id = pl.id
        LEFT JOIN products p ON pl.product_id = p.id
        LEFT JOIN platforms plt ON sl.platform_id = plt.id
        WHERE 1=1
      `;
      const params = [];

      if (status) {
        sql += ' AND sl.status = ?';
        params.push(status);
      }
      if (platformId) {
        sql += ' AND sl.platform_id = ?';
        params.push(platformId);
      }

      sql += ' ORDER BY sl.created_at DESC LIMIT ? OFFSET ?';
      params.push(Number(limit), Number(offset));

      const [logs] = await query(sql, params);
      res.json({ success: true, count: logs.length, logs });
    } catch (error) {
      next(error);
    }
  }

  async getScrapeStatistics(req, res, next) {
    try {
      const [statusRows] = await query(
        `SELECT status, COUNT(*) as count
         FROM scrape_logs
         GROUP BY status`
      );

      const statusBreakdown = {};
      let totalScrapes = 0;
      let successfulScrapes = 0;

      for (const row of statusRows) {
        statusBreakdown[row.status] = row.count;
        totalScrapes += row.count;
        if (row.status === 'SUCCESS') {
          successfulScrapes += row.count;
        }
      }

      const successRate = totalScrapes > 0 ? Number(((successfulScrapes / totalScrapes) * 100).toFixed(1)) : 100;
      const failedRate = totalScrapes > 0 ? Number((100 - successRate).toFixed(1)) : 0;

      const [productCountRow] = await query('SELECT COUNT(*) as count FROM products');
      const [activeUrlsRow] = await query("SELECT COUNT(*) as count FROM product_links WHERE status = 'ACTIVE'");
      const [usersCountRow] = await query('SELECT COUNT(*) as count FROM users');
      const [alertsCountRow] = await query('SELECT COUNT(*) as count FROM price_alerts WHERE is_active = TRUE');

      res.json({
        success: true,
        statistics: {
          totalScrapes,
          successfulScrapes,
          failedScrapes: totalScrapes - successfulScrapes,
          successRate,
          failedRate,
          statusBreakdown,
          totalProducts: productCountRow[0].count,
          activeUrls: activeUrlsRow[0].count,
          totalUsers: usersCountRow[0].count,
          activeAlerts: alertsCountRow[0].count,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  async getFailedProducts(req, res, next) {
    try {
      const [failed] = await query(
        `SELECT
          pl.*,
          p.title AS product_title,
          plt.name AS platform_name
        FROM product_links pl
        JOIN products p ON pl.product_id = p.id
        JOIN platforms plt ON pl.platform_id = plt.id
        WHERE pl.status = 'FAILED'
        ORDER BY pl.last_checked_at DESC`
      );
      res.json({ success: true, count: failed.length, failedLinks: failed });
    } catch (error) {
      next(error);
    }
  }
}

const adminController = new AdminController();
export default adminController;
export { adminController };
