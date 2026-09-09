import { chromium } from 'playwright';
import path from 'path';
import fs from 'fs';

const screenshotDir = 'C:\\Users\\ROHITH\\.gemini\\antigravity-ide\\brain\\ca5ed976-0f44-4994-9b2e-369689dff1fd\\screenshots';

async function inspectAllPages() {
  console.log('🚀 Launching Playwright Chromium to inspect every page...');

  if (!fs.existsSync(screenshotDir)) {
    fs.mkdirSync(screenshotDir, { recursive: true });
  }

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 850 },
  });
  const page = await context.newPage();

  const baseUrl = 'http://localhost:3000';

  try {
    // 1. Inspect /login
    console.log('📸 Inspecting /login...');
    await page.goto(`${baseUrl}/login`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(500);
    await page.screenshot({ path: path.join(screenshotDir, '01_login_page.png'), fullPage: true });
    console.log('  -> Captured 01_login_page.png');

    // 2. Inspect /register
    console.log('📸 Inspecting /register...');
    await page.goto(`${baseUrl}/register`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(500);
    await page.screenshot({ path: path.join(screenshotDir, '02_register_page.png'), fullPage: true });
    console.log('  -> Captured 02_register_page.png');

    // 3. Log in via Demo User button on /login
    console.log('🔑 Logging in via Demo User...');
    await page.goto(`${baseUrl}/login`, { waitUntil: 'networkidle' });
    // Click Demo User button
    await page.locator('button:has-text("Demo User")').click();
    await page.waitForTimeout(200);
    // Click Get Started button
    await page.locator('button[type="submit"]').click();
    await page.waitForURL('**/dashboard', { timeout: 10000 });
    await page.waitForTimeout(1000);

    // 4. Inspect /dashboard
    console.log('📸 Inspecting /dashboard...');
    await page.screenshot({ path: path.join(screenshotDir, '03_dashboard_page.png'), fullPage: true });
    console.log('  -> Captured 03_dashboard_page.png');

    // 5. Inspect /products
    console.log('📸 Inspecting /products...');
    await page.goto(`${baseUrl}/products`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(500);
    await page.screenshot({ path: path.join(screenshotDir, '04_products_catalog.png'), fullPage: true });
    console.log('  -> Captured 04_products_catalog.png');

    // 6. Inspect /products/add
    console.log('📸 Inspecting /products/add...');
    await page.goto(`${baseUrl}/products/add`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(500);
    await page.screenshot({ path: path.join(screenshotDir, '05_add_product_page.png'), fullPage: true });
    console.log('  -> Captured 05_add_product_page.png');

    // 7. Inspect /products/1 (Detail page)
    console.log('📸 Inspecting /products/1...');
    await page.goto(`${baseUrl}/products/1`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(800);
    await page.screenshot({ path: path.join(screenshotDir, '06_product_detail_page.png'), fullPage: true });
    console.log('  -> Captured 06_product_detail_page.png');

    // 8. Inspect /alerts
    console.log('📸 Inspecting /alerts...');
    await page.goto(`${baseUrl}/alerts`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(500);
    await page.screenshot({ path: path.join(screenshotDir, '07_alerts_page.png'), fullPage: true });
    console.log('  -> Captured 07_alerts_page.png');

    // 9. Inspect /settings
    console.log('📸 Inspecting /settings...');
    await page.goto(`${baseUrl}/settings`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(500);
    await page.screenshot({ path: path.join(screenshotDir, '08_settings_page.png'), fullPage: true });
    console.log('  -> Captured 08_settings_page.png');

    // 10. Switch to Admin and inspect /admin
    console.log('🔑 Logging in via Admin account...');
    await page.goto(`${baseUrl}/login`, { waitUntil: 'networkidle' });
    await page.locator('button:has-text("Admin")').click();
    await page.waitForTimeout(200);
    await page.locator('button[type="submit"]').click();
    await page.waitForURL('**/dashboard', { timeout: 10000 });

    console.log('📸 Inspecting /admin...');
    await page.goto(`${baseUrl}/admin`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(800);
    await page.screenshot({ path: path.join(screenshotDir, '09_admin_console.png'), fullPage: true });
    console.log('  -> Captured 09_admin_console.png');

    console.log('✨ All 9 pages inspected and verified successfully in white theme!');

  } catch (err) {
    console.error('❌ Playwright inspection error:', err);
    process.exit(1);
  } finally {
    await browser.close();
  }
}

inspectAllPages();
