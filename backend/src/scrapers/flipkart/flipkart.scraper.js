import BaseScraper from '../base/scraper.interface.js';
import { extractExternalId, resolveRedirectUrl } from '../../utils/url.utils.js';
import { extractBrand } from '../../utils/product.utils.js';
import * as cheerio from 'cheerio';
import { chromium } from 'playwright';

export class FlipkartScraper extends BaseScraper {
  constructor() {
    super('Flipkart', 'flipkart');
  }

  async scrape(rawUrl, options = {}) {
    // 1. Resolve deep-link redirect only if not already resolved by service
    let url = rawUrl;
    if (url.includes('/s/') || url.includes('dl.flipkart.com')) {
      try {
        url = await resolveRedirectUrl(rawUrl);
      } catch (err) {
        console.warn(`[FlipkartScraper] URL resolution warning: ${err.message}`);
      }
    }

    const externalId = extractExternalId(url, 'flipkart') || extractExternalId(rawUrl, 'flipkart');
    let browser = null;

    try {
      // 2. Playwright execution with anti-bot evasion
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

      console.log(`[FlipkartScraper] Navigating to: ${url}`);
      await page.goto(url, {
        waitUntil: 'domcontentloaded',
        timeout: 30000,
      });

      const resolvedUrl = page.url();
      const pageTitle = await page.title().catch(() => '');

      // Allow async DOM / hydration scripts to complete
      await page.waitForTimeout(2000);

      // ==========================================
      // Strategy 1: Structured JSON-LD Data (Priority #1)
      // ==========================================
      try {
        const jsonLdScripts = await page
          .locator('script[type="application/ld+json"]')
          .allTextContents()
          .catch(() => []);

        for (const scriptContent of jsonLdScripts) {
          if (!scriptContent || !scriptContent.trim()) continue;
          try {
            const rawJson = JSON.parse(scriptContent.trim());
            const items = Array.isArray(rawJson) ? rawJson : [rawJson];

            for (const item of items) {
              if (item['@type'] === 'Product') {
                const productTitle = item.name || item.title || pageTitle;
                const priceVal =
                  item.offers?.price ??
                  item.offers?.lowPrice ??
                  (Array.isArray(item.offers) ? item.offers[0]?.price : null);

                if (priceVal !== null && priceVal !== undefined && priceVal !== '') {
                  const image = Array.isArray(item.image)
                    ? item.image[0]
                    : item.image || '';

                  const brand =
                    (typeof item.brand === 'object' ? item.brand?.name : item.brand) ||
                    extractBrand(productTitle);

                  const rating = item.aggregateRating?.ratingValue
                    ? parseFloat(item.aggregateRating.ratingValue)
                    : null;

                  const reviewCount = item.aggregateRating?.reviewCount
                    ? parseInt(item.aggregateRating.reviewCount, 10)
                    : null;

                  // Accurate availability parsing
                  const rawAvailability = item.offers?.availability || '';
                  const normalizedAvailability = rawAvailability.includes('OutOfStock')
                    ? 'Out of Stock'
                    : rawAvailability.includes('InStock')
                      ? 'In Stock'
                      : 'In Stock';

                  // Real seller extraction without hardcoded defaults
                  const seller =
                    typeof item.offers?.seller === 'object'
                      ? item.offers.seller?.name || null
                      : typeof item.offers?.seller === 'string'
                        ? item.offers.seller
                        : null;

                  console.log(
                    `[FlipkartScraper] Extracted via JSON-LD: "${productTitle}" - ₹${priceVal}`
                  );

                  return this.formatProductData({
                    platform: 'Flipkart',
                    url: resolvedUrl,
                    externalProductId: item.sku || externalId,
                    title: productTitle,
                    description: item.description || '',
                    price: priceVal,
                    mrp: null, // Do not assume offers.highPrice is MRP
                    availability: normalizedAvailability,
                    rating,
                    reviewCount,
                    image,
                    seller: seller || undefined,
                    brand,
                    category: item.category || 'Electronics',
                  });
                }
              }
            }
          } catch (jsonErr) {
            // continue checking next script block
          }
        }
      } catch (ldErr) {
        console.warn(`[FlipkartScraper] JSON-LD extraction notice: ${ldErr.message}`);
      }

      // ==========================================
      // Strategy 2: Multi-Selector DOM Extraction
      // ==========================================
      const extracted = await page.evaluate(() => {
        // Precise price selectors (modern and legacy Flipkart)
        const priceSelectors = [
          'div[class*="Nx9bqj"]',
          'div[class*="CxhGGd"]',
          'div._30jeq3',
          'div._16Jk6d',
          '[itemprop="price"]',
          'div[class*="price"]',
        ];

        let priceText = '';
        for (const sel of priceSelectors) {
          const el = document.querySelector(sel);
          if (el && el.textContent && el.textContent.includes('₹')) {
            priceText = el.textContent.trim();
            break;
          }
        }

        // Fallback: Scan text nodes for primary price pattern (fixed regex: ^₹\s*[\d,]+$)
        if (!priceText) {
          const allElements = document.querySelectorAll('div, span');
          for (const el of allElements) {
            if (el.children.length === 0 && /^₹\s*[\d,]+$/.test(el.textContent.trim())) {
              priceText = el.textContent.trim();
              break;
            }
          }
        }

        // Title selectors
        const titleSelectors = [
          'h1',
          'span.B_NuCI',
          'h1._6EBuvd',
          '[itemprop="name"]',
        ];
        let titleText = '';
        for (const sel of titleSelectors) {
          const el = document.querySelector(sel);
          if (el && el.textContent && el.textContent.trim().length > 3) {
            titleText = el.textContent.trim();
            break;
          }
        }

        // MRP selectors (strike-through price)
        const mrpSelectors = [
          'div._3I9_wc',
          'div[class*="yRaY8j"]',
          'div[class*="A68aAq"]',
        ];
        let mrpText = '';
        for (const sel of mrpSelectors) {
          const el = document.querySelector(sel);
          if (el && el.textContent && el.textContent.includes('₹')) {
            mrpText = el.textContent.trim();
            break;
          }
        }

        // Real rating
        const ratingEl = document.querySelector('div._3LWZlK, div.XQDdHH');
        const ratingText = ratingEl ? ratingEl.textContent.trim() : null;

        // Real reviews
        const reviewEl = document.querySelector('span._2_R_DZ, span.Wphh3N');
        const reviewText = reviewEl ? reviewEl.textContent.trim() : null;

        // Real image
        const imgEl = document.querySelector(
          'img[src*="flixcart.com/image"], img._396cs4, img.DByuf4, meta[property="og:image"]'
        );
        const imgUrl = imgEl ? imgEl.src || imgEl.getAttribute('content') || '' : '';

        // Real seller
        const sellerEl = document.querySelector('#sellerName span, div._1RLviY span');
        const sellerText = sellerEl ? sellerEl.textContent.trim() : null;

        return {
          title: titleText,
          price: priceText,
          mrp: mrpText,
          rating: ratingText,
          reviews: reviewText,
          image: imgUrl,
          seller: sellerText,
        };
      });

      if (extracted && extracted.title && extracted.price) {
        console.log(
          `[FlipkartScraper] Extracted via DOM selectors: "${extracted.title}" - ${extracted.price}`
        );
        return this.formatProductData({
          platform: 'Flipkart',
          url: resolvedUrl,
          externalProductId: externalId,
          title: extracted.title,
          price: extracted.price,
          mrp: extracted.mrp || null,
          availability: 'In Stock',
          rating: extracted.rating ? parseFloat(extracted.rating) : null,
          reviewCount: extracted.reviews ? this.parseNumber(extracted.reviews) : null,
          image: extracted.image || '',
          seller: extracted.seller || undefined,
          brand: extractBrand(extracted.title),
        });
      }

      // ==========================================
      // Strategy 3: Cheerio Full HTML Parsing (Fixed Regex: /₹\s*([\d,]+)/)
      // ==========================================
      const htmlContent = await page.content();
      const $ = cheerio.load(htmlContent);

      const title =
        $('meta[property="og:title"]').attr('content') ||
        $('h1').first().text().trim() ||
        $('title').text().trim();

      const priceMatch = htmlContent.match(/₹\s*([\d,]+)/);
      const priceStr = priceMatch ? priceMatch[1] : null;

      if (title && priceStr) {
        console.log(`[FlipkartScraper] Extracted via Cheerio regex: "${title}" - ₹${priceStr}`);
        return this.formatProductData({
          platform: 'Flipkart',
          url: resolvedUrl,
          externalProductId: externalId,
          title,
          price: priceStr,
          mrp: null,
          availability: 'In Stock',
          rating: null,
          reviewCount: null,
          image: $('meta[property="og:image"]').attr('content') || '',
          seller: undefined,
          brand: extractBrand(title),
        });
      }

      // ==========================================
      // Strategy 4: Failure in Production Mode
      // ==========================================
      if (process.env.SCRAPER_MODE === 'demo' && options.allowDemoFallback) {
        console.warn(`[FlipkartScraper] DEMO MODE: Using simulated data for ${url}`);
        return this.generateSimulatedData(url, externalId);
      }

      const error = new Error('Price not found on Flipkart product page');
      error.code = 'PRICE_NOT_FOUND';
      throw error;
    } catch (error) {
      if (error.code) throw error;
      console.warn(`[FlipkartScraper] Live extraction failure for ${url}: ${error.message}`);

      if (process.env.SCRAPER_MODE === 'demo' && options.allowDemoFallback) {
        return this.generateSimulatedData(url, externalId);
      }

      const err = new Error(`Price not found on Flipkart product page: ${error.message}`);
      err.code = 'PRICE_NOT_FOUND';
      throw err;
    } finally {
      if (browser) {
        await browser.close().catch(() => {});
      }
    }
  }

