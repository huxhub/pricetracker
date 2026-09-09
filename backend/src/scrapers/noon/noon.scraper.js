import BaseScraper from '../base/scraper.interface.js';
import { extractBrand } from '../../utils/product.utils.js';
import * as cheerio from 'cheerio';
import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';
import { execFile } from 'child_process';
import { promisify } from 'util';
import { fileURLToPath } from 'url';

const execFileAsync = promisify(execFile);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const pythonDir = path.resolve(__dirname, '../../../../backend_python');
const pythonExe = process.platform === 'win32'
  ? path.join(pythonDir, 'venv', 'Scripts', 'python.exe')
  : path.join(pythonDir, 'venv', 'bin', 'python');
const pythonScript = path.join(pythonDir, 'scraper.py');

/**
 * Noon Saudi Arabia Provider
 * Compliant provider powered by SeleniumBase UC Mode on-demand runner:
 * - SUCCESS: Product details and price legitimately extracted
 * - BLOCKED: Intercepted by Akamai / CDN bot protection (403, HTTP2 reset, sensor block)
 * - NOT_FOUND: Product SKU does not exist on Noon (404)
 * - UNAVAILABLE: Product listing exists but is currently out of stock
 * - PARSER_ERROR: Page retrieved but price could not be located
 */
export class NoonScraper extends BaseScraper {
  constructor() {
    super('Noon Saudi Arabia', 'noon_sa');
  }

