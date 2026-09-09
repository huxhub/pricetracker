import { parsePrice, calculateDiscount } from '../../utils/price.utils.js';

/**
 * Base Scraper Abstract Interface
 * Every platform scraper must inherit from this class and implement the scrape() method.
 */
export class BaseScraper {
  constructor(name, scraperKey) {
    if (new.target === BaseScraper) {
      throw new TypeError('Cannot construct BaseScraper instances directly');
    }
    this.name = name;
    this.scraperKey = scraperKey;
  }

  /**
   * Abstract scrape method
   * @param {string} url - Target product URL
   * @returns {Promise<ProductData>} Standardized product data
   */
  async scrape(url, options = {}) {
    throw new Error(`Method 'scrape()' must be implemented by ${this.name} scraper.`);
  }

  /**
   * Helper to format standardized ProductData matching Section 10 specification
   */
  formatProductData({
    platform,
    url,
    externalProductId,
    title,
    description = '',
    price,
    mrp = null,
    discount = null,
    currency = 'SAR',
    image = '',
    images = [],
    availability = 'In Stock',
    rating = null,
    reviewCount = 0,
    seller = '',
    category = '',
    brand = '',
    specifications = {},
  }) {
    const cleanPrice = parsePrice(price);
    const cleanMrp = parsePrice(mrp);
    const computedDiscount = discount !== null ? Number(discount) : calculateDiscount(cleanPrice, cleanMrp);

    return {
      platform: platform || this.name,
      url,
      externalProductId: externalProductId || undefined,
      title: (title || '').trim(),
      description: (description || '').trim(),
      price: cleanPrice,
      mrp: cleanMrp || undefined,
      discount: computedDiscount || undefined,
      currency: currency || 'SAR',
      image: image || (images.length > 0 ? images[0] : ''),
      images: images || [],
      availability: availability || 'In Stock',
      rating: rating ? Number(rating) : undefined,
      reviewCount: reviewCount ? parseInt(reviewCount, 10) : 0,
      seller: seller ? seller.trim() : undefined,
      category: category ? category.trim() : undefined,
      brand: brand ? brand.trim() : undefined,
      specifications: specifications || {},
      scrapedAt: new Date(),
    };
  }

  parseNumber(text) {
    if (!text) return 0;
    const cleaned = String(text).replace(/[^\d]/g, '');
    return cleaned ? parseInt(cleaned, 10) : 0;
  }

  getRandomUserAgent() {
    const userAgents = [
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:127.0) Gecko/20100101 Firefox/127.0',
    ];
    return userAgents[Math.floor(Math.random() * userAgents.length)];
  }
}

export default BaseScraper;
