import BaseScraper from '../base/scraper.interface.js';
import { extractExternalId } from '../../utils/url.utils.js';
import { extractBrand } from '../../utils/product.utils.js';
import * as cheerio from 'cheerio';
import { chromium } from 'playwright';

export class MeeshoScraper extends BaseScraper {
  constructor() {
    super('Meesho', 'meesho');
  }

  async scrape(url, options = {}) {
    const externalId = extractExternalId(url, 'meesho');
    let htmlContent = '';
    let browser = null;

    try {
      // 1. Lightweight stealth fetch
      try {
        const response = await fetch(url, {
          headers: {
            'User-Agent': this.getRandomUserAgent(),
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            'Accept-Language': 'en-IN,en;q=0.9',
          },
          signal: AbortSignal.timeout(15000),
        });
        if (response.ok) {
          htmlContent = await response.text();
        }
      } catch (e) {
        // Fallback to Playwright
      }

      // 2. Playwright fallback
      if (!htmlContent || !htmlContent.includes('₹')) {
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
            locale: 'en-IN',
            timezoneId: 'Asia/Kolkata',
          });
          const page = await context.newPage();
          await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 25000 });

          // Try JSON-LD on Meesho
          try {
            const jsonLds = await page
              .locator('script[type="application/ld+json"]')
              .allTextContents()
              .catch(() => []);

            for (const jc of jsonLds) {
              if (!jc || !jc.trim()) continue;
              try {
                const parsed = JSON.parse(jc.trim());
                const items = Array.isArray(parsed) ? parsed : [parsed];
                for (const item of items) {
                  if (item['@type'] === 'Product' && (item.offers?.price || item.offers?.lowPrice)) {
                    const price = item.offers?.price ?? item.offers?.lowPrice;
                    const pTitle = item.name || (await page.title());
                    return this.formatProductData({
                      platform: 'Meesho',
                      url: page.url(),
                      externalProductId: externalId,
                      title: pTitle,
                      price,
                      mrp: item.offers?.highPrice || null,
                      availability: 'In Stock',
                      rating: item.aggregateRating?.ratingValue
                        ? parseFloat(item.aggregateRating.ratingValue)
                        : null,
                      reviewCount: item.aggregateRating?.reviewCount
                        ? parseInt(item.aggregateRating.reviewCount, 10)
                        : null,
                      image: Array.isArray(item.image) ? item.image[0] : item.image || '',
                      seller: undefined,
                      brand: extractBrand(pTitle),
                    });
                  }
                }
              } catch {}
            }
          } catch {}

          const heading = await page.locator('h1').first();
          if (await heading.isVisible({ timeout: 4000 }).catch(() => false)) {
            htmlContent = await page.content();
          }
        } catch (pwErr) {
          console.warn(`[MeeshoScraper] Playwright browser notice: ${pwErr.message}`);
        } finally {
          if (browser) await browser.close().catch(() => {});
        }
      }

      if (htmlContent) {
        const $ = cheerio.load(htmlContent);

        const title =
          $('h1').first().text().trim() ||
          $('meta[property="og:title"]').attr('content') ||
          '';

        if (title) {
          let priceStr = '';
          let mrpStr = '';

          $('h4, span, p').each((_, el) => {
            const text = $(el).text().trim();
            if (text.startsWith('₹') && !priceStr) {
              priceStr = text;
            } else if (text.startsWith('₹') && priceStr && !mrpStr) {
              mrpStr = text;
            }
          });

          const ratingStr = $('span')
            .filter((_, el) => {
              const t = $(el).text().trim();
              return /^[1-5]\.[0-9]$/.test(t);
            })
            .first()
            .text()
            .trim();

          const rating = ratingStr ? parseFloat(ratingStr) : null;

          const image =
            $('img[alt*="product"], img[src*="images.meesho.com"]').first().attr('src') ||
            $('meta[property="og:image"]').attr('content') ||
            '';

          if (priceStr) {
            return this.formatProductData({
              platform: 'Meesho',
              url,
              externalProductId: externalId,
              title,
              price: priceStr,
              mrp: mrpStr || null,
              availability: 'In Stock',
              rating,
              reviewCount: null,
              image,
              seller: undefined,
              brand: extractBrand(title),
            });
          }
        }
      }

      if (process.env.SCRAPER_MODE === 'demo' && options.allowDemoFallback) {
        return this.generateSimulatedData(url, externalId);
      }

      const error = new Error('Price not found on Meesho product page');
      error.code = 'PRICE_NOT_FOUND';
      throw error;
    } catch (error) {
      if (error.code) throw error;
      console.warn(`[MeeshoScraper] Extraction notice: ${error.message}`);

      if (process.env.SCRAPER_MODE === 'demo' && options.allowDemoFallback) {
        return this.generateSimulatedData(url, externalId);
      }

      const err = new Error(`Price not found on Meesho product page: ${error.message}`);
      err.code = 'PRICE_NOT_FOUND';
      throw err;
    }
  }

  generateSimulatedData(url, externalId) {
    const isPhone =
      url.toLowerCase().includes('galaxy') ||
      url.toLowerCase().includes('s24') ||
      url.toLowerCase().includes('iphone');
    const title = isPhone
      ? 'Samsung Galaxy S24 (Onyx Black 128 GB 5G)'
      : 'American Tourister 32L Casual Travel & Office Bag';
    const price = isPhone ? 50200 : 1550;
    const mrp = isPhone ? 74999 : 2999;

    return this.formatProductData({
      platform: 'Meesho',
      url,
      externalProductId: externalId || 's-3849120',
      title,
      description: 'Demo mock data for local testing.',
      price,
      mrp,
      currency: 'INR',
      availability: 'In Stock',
      rating: 4.1,
      reviewCount: 920,
      image: isPhone
        ? 'https://images.meesho.com/images/products/3849120/1_512.jpg'
        : 'https://images.meesho.com/images/products/2941042/1_512.jpg',
      seller: 'Demo Seller',
      brand: extractBrand(title),
      category: isPhone ? 'Smartphones' : 'Luggage & Backpacks',
    });
  }
}

export default MeeshoScraper;
