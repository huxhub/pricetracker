import { query } from '../config/database.js';
import { isValidUrl, cleanUrl, detectPlatformSlug } from '../utils/url.utils.js';
import { normalizeTitle, extractBrand } from '../utils/product.utils.js';
import scraperService from './scraper.service.js';
import priceService from './price.service.js';
import alertService from './alert.service.js';

export class ProductService {
  async createProductWithUrls({ userId, urlEntries, manualTitle, brand, category }) {
    if (!urlEntries || urlEntries.length === 0) {
      throw new Error('At least one product URL is required.');
    }

    const scrapeResults = [];
    for (const entry of urlEntries) {
      const targetUrl = cleanUrl(typeof entry === 'string' ? entry : entry.url);
      const manualPlatformId = typeof entry === 'object' ? entry.platformId : null;

      if (!isValidUrl(targetUrl)) {
        throw new Error(`Invalid URL format: ${targetUrl}`);
      }

      const result = await scraperService.scrapeUrl(targetUrl, {
        platformId: manualPlatformId,
      });
      scrapeResults.push({
        url: targetUrl,
        platformId: result.platformId || manualPlatformId,
        scrapeResult: result,
      });
    }

    const primaryScrape = scrapeResults.find((r) => r.scrapeResult.success)?.scrapeResult.data;
    const title = manualTitle || primaryScrape?.title || 'Tracked Product';
    const normalized = normalizeTitle(title);
    const finalBrand = brand || primaryScrape?.brand || extractBrand(title);
    const finalCategory = category || primaryScrape?.category || 'Electronics';
    const image = primaryScrape?.image || '';
    const description = primaryScrape?.description || '';

    const [productInsert] = await query(
      `INSERT INTO products (user_id, title, normalized_title, brand, category, description, image)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [userId, title, normalized, finalBrand, finalCategory, description, image]
    );

    const productId = productInsert.insertId;

    const createdLinks = [];
    for (const item of scrapeResults) {
      const { url, platformId, scrapeResult } = item;
      const data = scrapeResult.data;

      let finalPlatformId = platformId;
      if (!finalPlatformId) {
        const slug = detectPlatformSlug(url) || 'amazon';
        const [foundPlatforms] = await query('SELECT id FROM platforms WHERE slug = ? LIMIT 1', [slug]);
        finalPlatformId = foundPlatforms.length > 0 ? foundPlatforms[0].id : 1;
      }

      const initialStatus = scrapeResult.success ? 'ACTIVE' : 'FAILED';
      const initialPrice = data?.price !== undefined ? data.price : null;
      const initialMrp = data?.mrp !== undefined ? data.mrp : null;
      const initialDiscount = data?.discount !== undefined ? data.discount : null;

      const [linkInsert] = await query(
        `INSERT INTO product_links (
          product_id, platform_id, url, external_product_id,
          current_price, current_mrp, current_discount, currency,
          availability, rating, review_count, seller,
          last_checked_at, last_successful_check_at, next_check_at, status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), ${scrapeResult.success ? 'NOW()' : 'NULL'}, DATE_ADD(NOW(), INTERVAL 24 HOUR), ?)`,
        [
          productId,
          finalPlatformId,
          url,
          data?.externalProductId || null,
          initialPrice,
          initialMrp,
          initialDiscount,
          data?.currency || 'SAR',
          data?.availability || 'In Stock',
          data?.rating || null,
          data?.reviewCount || 0,
          data?.seller || null,
          initialStatus,
        ]
      );

      const linkId = linkInsert.insertId;

      if (scrapeResult.success && initialPrice !== null) {
        await query(
          `INSERT INTO price_history (product_link_id, price, mrp, discount, availability, checked_at)
           VALUES (?, ?, ?, ?, ?, NOW())`,
          [linkId, initialPrice, initialMrp, initialDiscount, data?.availability || 'In Stock']
        );
      }

      createdLinks.push({
        id: linkId,
        platformId: finalPlatformId,
        url,
        status: initialStatus,
        currentPrice: initialPrice,
      });
    }

    return this.getProductById(productId);
  }

  async addLinkToProduct(productId, { url, platformId }) {
    const clean = cleanUrl(url);
    if (!isValidUrl(clean)) {
      throw new Error(`Invalid URL: ${clean}`);
    }

    const [existing] = await query(
      'SELECT id FROM product_links WHERE product_id = ? AND url = ? LIMIT 1',
      [productId, clean]
    );
    if (existing.length > 0) {
      throw new Error('This URL is already tracked for this product.');
    }

    const result = await scraperService.scrapeUrl(clean, { platformId });
    let resolvedPlatformId = platformId || result.platformId;

    if (!resolvedPlatformId) {
      const slug = detectPlatformSlug(clean) || 'amazon';
      const [plat] = await query('SELECT id FROM platforms WHERE slug = ? LIMIT 1', [slug]);
      resolvedPlatformId = plat.length > 0 ? plat[0].id : 1;
    }

    const data = result.data;
    const initialStatus = result.success ? 'ACTIVE' : 'FAILED';
    const initialPrice = data?.price !== undefined ? data.price : null;

    const [linkInsert] = await query(
      `INSERT INTO product_links (
        product_id, platform_id, url, external_product_id,
        current_price, current_mrp, current_discount, currency,
        availability, rating, review_count, seller,
        last_checked_at, last_successful_check_at, next_check_at, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), ${result.success ? 'NOW()' : 'NULL'}, DATE_ADD(NOW(), INTERVAL 24 HOUR), ?)`,
      [
        productId,
        resolvedPlatformId,
        clean,
        data?.externalProductId || null,
        initialPrice,
        data?.mrp || null,
        data?.discount || null,
        data?.currency || 'SAR',
        data?.availability || 'In Stock',
        data?.rating || null,
        data?.reviewCount || 0,
        data?.seller || null,
        initialStatus,
      ]
    );

    const linkId = linkInsert.insertId;

    if (result.success && initialPrice !== null) {
      await query(
        `INSERT INTO price_history (product_link_id, price, mrp, discount, availability, checked_at)
         VALUES (?, ?, ?, ?, ?, NOW())`,
        [linkId, initialPrice, data.mrp || null, data.discount || null, data.availability || 'In Stock']
      );
    }

    return this.getProductById(productId);
  }

  async refreshLink(linkId) {
    const [links] = await query(
      `SELECT pl.*, p.slug AS platform_slug, p.scraper_key
       FROM product_links pl
       JOIN platforms p ON pl.platform_id = p.id
       WHERE pl.id = ? LIMIT 1`,
      [linkId]
    );

    if (links.length === 0) {
      throw new Error(`Product link #${linkId} not found`);
    }

    const link = links[0];
    const result = await scraperService.scrapeUrl(link.url, {
      productLinkId: link.id,
      platformId: link.platform_id,
      oldPrice: link.current_price,
      scraperKey: link.scraper_key,
    });

    if (result.success && result.data && result.data.price !== null) {
      const updateResult = await priceService.recordNewPrice(link.id, result.data);
      await alertService.evaluateAlertsForLink(updateResult);
      return { success: true, price: result.data.price, message: 'Price refreshed successfully.' };
    } else {
      const linkStatus = result.status === 'UNAVAILABLE' ? 'UNAVAILABLE' : 'FAILED';
      await query("UPDATE product_links SET status = ?, last_checked_at = NOW() WHERE id = ?", [linkStatus, link.id]);
      return { success: false, error: result.error || 'Failed to extract price', status: result.status };
    }
  }

  async getProductById(productId) {
    const [products] = await query('SELECT * FROM products WHERE id = ?', [productId]);
    if (products.length === 0) return null;

    const product = products[0];
    const comparison = await priceService.getProductComparison(productId);
    const history = await priceService.getProductPriceHistory(productId);

    return {
      ...product,
      platforms: comparison.platforms,
      lowestPrice: comparison.lowestPrice,
      priceHistory: history.history,
      statistics: history.statistics,
    };
  }

  async listProducts({ userId, search, category, limit = 50, offset = 0 }) {
    let sql = `
      SELECT
        p.*,
        COUNT(DISTINCT pl.id) AS total_links,
        MIN(CASE WHEN pl.status = 'ACTIVE' THEN pl.current_price END) AS lowest_price,
        MAX(CASE WHEN pl.status = 'ACTIVE' THEN pl.current_price END) AS highest_price
      FROM products p
      LEFT JOIN product_links pl ON p.id = pl.product_id
      WHERE 1=1
    `;
    const params = [];

    if (userId) {
      sql += ' AND p.user_id = ?';
      params.push(userId);
    }
    if (search) {
      sql += ' AND (p.title LIKE ? OR p.brand LIKE ?)';
      params.push(`%${search}%`, `%${search}%`);
    }
    if (category) {
      sql += ' AND p.category = ?';
      params.push(category);
    }

    sql += ' GROUP BY p.id ORDER BY p.created_at DESC LIMIT ? OFFSET ?';
    params.push(Number(limit), Number(offset));

    const [products] = await query(sql, params);

    if (products.length > 0) {
      const productIds = products.map((p) => p.id);
      const [links] = await query(
        `SELECT
          pl.id,
          pl.product_id,
          pl.platform_id,
          pl.url,
          pl.current_price,
          pl.current_mrp,
          pl.current_discount,
          pl.currency,
          pl.availability,
          pl.status,
          pl.last_checked_at,
          pl.updated_at,
          p.name AS platform_name,
          p.slug AS platform_slug,
          p.logo_url AS platform_logo
        FROM product_links pl
        JOIN platforms p ON pl.platform_id = p.id
        WHERE pl.product_id IN (?)
        ORDER BY pl.current_price ASC`,
        [productIds]
      );

      const linksByProduct = {};
      for (const link of links) {
        if (!linksByProduct[link.product_id]) {
          linksByProduct[link.product_id] = [];
        }
        linksByProduct[link.product_id].push(link);
      }

      for (const prod of products) {
        prod.links = linksByProduct[prod.id] || [];
        const checkDates = prod.links
          .map((l) => l.last_checked_at || l.updated_at)
          .filter(Boolean)
          .map((d) => new Date(d).getTime());
        prod.last_checked_at = checkDates.length > 0 ? new Date(Math.max(...checkDates)) : prod.updated_at || prod.created_at;
      }
    }

    return products;
  }
}

const productService = new ProductService();
export default productService;
export { productService };
