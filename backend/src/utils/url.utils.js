/**
 * URL parsing, validation, resolution and cleaning utilities
 */

/**
 * Validates whether string is a valid HTTPS/HTTP web URL
 */
export function isValidUrl(inputUrl) {
  try {
    const parsed = new URL(inputUrl);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

/**
 * Normalizes URL and removes tracking/affiliate query parameters
 */
export function cleanUrl(inputUrl) {
  try {
    const parsed = new URL(inputUrl);
    const host = parsed.hostname.toLowerCase();

    // Amazon Saudi Arabia — clean to canonical ASIN URL
    if (host.includes('amazon.sa') || host.includes('amazon.com') || host === 'amzn.to') {
      const asinMatch = parsed.pathname.match(/\/(?:dp|gp\/product)\/([A-Z0-9]{10})/i);
      if (asinMatch) {
        const domain = host.includes('amazon.sa') ? 'www.amazon.sa' : host;
        return `https://${domain}/dp/${asinMatch[1]}`;
      }
    }

    // Noon Saudi Arabia — keep SKU path with canonical /p/ suffix
    if (host.includes('noon.com')) {
      const nMatch = parsed.pathname.match(/\/(N[A-Z0-9]+)(\/|$)/i);
      const pMatch = parsed.pathname.match(/\/(p-[a-zA-Z0-9]+)(\/|$)/);
      if (nMatch) return `https://www.noon.com/saudi-en/${nMatch[1]}/p/`;
      if (pMatch) return `https://www.noon.com/saudi-en/${pMatch[1]}/p/`;
    }

    // Jarir — strip tracking params
    if (host.includes('jarir.com')) {
      const trackParams = ['utm_source','utm_medium','utm_campaign','ref','affid'];
      trackParams.forEach((p) => parsed.searchParams.delete(p));
      return parsed.toString();
    }

    // eXtra Stores — ensure en-sa locale
    if (host.includes('extra.com')) {
      if (!parsed.pathname.startsWith('/en-sa/') && !parsed.pathname.startsWith('/ar-sa/')) {
        parsed.pathname = `/en-sa${parsed.pathname}`;
      }
      const trackParams = ['utm_source','utm_medium','utm_campaign','ref','affid'];
      trackParams.forEach((p) => parsed.searchParams.delete(p));
      return parsed.toString();
    }

    // Strip common tracking and referral parameters
    const trackingParams = [
      'utm_source', 'utm_medium', 'utm_campaign', 'utm_term',
      'utm_content', 'ref', 'tag', 'affid', 'social_share',
      'ref_', 'qid', 'sr', 'keywords', 'sprefix', 'crid'
    ];
    trackingParams.forEach((param) => parsed.searchParams.delete(param));

    return parsed.toString();
  } catch {
    return inputUrl;
  }
}

/**
 * Extracts platform slug from URL
 * Supports full domains, subdomains, and official short URLs
 */
export function detectPlatformSlug(inputUrl) {
  try {
    const parsed = new URL(inputUrl);
    const host = parsed.hostname.toLowerCase();

    const isMatch = (domain) => host === domain || host.endsWith(`.${domain}`);

    // Saudi Arabia platforms (primary)
    if (isMatch('amazon.sa')) return 'amazon_sa';
    if (isMatch('amazon.com') || isMatch('amzn.to')) return 'amazon_sa';
    if (isMatch('noon.com')) return 'noon_sa';
    if (isMatch('jarir.com')) return 'jarir';
    if (isMatch('extra.com')) return 'extra';

    return null;
  } catch {
    return null;
  }
}

/**
 * Resolves redirects for shortened/deep-link URLs (e.g., amzn.in, dl.flipkart.com)
 * Returns the final destination URL.
 */
export async function resolveRedirectUrl(inputUrl, timeoutMs = 8000) {
  try {
    if (!isValidUrl(inputUrl)) return inputUrl;

    const parsed = new URL(inputUrl);
    const host = parsed.hostname.toLowerCase();

    // Check if this is a known redirector or shortened domain
    const isShortUrl =
      host.includes('amzn.to') ||
      host.includes('bit.ly') ||
      host.includes('tinyurl.com') ||
      parsed.pathname.startsWith('/s/') ||
      parsed.pathname.startsWith('/d/');

    if (!isShortUrl) {
      return inputUrl;
    }

    const response = await fetch(inputUrl, {
      method: 'GET',
      redirect: 'follow',
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-SA,ar-SA;q=0.9,en;q=0.8',
      },
      signal: AbortSignal.timeout(timeoutMs),
    });

    if (response.url && response.url !== inputUrl) {
      return response.url;
    }
    return inputUrl;
  } catch (error) {
    console.warn(`[URLUtils] Redirect resolution notice for ${inputUrl}: ${error.message}`);
    return inputUrl;
  }
}

/**
 * Extracts external product ID (e.g. Amazon ASIN, Flipkart PID)
 */
export function extractExternalId(inputUrl, platformSlug) {
  try {
    const parsed = new URL(inputUrl);

    if (platformSlug === 'amazon_sa' || platformSlug === 'amazon') {
      const asinMatch = parsed.pathname.match(/\/(?:dp|gp\/product)\/([A-Z0-9]{10})/i);
      if (asinMatch) return asinMatch[1];
    }

    if (platformSlug === 'noon_sa') {
      const nMatch = parsed.pathname.match(/\/(N[A-Z0-9]+)\//i);
      if (nMatch) return nMatch[1];
      const pMatch = parsed.pathname.match(/\/(p-[a-zA-Z0-9]+)\//i);
      if (pMatch) return pMatch[1];
    }

    if (platformSlug === 'jarir') {
      const skuParam = parsed.searchParams.get('sku');
      if (skuParam) return skuParam;
      const pathMatch = parsed.pathname.match(/\/([0-9]+)\.html$/);
      if (pathMatch) return pathMatch[1];
    }

    if (platformSlug === 'extra') {
      const idParam = parsed.searchParams.get('productId') || parsed.searchParams.get('id');
      if (idParam) return idParam;
      const pathMatch = parsed.pathname.match(/\/([A-Z0-9\-]{5,})\/?$/i);
      if (pathMatch) return pathMatch[1];
    }

    return null;
  } catch {
    return null;
  }
}

export default {
  isValidUrl,
  cleanUrl,
  detectPlatformSlug,
  resolveRedirectUrl,
  extractExternalId,
};