  /**
   * Run standalone Python SeleniumBase UC mode scraper on-demand
   * @param {string} targetUrl - Normalized product URL
   * @param {object} options - Scrape options
   * @returns {Promise<object>} Parsed scraper result
   */
  async _runPythonScraper(targetUrl, options = {}) {
    const execPath = fs.existsSync(pythonExe) ? pythonExe : 'python';
    const isHeadless = options.headless !== false;
    const args = [pythonScript, targetUrl, '--json'];
    if (isHeadless) args.push('--headless');
    else args.push('--visible');

    try {
      const { stdout } = await execFileAsync(execPath, args, {
        cwd: pythonDir,
        timeout: options.timeout || 60000,
        maxBuffer: 10 * 1024 * 1024,
      });

      // Extract machine-readable JSON between delimiter tags
      const match = stdout.match(/###JSON_OUTPUT_START###\s*([\s\S]*?)\s*###JSON_OUTPUT_END###/);
      if (!match) {
        throw new Error(`Failed to parse Python scraper output: ${stdout.slice(-300)}`);
      }

      return JSON.parse(match[1]);
    } catch (err) {
      if (err.killed || err.code === 'ETIMEDOUT') {
        const timeoutErr = new Error('Noon Python scraper timed out after 60s');
        timeoutErr.code = 'TIMEOUT';
        throw timeoutErr;
      }
      throw err;
    }
  }

  /**
   * Scrape a Noon Saudi product page
   * @param {string} rawUrl - Input product URL
   * @param {object} options - Scrape options
   * @returns {Promise<ProductData>}
   */
  async scrape(rawUrl, options = {}) {
    const startedAt = Date.now();
    const url = this._normalizeUrl(rawUrl);
    const externalProductId = this._extractNoonId(url) || options.externalProductId || null;

    // ── 1. Fast HTTP Probe (Direct fetch if Noon serves without challenge) ────
    try {
      const response = await fetch(url, {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
            '(KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
          'Accept-Language': 'en-SA,ar-SA;q=0.9,en;q=0.8',
          'Accept':
            'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Cache-Control': 'no-cache',
        },
        redirect: 'follow',
        signal: AbortSignal.timeout(4000),
      });

      if (response.status === 404) {
        this._logDiagnostic({
          url,
          externalProductId,
          httpStatus: 404,
          finalUrl: response.url || url,
          classification: 'NOT_FOUND',
          durationMs: Date.now() - startedAt,
          parserResult: null,
          errorCode: 'NOT_FOUND',
          reason: 'NOON_HTTP_404',
        });
        const err = new Error('Noon product not found (404)');
        err.code = 'NOT_FOUND';
        err.statusCode = 404;
        throw err;
      }

      if (response.ok) {
        const html = await response.text();
        const lowerHtml = html.toLowerCase();
        if (
          html.length > 500 &&
          !lowerHtml.includes('access denied') &&
          !lowerHtml.includes('edgesuite') &&
          !lowerHtml.includes('403 forbidden')
        ) {
          const extracted = this._extractFromHtml(html, response.url || url);
          if (extracted && extracted.price > 0) {
            this._logDiagnostic({
              url,
              externalProductId,
              httpStatus: 200,
              finalUrl: response.url || url,
              classification: 'SUCCESS',
              durationMs: Date.now() - startedAt,
              parserResult: { title: extracted.title, price: extracted.price, currency: extracted.currency },
              errorCode: null,
              reason: 'SUCCESS_HTTP_FETCH',
            });
            return extracted;
          }
        }
      }
    } catch (httpErr) {
      if (httpErr.code === 'NOT_FOUND') throw httpErr;
      // Fetch timed out or blocked — proceed to Python UC runner
    }

    // ── 2. On-Demand Python SeleniumBase UC Runner (Akamai Bypass Engine) ──────
    console.log(`[NoonProvider] Invoking Python SeleniumBase UC runner for SKU: ${externalProductId || 'N/A'}`);
    let pyResult = null;
    let pyError = null;

    try {
      pyResult = await this._runPythonScraper(url, options);
    } catch (err) {
      pyError = err;
    }

    if (pyResult) {
      const durationMs = Date.now() - startedAt;

      // Handle Failures reported by Python runner
      if (!pyResult.success) {
        const status = pyResult.status || 'BLOCKED';
        const errorMsg = pyResult.error || `Noon scraper returned ${status}`;

        this._logDiagnostic({
          url,
          externalProductId,
          httpStatus: status === 'NOT_FOUND' ? 404 : (status === 'BLOCKED' ? 403 : null),
          finalUrl: pyResult.url || url,
          classification: status,
          durationMs,
          parserResult: pyResult.data ? { title: pyResult.data.title } : null,
          errorCode: status,
          reason: `PYTHON_UC_${status}`,
        });

        const err = new Error(errorMsg);
        err.code = status;
        if (status === 'NOT_FOUND') err.statusCode = 404;
        if (status === 'BLOCKED') err.statusCode = 403;
        throw err;
      }

      // Handle Success
      const data = pyResult.data;
      const formatted = this.formatProductData({
        platform: 'Noon Saudi Arabia',
        url: data.url || url,
        externalProductId: data.sku || externalProductId,
        title: data.title,
        price: data.price,
        mrp: data.mrp || undefined,
        currency: data.currency || 'SAR',
        availability: data.availability || 'In Stock',
        image: data.image || '',
        seller: data.seller || 'Noon Verified',
        brand: data.brand || extractBrand(data.title),
        rating: data.rating || null,
      });

      this._logDiagnostic({
        url,
        externalProductId,
        httpStatus: 200,
        finalUrl: data.url || url,
        classification: 'SUCCESS',
        durationMs,
        parserResult: { title: formatted.title, price: formatted.price, currency: formatted.currency },
        errorCode: null,
        reason: `SUCCESS_PYTHON_UC_${data.method || 'STEALTH'}`,
      });

      return formatted;
    }

    // ── 3. Playwright Fallback (If Python executable was unavailable) ──────────
    console.warn(`[NoonProvider] Python runner unavailable (${pyError?.message}), attempting Playwright fallback...`);
    let browser = null;
    try {
      browser = await chromium.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
      });

      const context = await browser.newContext({
        userAgent:
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
          '(KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
        viewport: { width: 1366, height: 768 },
        locale: 'en-SA',
        timezoneId: 'Asia/Riyadh',
      });

      const page = await context.newPage();
      const navResponse = await page.goto(url, { waitUntil: 'commit', timeout: 20000 });
      if (navResponse && navResponse.status() === 403) {
        const err = new Error('Noon blocked this request (Akamai 403 Access Denied)');
        err.code = 'BLOCKED';
        throw err;
      }

