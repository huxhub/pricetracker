import BaseScraper from '../base/scraper.interface.js';
import { extractBrand } from '../../utils/product.utils.js';
import * as cheerio from 'cheerio';
import { chromium } from 'playwright';

export class ExtraScraper extends BaseScraper {
  constructor() {
    super('eXtra Stores', 'extra');
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

      // 2. Playwright with Saudi locale
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
          await page.waitForTimeout(2000);

          // eXtra often uses React/Next.js - try __NEXT_DATA__
          try {
            const nextData = await page.evaluate(() => {
              const el = document.getElementById('__NEXT_DATA__');
              return el ? el.textContent : null;
            });
            if (nextData) {
              const data = JSON.parse(nextData);
              const extracted = this._extractFromNextData(data, url);
              if (extracted) return extracted;
            }
          } catch {}

          htmlContent = await page.content();
        } catch (pwErr) {
          console.warn(`[ExtraScraper] Playwright notice: ${pwErr.message}`);
        } finally {
          if (browser) await browser.close().catch(() => {});
        }
      }

      // 3. Cheerio parsing
      if (htmlContent) {
        const $ = cheerio.load(htmlContent);

        // __NEXT_DATA__ in static HTML
        const nextDataScript = $('#__NEXT_DATA__').html();
        if (nextDataScript) {
          try {
            const data = JSON.parse(nextDataScript);
            const extracted = this._extractFromNextData(data, url);
            if (extracted) return extracted;
          } catch {}
        }

        // JSON-LD
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
                const rawPrice = item.offers?.price ?? item.offers?.lowPrice;
                const numericPrice = parseFloat(rawPrice);
                if (item['@type'] === 'Product' && !isNaN(numericPrice) && numericPrice > 0) {
                  const title = item.name || '';
                  console.log(`[ExtraScraper] Extracted via JSON-LD: "${title}" - SAR ${numericPrice}`);
                  return this.formatProductData({
                    platform: 'eXtra Stores',
                    url,
                    externalProductId: item.sku || this._extractExtraId(url),
                    title,
                    price: numericPrice,
                    mrp: item.offers.highPrice ? parseFloat(item.offers.highPrice) : null,
                    currency: item.offers.priceCurrency || 'SAR',
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

        // DOM selectors — eXtra uses a custom React storefront
        const title =
          $('h1[class*="productName"], h1[class*="product-name"], h1[class*="title"]').first().text().trim() ||
          $('[data-testid="product-name"]').first().text().trim() ||
          $('h1').first().text().trim();

        // eXtra shows "SAR X,XXX" or club/member prices
        const priceStr =
          $('[class*="sellingPrice"], [class*="selling-price"]').first().text().trim() ||
          $('[data-testid="product-price"]').first().text().trim() ||
          $('[class*="currentPrice"], [class*="current-price"]').first().text().trim() ||
          $('[itemprop="price"]').first().attr('content') ||
          $('[itemprop="price"]').first().text().trim();

        const mrpStr =
          $('[class*="originalPrice"], [class*="original-price"], [class*="strikePrice"]').first().text().trim() ||
          $('[class*="was-price"]').first().text().trim();

        const image =
          $('[class*="productImage"] img, [data-testid="product-image"] img').first().attr('src') ||
          $('img[class*="mainImage"]').first().attr('src') ||
          '';

        const sku = $('[itemprop="sku"]').first().attr('content') || this._extractExtraId(url);

        if (title && priceStr) {
          return this.formatProductData({
            platform: 'eXtra Stores',
            url,
            externalProductId: sku,
            title,
            price: priceStr,
            mrp: mrpStr || null,
            currency: 'SAR',
            availability: 'In Stock',
            image,
            brand: extractBrand(title),
          });
        }
      }

      // 4. Demo fallback
      if (process.env.SCRAPER_MODE === 'demo' && options.allowDemoFallback) {
        console.warn(`[ExtraScraper] DEMO MODE: Using simulated data for ${url}`);
        return this.generateSimulatedData(url);
      }

      const error = new Error('Price not found on eXtra product page');
      error.code = 'PRICE_NOT_FOUND';
      throw error;
    } catch (error) {
      if (error.code) throw error;
      console.warn(`[ExtraScraper] Extraction failure for ${url}: ${error.message}`);

      if (process.env.SCRAPER_MODE === 'demo' && options.allowDemoFallback) {
        return this.generateSimulatedData(url);
      }

      const err = new Error(`Price not found on eXtra product page: ${error.message}`);
      err.code = 'PRICE_NOT_FOUND';
      throw err;
    }
  }

  _normalizeUrl(url) {
    try {
      const parsed = new URL(url);
      // eXtra: ensure en-sa locale path
      if (
        parsed.hostname.includes('extra.com') &&
        !parsed.pathname.startsWith('/en-sa/') &&
        !parsed.pathname.startsWith('/ar-sa/')
      ) {
        return `https://www.extra.com/en-sa${parsed.pathname}${parsed.search}`;
      }
    } catch {}
    return url;
  }

  _extractExtraId(url) {
    try {
      const parsed = new URL(url);
      // eXtra product IDs appear in path or as query param
      const idParam = parsed.searchParams.get('productId') || parsed.searchParams.get('id');
      if (idParam) return idParam;
      const pathMatch = parsed.pathname.match(/\/([A-Z0-9\-]{5,})\/?$/i);
      if (pathMatch) return pathMatch[1];
    } catch {}
    return null;
  }

  _extractFromNextData(data, url) {
    try {
      const pageProps =
        data?.props?.pageProps ||
        data?.props?.initialProps ||
        data?.props;

      if (!pageProps) return null;

      const product =
        pageProps?.product ||
        pageProps?.data?.product ||
        pageProps?.productDetails ||
        null;

      if (!product) return null;

      const title = product.name || product.displayName || product.title || '';
      const price = product.price?.sellingPrice || product.sellingPrice || product.price || null;
      const mrp = product.price?.originalPrice || product.originalPrice || product.mrp || null;
      const image =
        (Array.isArray(product.images) ? product.images[0]?.url : null) ||
        product.image ||
        product.thumbnail ||
        '';
      const sku = product.sku || product.itemId || this._extractExtraId(url);
      const brand = product.brand?.name || product.brand || extractBrand(title);
      const availability = product.inStock !== false ? 'In Stock' : 'Out of Stock';

      if (!title || !price) return null;

      console.log(`[ExtraScraper] Extracted via __NEXT_DATA__: "${title}" - SAR ${price}`);
      return this.formatProductData({
        platform: 'eXtra Stores',
        url,
        externalProductId: sku,
        title,
        price,
        mrp,
        currency: 'SAR',
        availability,
        image,
        brand,
      });
    } catch {
      return null;
    }
  }

  generateSimulatedData(url) {
    const isTV =
      url.toLowerCase().includes('tv') ||
      url.toLowerCase().includes('samsung') ||
      url.toLowerCase().includes('lg');
    const title = isTV
      ? 'Samsung 65" Class The Frame QLED 4K Smart TV 2024'
      : 'Dyson V15 Detect Absolute Vacuum Cleaner - Yellow/Nickel';
    const price = isTV ? 5499 : 1999;
    const mrp = isTV ? 6499 : 2499;

    return this.formatProductData({
      platform: 'eXtra Stores',
      url,
      externalProductId: isTV ? 'SAM-FRAME-65-2024' : 'DYS-V15-YEL',
      title,
      description: 'Demo mock data for local testing (eXtra).',
      price,
      mrp,
      currency: 'SAR',
      availability: 'In Stock',
      rating: 4.5,
      reviewCount: 512,
      image: isTV
        ? 'https://image.extra.com/400x400/products/samsung-65-frame.jpg'
        : 'https://image.extra.com/400x400/products/dyson-v15.jpg',
      seller: 'eXtra Stores',
      brand: isTV ? 'Samsung' : 'Dyson',
      category: isTV ? 'Televisions' : 'Vacuum Cleaners',
    });
  }
}

export default ExtraScraper;