  generateSimulatedData(url, externalId) {
    const isPhone =
      url.toLowerCase().includes('galaxy') ||
      url.toLowerCase().includes('s24') ||
      url.toLowerCase().includes('iphone');
    const title = isPhone
      ? 'SAMSUNG Galaxy S24 5G (Onyx Black, 128 GB) (8 GB RAM)'
      : 'AMERICAN TOURISTER Casual 32 L Laptop Backpack (Black)';
    const price = isPhone ? 48499 : 1399;
    const mrp = isPhone ? 74999 : 2899;

    return this.formatProductData({
      platform: 'Flipkart',
      url,
      externalProductId: externalId || 'MOBGZ7GH24F',
      title,
      description: 'Demo mock data for local testing.',
      price,
      mrp,
      currency: 'INR',
      availability: 'In Stock',
      rating: 4.5,
      reviewCount: 4210,
      image: isPhone
        ? 'https://rukminim2.flixcart.com/image/832/832/xif0q/mobile/4/n/v/-original-imagx9egghfqugzh.jpeg'
        : 'https://rukminim2.flixcart.com/image/832/832/xif0q/backpack/y/b/p/-original-imaghf42u8fgpmsa.jpeg',
      seller: 'Demo Seller',
      brand: extractBrand(title),
      category: isPhone ? 'Smartphones' : 'Luggage & Backpacks',
    });
  }
}

export default FlipkartScraper;
