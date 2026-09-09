import BaseScraper from '../base/scraper.interface.js';
import { extractBrand } from '../../utils/product.utils.js';
import * as cheerio from 'cheerio';
import { chromium } from 'playwright';

export class JarirScraper extends BaseScraper {
  constructor() {
    super('Jarir Bookstore', 'jarir');
  }

  async scrape(rawUrl, options = {}) {
    const url = this._normalizeUrl(rawUrl);
    let htmlContent = '';
    let browser = null;

    try {
      // 1. Stealth fetch
      try {
        const response = await fetch(url, {
          headers: {
            'User-Agent': this.getRandomUserAgent(),
            'Accept-Language': 'en-SA,ar-SA;q=0.9,en;q=0.8',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'Cache-Control': 'no-cache',
          },
          signal: AbortSignal.timeout(15000),
        });
        if (response.ok) {
          htmlContent = await response.text();
        }
      } catch (err) {
        // Playwright fallback
      }

      const needsPlaywright =
        !htmlContent ||
        htmlContent.includes('Enable JavaScript') ||
        htmlContent.includes('cf-browser-verification') ||
        htmlContent.length < 5000;

      // 2. Playwright fallback (Saudi locale)
      if (needsPlaywright) {
        try {
          browser = await chromium.launch({
            headless: true,
            args: [
              '--disable-blink-features=AutomationControlled',
              '--no-sandbox',
              '--disable-setuid-sandbox',
              '--disable-dev-shm-usage',
            ],
          });
          const context = await browser.newContext({
            userAgent: this.getRandomUserAgent(),
            viewport: { width: 1366, height: 768 },
            locale: 'en-SA',
            timezoneId: 'Asia/Riyadh',
          });
          const page = await context.newPage();
          await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
          await page.waitForTimeout(1500);
          htmlContent = await page.content();
        } catch (pwErr) {
          console.warn(`[JarirScraper] Playwright notice: ${pwErr.message}`);
        } finally {
          if (browser) await browser.close().catch(() => {});
        }
      }

      // 3. Cheerio parsing
      if (htmlContent) {
        const $ = cheerio.load(htmlContent);

        // JSON-LD (Jarir uses @graph inside schema.org scripts)
        const scripts = $('script[type="application/ld+json"]').toArray();
        for (const s of scripts) {
          try {
            const raw = $(s).html();
            if (raw) {
              const parsed = JSON.parse(raw);
              let items = [];
              if (Array.isArray(parsed)) {
                items = parsed;
              } else if (parsed['@graph'] && Array.isArray(parsed['@graph'])) {
                items = parsed['@graph'];
              } else {
                items = [parsed];
              }

              for (const item of items) {
                if (item['@type'] === 'Product' && (item.offers?.price || item.offers?.lowPrice)) {
                  const title = item.name || '';
                  const price = item.offers?.price ?? item.offers?.lowPrice;
                  console.log(`[JarirScraper] Extracted via JSON-LD: "${title}" - SAR ${price}`);
                  return this.formatProductData({
                    platform: 'Jarir Bookstore',
                    url,
                    externalProductId: item.sku || this._extractJarirId(url),
                    title,
                    price,
                    mrp: item.offers?.highPrice || null,
                    currency: item.offers?.priceCurrency || 'SAR',
                    availability: item.offers?.availability?.includes('InStock') ? 'In Stock' : 'Out of Stock',
                    image: Array.isArray(item.image) ? item.image[0] : item.image || '',
                    brand: item.brand?.name || extractBrand(title),
                    rating: item.aggregateRating?.ratingValue ? parseFloat(item.aggregateRating.ratingValue) : null,
                    reviewCount: item.aggregateRating?.reviewCount ? parseInt(item.aggregateRating.reviewCount, 10) : 0,
                  });
                }
              }
            }
          } catch {}
        }

        // DOM selectors — Jarir
        const title =
          $('h1.product-name, h1[itemprop="name"], .product-title h1').first().text().trim() ||
          $('h1').first().text().trim();

        // Jarir shows prices with SAR prefix, e.g. "SR 3,499" or "SAR 3,499"
        const priceStr =
          $('.price.price--pdp').first().text().trim() ||
          $('[data-price-type="finalPrice"] .price, .price-wrapper .price').first().text().trim() ||
          $('[itemprop="price"]').first().attr('content') ||
          $('[itemprop="price"]').first().text().trim() ||
          $('.special-price .price, .regular-price .price').first().text().trim() ||
          $('.price-box .price').first().text().trim() ||
          $('.product-info-price .price').first().text().trim();

        const mrpStr =
          $('.price.price--old-red').first().text().trim() ||
          $('.old-price .price, .product-info-price .old-price').first().text().trim() ||
          $('.price-box .old-price .price').first().text().trim();

        const image =
          $('img.gallery-placeholder__image, img[itemprop="image"]').first().attr('src') ||
          $('.fotorama__img').first().attr('src') ||
          $('img.product-image-photo').first().attr('src') ||
          '';

        const availability =
          $('[itemprop="availability"]').first().attr('content') ||
          $('.stock.available').first().text().trim();
        const isInStock = !availability || availability.includes('InStock') || availability.toLowerCase().includes('in stock');

        const skuEl = $('[itemprop="sku"]').first();
        const sku = skuEl.attr('content') || skuEl.text().trim() || this._extractJarirId(url);

        if (title && priceStr) {
          return this.formatProductData({
            platform: 'Jarir Bookstore',
            url,
            externalProductId: sku,
            title,
            price: priceStr,
            mrp: mrpStr || null,
            currency: 'SAR',
            availability: isInStock ? 'In Stock' : 'Out of Stock',
            image,
            brand: extractBrand(title),
          });
        }
      }

      // 4. Demo fallback
      if (process.env.SCRAPER_MODE === 'demo' && options.allowDemoFallback) {
        console.warn(`[JarirScraper] DEMO MODE: Using simulated data for ${url}`);
        return this.generateSimulatedData(url);
      }

      const error = new Error('Price not found on Jarir product page');
      error.code = 'PRICE_NOT_FOUND';
      throw error;
    } catch (error) {
      if (error.code) throw error;
      console.warn(`[JarirScraper] Extraction failure for ${url}: ${error.message}`);

      if (process.env.SCRAPER_MODE === 'demo' && options.allowDemoFallback) {
        return this.generateSimulatedData(url);
      }

      const err = new Error(`Price not found on Jarir product page: ${error.message}`);
      err.code = 'PRICE_NOT_FOUND';
      throw err;
    }
  }

