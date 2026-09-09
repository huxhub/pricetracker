import cron from 'node-cron';
import { query } from '../config/database.js';
import env from '../config/environment.js';
import scraperService from '../services/scraper.service.js';
import priceService from '../services/price.service.js';
import alertService from '../services/alert.service.js';

export class PriceMonitorJob {
  constructor() {
    this.cronTask = null;
    this.isRunning = false;
  }

  start() {
    const schedule = env.MONITORING.cronSchedule || '0 * * * *';
    console.log(`[PriceMonitorJob] Initializing cron schedule: "${schedule}"`);

    this.cronTask = cron.schedule(schedule, async () => {
      await this.runCycle();
    });

    console.log('[PriceMonitorJob] Scheduler started. Next run at the top of the next hour.');
  }

  async runCycle() {
    if (this.isRunning) {
      console.log('[PriceMonitorJob] Previous cycle still executing, skipping.');
      return;
    }

    this.isRunning = true;
    console.log(`[PriceMonitorJob] Starting monitoring cycle at ${new Date().toISOString()}`);

    try {
      const [dueLinks] = await query(
        `SELECT
          pl.id,
          pl.product_id,
          pl.platform_id,
          pl.url,
          pl.current_price,
          p.slug AS platform_slug,
          p.scraper_key
         FROM product_links pl
         JOIN platforms p ON pl.platform_id = p.id
         WHERE (pl.next_check_at IS NULL OR pl.next_check_at <= NOW())
           AND pl.status = 'ACTIVE'
           AND p.is_active = TRUE
         LIMIT 50`
      );

      console.log(`[PriceMonitorJob] Found ${dueLinks.length} product links due for inspection.`);

      for (const link of dueLinks) {
        try {
          const result = await scraperService.scrapeUrl(link.url, {
            productLinkId: link.id,
            platformId: link.platform_id,
            oldPrice: link.current_price,
            scraperKey: link.scraper_key,
          });

          if (result.success && result.data && result.data.price !== null) {
            const priceUpdate = await priceService.recordNewPrice(link.id, result.data);
            await alertService.evaluateAlertsForLink(priceUpdate);
          } else {
            await query(
              `UPDATE product_links SET
                status = 'FAILED',
                last_checked_at = NOW(),
                next_check_at = DATE_ADD(NOW(), INTERVAL 4 HOUR)
               WHERE id = ?`,
              [link.id]
            );
          }
        } catch (linkError) {
          console.error(`[PriceMonitorJob] Error checking link #${link.id}:`, linkError.message);
        }
      }

      console.log(`[PriceMonitorJob] Cycle finished at ${new Date().toISOString()}`);
    } catch (err) {
      console.error('[PriceMonitorJob] Monitor cycle encountered an error:', err.message);
    } finally {
      this.isRunning = false;
    }
  }

  stop() {
    if (this.cronTask) {
      this.cronTask.stop();
      console.log('[PriceMonitorJob] Scheduler stopped.');
    }
  }
}

const priceMonitorJob = new PriceMonitorJob();
export default priceMonitorJob;
export { priceMonitorJob };
