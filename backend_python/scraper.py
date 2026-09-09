"""
Noon Saudi Arabia Scraper using SeleniumBase UC Mode (Undetected-Chromedriver)
Standalone module for testing Akamai bot-bypass feasibility.
"""

import os
import sys
import re
import json
import time
from urllib.parse import urlparse
from bs4 import BeautifulSoup
from seleniumbase import Driver
from dotenv import load_dotenv

load_dotenv()
DEFAULT_HEADLESS = os.getenv("HEADLESS", "true").strip().lower() in ("true", "1", "yes")

def normalize_noon_url(raw_url: str) -> str:
    """Ensure canonical Noon Saudi URL format with /p/ suffix."""
    url = raw_url.strip()
    parsed = urlparse(url)
    
    # Ensure saudi-en locale
    path = parsed.path
    if not any(path.startswith(prefix) for prefix in ['/saudi-en/', '/saudi-ar/', '/uae', '/egypt']):
        path = f"/saudi-en{path}"
        
    # Ensure /p/ suffix on SKU
    sku_match = re.search(r'(/(N[A-Z0-9]+))/?$', path, re.IGNORECASE)
    if sku_match:
        path = re.sub(r'(/(N[A-Z0-9]+))/?$', r'\1/p/', path, flags=re.IGNORECASE)
        
    return f"{parsed.scheme or 'https'}://www.noon.com{path}"

def extract_sku(url: str) -> str | None:
    """Extract product SKU identifier (e.g. N70211541V)."""
    match = re.search(r'/(N[A-Z0-9]+)(/|$)', url, re.IGNORECASE)
    return match.group(1) if match else None

def parse_product_html(html: str, final_url: str) -> dict | None:
    """Extract product metadata and price from page HTML."""
    soup = BeautifulSoup(html, 'html.parser')
    sku = extract_sku(final_url)
    
    # 1. Parse JSON-LD structured data
    for script in soup.find_all('script', type='application/ld+json'):
        try:
            data = json.loads(script.string or '')
            items = data if isinstance(data, list) else [data]
            for item in items:
                if item.get('@type') == 'Product':
                    offers = item.get('offers', {})
                    if isinstance(offers, list):
                        offers = offers[0] if offers else {}
                    
                    price = offers.get('price') or offers.get('lowPrice')
                    mrp = offers.get('priceSpecification', {}).get('price') or offers.get('highPrice')
                    title = item.get('name')
                    availability = offers.get('availability', '')
                    seller = offers.get('seller', {})
                    seller_name = seller.get('name') if isinstance(seller, dict) else seller
                    
                    images = item.get('image', [])
                    if isinstance(images, list):
                        image = images[0] if images else ''
                    else:
                        image = str(images) if images else ''
                        
                    brand_val = item.get('brand', {})
                    brand = brand_val.get('name') if isinstance(brand_val, dict) else brand_val
                    
                    if title and price:
                        return {
                            'platform': 'Noon Saudi Arabia',
                            'sku': sku or item.get('sku'),
                            'url': final_url,
                            'title': title.strip(),
                            'price': float(price),
                            'mrp': float(mrp) if mrp else None,
                            'currency': offers.get('priceCurrency', 'SAR'),
                            'availability': 'Out of Stock' if 'OutOfStock' in availability else 'In Stock',
                            'image': image,
                            'brand': brand or '',
                            'seller': seller_name or 'Noon Verified',
                            'rating': item.get('aggregateRating', {}).get('ratingValue'),
                            'method': 'JSON-LD'
                        }
        except Exception:
            continue

    # 2. DOM Selectors fallback
    title_elem = soup.find('h1', {'data-qa': 'pdp-name'}) or soup.find('h1')
    title = title_elem.get_text(strip=True) if title_elem else ''
    
    price_elem = soup.find(attrs={'data-qa': 'pdp-price'}) or soup.find(class_=lambda c: c and 'priceNow' in c)
    price_str = price_elem.get_text(strip=True) if price_elem else ''
    
    mrp_elem = soup.find(attrs={'data-qa': 'pdp-was-price'}) or soup.find(class_=lambda c: c and 'wasPrice' in c)
    mrp_str = mrp_elem.get_text(strip=True) if mrp_elem else ''
    
    img_elem = soup.find('img', attrs={'data-qa': 'pdp-image'}) or soup.find('img', class_=lambda c: c and 'productImage' in c)
    img_src = img_elem.get('src') or '' if img_elem else ''
    
    if title and price_str:
        clean_price = re.sub(r'[^\d.]', '', price_str)
        clean_mrp = re.sub(r'[^\d.]', '', mrp_str) if mrp_str else None
        if clean_price:
            return {
                'platform': 'Noon Saudi Arabia',
                'sku': sku,
                'url': final_url,
                'title': title,
                'price': float(clean_price),
                'mrp': float(clean_mrp) if clean_mrp else None,
                'currency': 'SAR',
                'availability': 'In Stock',
                'image': img_src,
                'seller': 'Noon Verified',
                'method': 'DOM'
            }
            
    return None

