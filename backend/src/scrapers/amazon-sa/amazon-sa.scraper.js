import BaseScraper from '../base/scraper.interface.js';
import { extractExternalId, resolveRedirectUrl } from '../../utils/url.utils.js';
import { extractBrand } from '../../utils/product.utils.js';
import * as cheerio from 'cheerio';
import { chromium } from 'playwright';

export class AmazonSaScraper extends BaseScraper {
  constructor() {
    super('Amazon Saudi Arabia', 'amazon_sa');
  }

  async scrape(rawUrl, options = {}) {
    // 1. Resolve short / affiliate URLs (amzn.to, etc.)
    let url = rawUrl;
    if (
      url.includes('amzn.to') ||
      url.includes('amzn.in') ||
      url.includes('/d/')
    ) {
      try {
        url = await resolveRedirectUrl(rawUrl);
      } catch (err) {
        console.warn(`[AmazonSaScraper] URL resolution warning: ${err.message}`);
      }
    }

    // Ensure the URL points to amazon.sa if it was a generic redirect
    if (!url.includes('amazon.sa') && url.includes('amazon.')) {
      url = url.replace(/amazon\.[a-z.]+\//, 'amazon.sa/');
    }

    const externalId =
      extractExternalId(url, 'amazon_sa') ||
      extractExternalId(rawUrl, 'amazon_sa') ||
      extractExternalId(url, 'amazon') ||
      extractExternalId(rawUrl, 'amazon');

    let htmlContent = '';
    let browser = null;

    try {
      // 2. Lightweight stealth fetch first
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
        // Fallback to Playwright below
      }

      const isCaptcha =
        !htmlContent ||
        htmlContent.includes('Robot Check') ||
        htmlContent.includes('Enter the characters you see below') ||
        htmlContent.includes('api-services-support@amazon.com');

      // 3. Playwright fallback (en-SA / Asia/Riyadh locale)
      if (isCaptcha) {
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
          await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 25000 });

          // Try JSON-LD first
          try {
            const jsonLds = await page
              .locator('script[type="application/ld+json"]')
              .allTextContents()
              .catch(() => []);

            for (const jContent of jsonLds) {
              if (!jContent || !jContent.trim()) continue;
              try {
                const parsed = JSON.parse(jContent.trim());
                const items = Array.isArray(parsed) ? parsed : [parsed];
                for (const item of items) {
                  if (item['@type'] === 'Product' && (item.offers?.price || item.offers?.lowPrice)) {
                    const price = item.offers?.price ?? item.offers?.lowPrice;
                    const pTitle = item.name || (await page.title());
                    const rating = item.aggregateRating?.ratingValue
                      ? parseFloat(item.aggregateRating.ratingValue)
                      : null;
                    const reviewCount = item.aggregateRating?.reviewCount
                      ? parseInt(item.aggregateRating.reviewCount, 10)
                      : null;
                    const seller =
                      typeof item.offers?.seller === 'object'
                        ? item.offers.seller?.name
                        : item.offers?.seller || null;

                    console.log(`[AmazonSaScraper] Extracted via JSON-LD: "${pTitle}" - SAR ${price}`);
                    return this.formatProductData({
                      platform: 'Amazon Saudi Arabia',
                      url: page.url(),
                      externalProductId: externalId,
                      title: pTitle,
                      price,
                      mrp: null,
                      currency: 'SAR',
                      availability: 'In Stock',
                      rating,
                      reviewCount,
                      image: Array.isArray(item.image) ? item.image[0] : item.image || '',
                      seller: seller || undefined,
                      brand: extractBrand(pTitle),
                    });
                  }
                }
              } catch {}
            }
          } catch {}

          const titleEl = await page.locator('#productTitle, h1.a-size-large').first();
          if (await titleEl.isVisible({ timeout: 4000 }).catch(() => false)) {
            htmlContent = await page.content();
          }
        } catch (pwErr) {
          console.warn(`[AmazonSaScraper] Playwright browser notice: ${pwErr.message}`);
        } finally {
          if (browser) await browser.close().catch(() => {});
        }
      }

      // 4. Cheerio parsing
      if (htmlContent && !htmlContent.includes('Robot Check')) {
        const $ = cheerio.load(htmlContent);

        // JSON-LD in static HTML
        const scripts = $('script[type="application/ld+json"]').toArray();
        for (const s of scripts) {
          try {
            const raw = $(s).html();
            if (raw) {
              const parsed = JSON.parse(raw);
              const items = Array.isArray(parsed) ? parsed : [parsed];
              for (const item of items) {
                if (item['@type'] === 'Product' && (item.offers?.price || item.offers?.lowPrice)) {
                  const price = item.offers?.price ?? item.offers?.lowPrice;
                  const pTitle = item.name || $('#productTitle').text().trim();
                  const rating = item.aggregateRating?.ratingValue
                    ? parseFloat(item.aggregateRating.ratingValue)
                    : null;
                  const reviewCount = item.aggregateRating?.reviewCount
                    ? parseInt(item.aggregateRating.reviewCount, 10)
                    : null;
                  const seller =
                    typeof item.offers?.seller === 'object'
                      ? item.offers.seller?.name
                      : item.offers?.seller || null;

                  return this.formatProductData({
                    platform: 'Amazon Saudi Arabia',
                    url,
                    externalProductId: externalId,
                    title: pTitle,
                    price,
                    mrp: null,
                    currency: 'SAR',
                    availability: 'In Stock',
                    rating,
                    reviewCount,
                    image: Array.isArray(item.image) ? item.image[0] : item.image || '',
                    seller: seller || undefined,
                    brand: extractBrand(pTitle),
                  });
                }
              }
            }
          } catch {}
        }

        const title = $('#productTitle').text().trim() || $('h1.a-size-large').text().trim();
        if (title) {
          // Amazon.sa price selectors — SAR pricing may appear as "SAR X,XXX" or numeric
          const priceStr =
            $('.apexPriceToPay .a-offscreen').first().text().trim() ||
            $('.a-price .a-offscreen').first().text().trim() ||
            $('#corePriceDisplay_desktop_feature_div .a-price-whole').first().text().trim() ||
            $('#priceblock_ourprice').text().trim() ||
            $('#priceblock_dealprice').text().trim() ||
            $('.a-price-whole').first().text().trim();

          const mrpStr =
            $('.basisPrice .a-offscreen').first().text().trim() ||
            $('.a-text-price .a-offscreen').first().text().trim() ||
            $('#priceblock_retailprice').text().trim();

          const availability = $('#availability span').first().text().trim() || 'In Stock';

          const ratingStr =
            $('#acrPopover .a-size-base').first().text().trim() ||
            $('span[data-hook="rating-out-of-five"]').first().text().trim();
          const rating = ratingStr ? parseFloat(ratingStr) : null;

          const reviewStr = $('#acrCustomerReviewText').first().text().trim();
          const reviewCount = reviewStr ? this.parseNumber(reviewStr) : null;

          const image =
            $('#landingImage').attr('data-old-hires') ||
            $('#landingImage').attr('src') ||
            $('#imgBlkFront').attr('src') ||
            '';

          const seller =
            $('#merchant-info').text().trim() ||
            $('#bylineInfo').text().trim() ||
            null;

          if (priceStr) {
            return this.formatProductData({
              platform: 'Amazon Saudi Arabia',
              url,
              externalProductId: externalId,
              title,
              price: priceStr,
              mrp: mrpStr || null,
              currency: 'SAR',
              availability: availability.includes('unavailable') ? 'Out of Stock' : 'In Stock',
              rating,
              reviewCount,
              image,
              seller: seller || undefined,
              brand: extractBrand(title),
            });
          }
        }
      }

      // 5. Demo fallback only in demo mode
      if (process.env.SCRAPER_MODE === 'demo' && options.allowDemoFallback) {
        console.warn(`[AmazonSaScraper] DEMO MODE: Using simulated data for ${url}`);
        return this.generateSimulatedData(url, externalId);
      }

      const error = new Error('Price not found on Amazon Saudi Arabia product page');
      error.code = 'PRICE_NOT_FOUND';
      throw error;
    } catch (error) {
      if (error.code) throw error;
      console.warn(`[AmazonSaScraper] Extraction failure for ${url}: ${error.message}`);

      if (process.env.SCRAPER_MODE === 'demo' && options.allowDemoFallback) {
        return this.generateSimulatedData(url, externalId);
      }

      const err = new Error(`Price not found on Amazon Saudi Arabia product page: ${error.message}`);
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
      ? 'Samsung Galaxy S24 5G (Phantom Black, 256GB) | 8GB RAM'
      : 'Samsonite Cosmolite Spinner 75cm Carry-On Luggage';
    const price = isPhone ? 2999 : 749;
    const mrp = isPhone ? 3499 : 999;

    return this.formatProductData({
      platform: 'Amazon Saudi Arabia',
      url,
      externalProductId: externalId || 'B0CS5X878Z',
      title,
      description: 'Demo mock data for local testing (Saudi market).',
      price,
      mrp,
      currency: 'SAR',
      availability: 'In Stock',
      rating: 4.4,
      reviewCount: 1280,
      image: isPhone
        ? 'https://m.media-amazon.com/images/I/71cx6MYP8dL._SL1500_.jpg'
        : 'https://m.media-amazon.com/images/I/81xU9d1g4-L._SL1500_.jpg',
      seller: 'Amazon.sa',
      brand: extractBrand(title),
      category: isPhone ? 'Smartphones' : 'Luggage & Travel',
    });
  }
}

export default AmazonSaScraper;
