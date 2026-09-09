/**
 * Product title normalization and attribute extraction utilities
 */

/**
 * Normalizes title for consistent deduplication and matching
 */
export function normalizeTitle(title) {
  if (!title) return '';
  return title
    .toLowerCase()
    .replace(/[^\w\s]/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Attempts to extract brand from title or category
 */
export function extractBrand(title) {
  if (!title) return 'Generic';
  const knownBrands = [
    'Apple', 'Samsung', 'OnePlus', 'Xiaomi', 'Redmi', 'Realme', 'Google',
    'Sony', 'Boat', 'Noise', 'Dell', 'HP', 'Lenovo', 'Asus', 'Acer',
    'Nike', 'Adidas', 'Puma', 'American Tourister', 'Skybags', 'VIP',
    'Philips', 'LG', 'Whirlpool', 'Poco', 'Motorola', 'Nothing'
  ];

  const lower = title.toLowerCase();
  for (const brand of knownBrands) {
    if (lower.includes(brand.toLowerCase())) {
      return brand;
    }
  }
  return 'Generic';
}

/**
 * Extracts variant specs like storage, ram, color from title
 */
export function extractVariants(title) {
  if (!title) return {};
  const specs = {};

  const storageMatch = title.match(/(\d{1,4}\s*(?:gb|tb))/i);
  if (storageMatch) specs.storage = storageMatch[1].toUpperCase().replace(/\s+/g, '');

  const ramMatch = title.match(/(\d{1,2}\s*gb\s*ram)/i);
  if (ramMatch) specs.ram = ramMatch[1].toUpperCase().replace(/\s+/g, '');

  if (/\b5g\b/i.test(title)) specs.network = '5G';
  else if (/\b4g\b/i.test(title)) specs.network = '4G';

  return specs;
}

export default {
  normalizeTitle,
  extractBrand,
  extractVariants,
};