  _normalizeUrl(url) {
    try {
      const parsed = new URL(url);
      if (parsed.hostname === 'jarir.com') {
        return url.replace('https://jarir.com', 'https://www.jarir.com');
      }
    } catch {}
    return url;
  }

  _extractJarirId(url) {
    try {
      const parsed = new URL(url);
      // Jarir URLs: /sa-en/product-name.html or ?sku=XXXXX
      const skuParam = parsed.searchParams.get('sku');
      if (skuParam) return skuParam;
      const pathMatch = parsed.pathname.match(/\/([0-9]+)\.html$/);
      if (pathMatch) return pathMatch[1];
    } catch {}
    return null;
  }

  generateSimulatedData(url) {
    const isElectronics =
      url.toLowerCase().includes('laptop') ||
      url.toLowerCase().includes('ipad') ||
      url.toLowerCase().includes('macbook');
    const title = isElectronics
      ? 'Apple MacBook Air M2 Chip 13-inch 256GB SSD - Midnight'
      : 'Encyclopaedia Britannica Ultimate Reference Suite 2024';
    const price = isElectronics ? 3799 : 199;
    const mrp = isElectronics ? 4299 : 249;

    return this.formatProductData({
      platform: 'Jarir Bookstore',
      url,
      externalProductId: isElectronics ? 'JAR-MBA-M2-MID' : 'JAR-ENC-2024',
      title,
      description: 'Demo mock data for local testing (Jarir).',
      price,
      mrp,
      currency: 'SAR',
      availability: 'In Stock',
      rating: 4.6,
      reviewCount: 345,
      image: isElectronics
        ? 'https://store.storeimages.cdn-apple.com/4982/as-images.apple.com/is/macbook-air-midnight-config-20220606.jpg'
        : '',
      seller: 'Jarir Bookstore',
      brand: isElectronics ? 'Apple' : 'Britannica',
      category: isElectronics ? 'Laptops' : 'Books & References',
    });
  }
}

export default JarirScraper;
