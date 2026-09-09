import AmazonSaScraper from './amazon-sa/amazon-sa.scraper.js';
import NoonScraper from './noon/noon.scraper.js';
import JarirScraper from './jarir/jarir.scraper.js';
import ExtraScraper from './extra/extra.scraper.js';
import { detectPlatformSlug } from '../utils/url.utils.js';

export class ScraperRegistry {
  constructor() {
    this.registry = new Map();
    this.domainMap = new Map();

    this.register('amazon_sa', new AmazonSaScraper(), ['amazon.sa', 'amazon.com', 'amzn.to']);
    this.register('noon_sa', new NoonScraper(), ['noon.com', 'www.noon.com']);
    this.register('jarir', new JarirScraper(), ['jarir.com', 'www.jarir.com']);
    this.register('extra', new ExtraScraper(), ['extra.com', 'www.extra.com']);
  }

  register(key, scraperInstance, domains = []) {
    this.registry.set(key.toLowerCase(), scraperInstance);
    for (const domain of domains) {
      this.domainMap.set(domain.toLowerCase(), key.toLowerCase());
    }
  }

  get(key) {
    if (!key) return null;
    return this.registry.get(key.toLowerCase()) || null;
  }

  getByUrl(url) {
    const slug = detectPlatformSlug(url);
    if (slug && this.registry.has(slug)) {
      return this.registry.get(slug);
    }

    try {
      const hostname = new URL(url).hostname.toLowerCase();
      for (const [domain, key] of this.domainMap.entries()) {
        if (hostname === domain || hostname.endsWith(`.${domain}`)) {
          return this.registry.get(key);
        }
      }
    } catch {
      // invalid url
    }

    return null;
  }

  list() {
    return Array.from(this.registry.entries()).map(([key, instance]) => ({
      key,
      name: instance.name,
    }));
  }
}

const scraperRegistry = new ScraperRegistry();
export default scraperRegistry;
export { scraperRegistry };