      await page.waitForTimeout(4000);
      const pageHtml = await page.content();
      const extracted = this._extractFromHtml(pageHtml, page.url() || url);
      if (extracted && extracted.price > 0) return extracted;

      const err = new Error('Price not found on Noon product page');
      err.code = 'PARSER_ERROR';
      throw err;
    } catch (pwErr) {
      if (pwErr.code) throw pwErr;
      const err = new Error(pyError ? pyError.message : pwErr.message);
      err.code = 'BLOCKED';
      throw err;
    } finally {
      if (browser) await browser.close().catch(() => {});
    }
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  /**
   * Normalize input Noon URL:
   * - Ensures https://www.noon.com/saudi-en/ locale if missing
   * - Ensures canonical /p/ suffix is appended to product SKU paths
   * - Handles both https://www.noon.com/saudi-en/N70211541V/ and .../p/
   */
  _normalizeUrl(url) {
    try {
      let normalized = String(url || '').trim();
      const parsed = new URL(normalized);

      // Ensure saudi-en prefix for Noon Saudi platform
      if (
        (parsed.hostname === 'www.noon.com' || parsed.hostname === 'noon.com') &&
        !parsed.pathname.startsWith('/saudi-en/') &&
        !parsed.pathname.startsWith('/saudi-ar/') &&
        !parsed.pathname.startsWith('/uae') &&
        !parsed.pathname.startsWith('/egypt')
      ) {
        parsed.pathname = `/saudi-en${parsed.pathname}`;
      }

      // Ensure SKU URLs end with /p/ (required by Noon routing)
      // e.g., /saudi-en/N70211541V/ or /saudi-en/N70211541V -> .../N70211541V/p/
      if (/\/(N[A-Z0-9]+)\/?$/i.test(parsed.pathname)) {
        parsed.pathname = parsed.pathname.replace(/\/(N[A-Z0-9]+)\/?$/i, '/$1/p/');
      }

      return parsed.toString();
    } catch {
      return url;
    }
  }

  /**
   * Extract external product ID (SKU) from Noon URL
   * e.g., N70211541V
   */
  _extractNoonId(url) {
    try {
      const parsed = new URL(url);
      const nMatch = parsed.pathname.match(/\/(N[A-Z0-9]+)(\/|$)/i);
      if (nMatch) return nMatch[1];
      const pMatch = parsed.pathname.match(/\/(p-[a-zA-Z0-9]+)(\/|$)/);
      if (pMatch) return pMatch[1];
    } catch {}
    return null;
  }

  /**
   * Structured diagnostic logger
   */
  _logDiagnostic({
    url,
    externalProductId,
    httpStatus,
    finalUrl,
    classification,
    durationMs,
    parserResult,
    errorCode,
    reason,
  }) {
    console.log(
      `[NoonProvider] [${classification}] SKU: ${externalProductId || 'N/A'} | Status: ${httpStatus || 'N/A'} | Code: ${errorCode || 'NONE'} | Duration: ${durationMs}ms | Reason: ${reason} | URL: ${url}`
    );
  }

  /**
   * Extract product data from HTML
   */
  _extractFromHtml(html, url) {
    try {
      const $ = cheerio.load(html);
      const sku = this._extractNoonId(url);

      // 1. JSON-LD
      const scripts = $('script[type="application/ld+json"]').toArray();
      for (const s of scripts) {
        try {
          const raw = $(s).html();
          if (raw) {
            const parsed = JSON.parse(raw);
            const extracted = this._parseJsonLd(parsed, url, sku);
            if (extracted) return extracted;
          }
        } catch {}
      }

      // 2. Meta Price Tags
      const metaPriceStr =
        $('meta[property="product:price:amount"]').attr('content') ||
        $('meta[itemprop="price"]').attr('content') ||
        $('meta[name="price"]').attr('content');

      const title =
        $('h1[data-qa="pdp-name"]').first().text().trim() ||
        $('h1[class*="name"]').first().text().trim() ||
        $('h1').first().text().trim() ||
        $('title').text().trim();

      const metaPrice = metaPriceStr ? parseFloat(metaPriceStr.replace(/[^0-9.]/g, '')) : null;

      if (metaPrice && metaPrice > 0 && title) {
        return this.formatProductData({
          platform: 'Noon Saudi Arabia',
          url,
          externalProductId: sku,
          title,
          price: metaPrice,
          mrp: $('meta[property="product:original_price:amount"]').attr('content') || null,
          currency: 'SAR',
          availability: 'In Stock',
          brand: extractBrand(title),
        });
      }

      // 3. DOM Selectors
      const priceStr =
        $('[data-qa="pdp-price"]').first().text().trim() ||
        $('[class*="_priceNowText_"]').first().text().trim() ||
        $('[class*="_productPrice_"]').first().text().trim() ||
        $('[class*="priceNow"]').first().text().trim() ||
        $('[class*="price-now"]').first().text().trim() ||
        $('[class*="sellingPrice"]').first().text().trim();

      const mrpStr =
        $('[data-qa="pdp-was-price"]').first().text().trim() ||
        $('[class*="wasPrice"]').first().text().trim() ||
        $('[class*="was-price"]').first().text().trim() ||
        $('[class*="price-was"]').first().text().trim();

      const image =
        $('[data-qa="pdp-image"] img').first().attr('src') ||
        $('img[class*="productImage"]').first().attr('src') ||
        $('img[class*="product-image"]').first().attr('src') ||
        '';

      const seller =
        $('[class*="soldBy"]').first().text().trim() ||
        $('[class*="seller"]').first().text().trim() ||
        '';

      if (title && priceStr) {
        const cleanPrice = parseFloat(priceStr.replace(/[^0-9.]/g, ''));
        if (cleanPrice && cleanPrice > 0) {
          return this.formatProductData({
            platform: 'Noon Saudi Arabia',
            url,
            externalProductId: sku,
            title,
            price: cleanPrice,
            mrp: mrpStr || null,
            currency: 'SAR',
            availability: 'In Stock',
            image,
            seller: seller ? seller.replace(/^sold by\s*/i, '').trim() : undefined,
            brand: extractBrand(title),
          });
        }
      }

      return null;
    } catch {
      return null;
    }
  }

  _parseJsonLd(parsed, url, fallbackSku) {
    const items = Array.isArray(parsed) ? parsed : [parsed];
    for (const item of items) {
      if (item['@type'] === 'Product') {
        const offer = Array.isArray(item.offers) ? item.offers[0] : item.offers;
        const rawPrice = offer?.price ?? offer?.lowPrice ?? null;
        const price = rawPrice !== null ? parseFloat(rawPrice) : null;
        const title = item.name || '';
        const sku = item.sku || fallbackSku;
        const isOutOfStock = offer?.availability?.includes('OutOfStock');

        if (isOutOfStock || !price || price <= 0) {
          return this.formatProductData({
            platform: 'Noon Saudi Arabia',
            url,
            externalProductId: sku,
            title: title || 'Noon Product',
            price: null,
            currency: 'SAR',
            availability: 'Out of Stock',
            brand: item.brand?.name || extractBrand(title),
          });
        }

        const sellerName = typeof offer?.seller === 'object' ? offer.seller.name : offer?.seller;

        return this.formatProductData({
          platform: 'Noon Saudi Arabia',
          url,
          externalProductId: sku,
          title,
          price,
          mrp: offer?.priceSpecification?.price || offer?.highPrice || null,
          currency: offer?.priceCurrency || 'SAR',
          availability: 'In Stock',
          image: Array.isArray(item.image) ? item.image[0] : item.image || '',
          brand: item.brand?.name || extractBrand(title),
          seller: sellerName || undefined,
          rating: item.aggregateRating?.ratingValue
            ? parseFloat(item.aggregateRating.ratingValue)
            : null,
          reviewCount: item.aggregateRating?.reviewCount
            ? parseInt(item.aggregateRating.reviewCount, 10)
            : 0,
        });
      }
    }
    return null;
  }
}

export default NoonScraper;
