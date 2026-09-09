import scraperRegistry from '../scrapers/scraper.registry.js';
import { query } from '../config/database.js';
import { detectPlatformSlug, resolveRedirectUrl, cleanUrl } from '../utils/url.utils.js';

export class ScraperService {
  async scrapeUrl(rawUrl, options = {}) {
    const startedAt = new Date();
    let url = rawUrl;
    try {
      url = await resolveRedirectUrl(rawUrl);
    } catch (resolveErr) {
      console.warn(`[ScraperService] URL resolution notice: ${resolveErr.message}`);
    }
    url = cleanUrl(url);

    let platformId = options.platformId;
    let scraperKey = options.scraperKey;
    const slug = detectPlatformSlug(url) || detectPlatformSlug(rawUrl);

    if (!platformId || !scraperKey) {
      if (slug) {
        try {
          const [platforms] = await query(
            'SELECT id, scraper_key, is_active FROM platforms WHERE slug = ? OR scraper_key = ? LIMIT 1',
            [slug, slug]
          );
          if (platforms.length > 0) {
            platformId = platforms[0].id;
            scraperKey = platforms[0].scraper_key;
            if (!platforms[0].is_active) {
              const err = new Error(`Platform ${slug} is currently deactivated.`);
              err.code = 'PLATFORM_DEACTIVATED';
              err.statusCode = 400;
              throw err;
            }
          }
        } catch (dbErr) {
          if (dbErr.code === 'PLATFORM_DEACTIVATED') throw dbErr;
        }
      }
    }

    const scraper = scraperKey
      ? scraperRegistry.get(scraperKey)
      : scraperRegistry.getByUrl(url) || scraperRegistry.getByUrl(rawUrl);

    // 2. Handle Unsupported Platforms cleanly
    if (!scraper) {
      const platformDisplay = slug ? slug.toUpperCase() : 'This platform';
      const err = new Error(`${platformDisplay} is not currently supported.`);
      err.code = 'UNSUPPORTED_PLATFORM';
      err.statusCode = 400;

      await this.logScrape({
        productLinkId: options.productLinkId || null,
        platformId: platformId || null,
        status: 'FAILED',
        oldPrice: options.oldPrice || null,
        errorCode: 'UNSUPPORTED_PLATFORM',
        errorMessage: err.message,
        startedAt,
        completedAt: new Date(),
      });
      throw err;
    }

    try {
      const productData = await scraper.scrape(url, options);

      if (!productData || productData.price === null || productData.price === undefined) {
        const err = new Error('Price not found on product page');
        err.code = 'PARSER_ERROR';
        throw err;
      }

      await this.logScrape({
        productLinkId: options.productLinkId || null,
        platformId: platformId || null,
        status: 'SUCCESS',
        oldPrice: options.oldPrice || null,
        newPrice: productData.price,
        startedAt,
        completedAt: new Date(),
      });

      return {
        success: true,
        data: productData,
        platformId,
      };
    } catch (error) {
      console.error(`[ScraperService] Scrape failed for ${url}:`, error.message);

      let status = 'FAILED';
      if (error.code === 'BLOCKED') status = 'BLOCKED';
      else if (error.code === 'PRODUCT_NOT_FOUND' || error.code === 'NOT_FOUND') status = 'NOT_FOUND';
      else if (error.code === 'UNAVAILABLE') status = 'UNAVAILABLE';
      else if (error.code === 'PARSER_ERROR') status = 'PARSER_ERROR';
      else if (error.code === 'CAPTCHA') status = 'BLOCKED';
      else if (error.code === 'TIMEOUT' || error.name === 'TimeoutError') status = 'TIMEOUT';
      else if (error.code === 'PRICE_NOT_FOUND') status = 'PARSER_ERROR';

      await this.logScrape({
        productLinkId: options.productLinkId || null,
        platformId: platformId || null,
        status,
        oldPrice: options.oldPrice || null,
        newPrice: null,
        errorCode: error.code || 'UNKNOWN_ERROR',
        errorMessage: error.message,
        startedAt,
        completedAt: new Date(),
      });

      return {
        success: false,
        error: error.message,
        status,
        platformId,
      };
    }
  }

  async logScrape({
    productLinkId = null,
    platformId = null,
    status,
    oldPrice = null,
    newPrice = null,
    errorCode = null,
    errorMessage = null,
    startedAt,
    completedAt,
  }) {
    try {
      await query(
        `INSERT INTO scrape_logs (
          product_link_id, platform_id, status, old_price, new_price,
          error_code, error_message, started_at, completed_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          productLinkId,
          platformId,
          status,
          oldPrice,
          newPrice,
          errorCode,
          errorMessage ? errorMessage.substring(0, 500) : null,
          startedAt || new Date(),
          completedAt || new Date(),
        ]
      );
    } catch (err) {
      console.error('[ScraperService] Error logging scrape event:', err.message);
    }
  }
}

const scraperService = new ScraperService();
export default scraperService;
export { scraperService };