def scrape_noon(url: str, headless: bool = DEFAULT_HEADLESS, timeout: int = 30) -> dict:
    """
    Scrape Noon product using SeleniumBase Undetected-Chromedriver (UC Mode).
    
    Parameters:
        url: Target Noon URL (e.g. https://www.noon.com/saudi-en/N70211541V/p/)
        headless: Run browser in background (True to hide UI, False to show browser)
        timeout: Maximum seconds to wait for page to render
    """
    target_url = normalize_noon_url(url)
    sku = extract_sku(target_url)
    start_time = time.time()
    
    print(f"[SeleniumBase] Initializing UC Mode Driver (headless={headless})...")
    driver = None
    try:
        # Launch undetected-chromedriver with remote debugging CDP
        driver = Driver(uc=True, headless=headless, incognito=True)
        driver.set_window_size(1366, 768)
        
        print(f"[SeleniumBase] Navigating to: {target_url}")
        driver.uc_open_with_reconnect(target_url, reconnect_time=4)
        
        # Give Akamai behavioral sensor and Next.js hydration time to complete
        time.sleep(5)
        
        final_url = driver.current_url
        page_title = driver.title
        print(f"[SeleniumBase] Loaded: {page_title} (URL: {final_url})")
        
        html = driver.page_source
        lower_html = html.lower()
        
        # Check Akamai block indicators
        if 'access denied' in lower_html or '403 forbidden' in lower_html or 'edgesuite' in lower_html:
            return {
                'success': False,
                'status': 'BLOCKED',
                'error': 'Akamai 403 Access Denied detected in page source',
                'sku': sku,
                'url': final_url,
                'duration_s': round(time.time() - start_time, 2)
            }
            
        if 'captcha' in lower_html or 'robot check' in lower_html:
            return {
                'success': False,
                'status': 'BLOCKED',
                'error': 'Akamai CAPTCHA / bot challenge triggered',
                'sku': sku,
                'url': final_url,
                'duration_s': round(time.time() - start_time, 2)
            }
            
        # Check 404 Not Found
        if 'page not found' in lower_html or 'product not found' in lower_html or '404' in page_title.lower():
            return {
                'success': False,
                'status': 'NOT_FOUND',
                'error': 'Noon product not found (404)',
                'sku': sku,
                'url': final_url,
                'duration_s': round(time.time() - start_time, 2)
            }

        product = parse_product_html(html, final_url)
        if product:
            if product.get('availability') == 'Out of Stock' or not product.get('price'):
                return {
                    'success': False,
                    'status': 'UNAVAILABLE',
                    'error': 'Noon product is currently out of stock or unavailable',
                    'data': product,
                    'sku': sku,
                    'url': final_url,
                    'duration_s': round(time.time() - start_time, 2)
                }

            return {
                'success': True,
                'status': 'SUCCESS',
                'data': product,
                'duration_s': round(time.time() - start_time, 2)
            }
        else:
            return {
                'success': False,
                'status': 'PARSER_ERROR',
                'error': 'Page rendered but price/product selectors could not be extracted',
                'sku': sku,
                'url': final_url,
                'duration_s': round(time.time() - start_time, 2)
            }
            
    except Exception as e:
        return {
            'success': False,
            'status': 'ERROR',
            'error': str(e),
            'sku': sku,
            'url': target_url,
            'duration_s': round(time.time() - start_time, 2)
        }
    finally:
        if driver:
            try:
                driver.quit()
            except Exception:
                pass

if __name__ == '__main__':
    default_url = 'https://www.noon.com/saudi-en/N70211541V/p/'
    args = sys.argv[1:]
    
    url = default_url
    json_only = False
    headless_override = DEFAULT_HEADLESS
    
    for arg in args:
        if arg == '--json':
            json_only = True
        elif arg == '--headless':
            headless_override = True
        elif arg == '--visible':
            headless_override = False
        elif not arg.startswith('--'):
            url = arg
            
    if not json_only:
        print(f"Testing Noon Scraping with SeleniumBase UC Mode\nURL: {url} (headless={headless_override})\n")
        
    result = scrape_noon(url, headless=headless_override)
    
    # Machine-readable output for parent process (e.g. Node.js runner)
    print("###JSON_OUTPUT_START###")
    print(json.dumps(result))
    print("###JSON_OUTPUT_END###")
    
    if not json_only:
        print("\n--- Scraper Result ---")
        print(json.dumps(result, indent=2))
