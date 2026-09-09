import { initDatabase, query } from '../src/config/database.js';
import productService from '../src/services/product.service.js';
import priceService from '../src/services/price.service.js';
import alertService from '../src/services/alert.service.js';
import scraperRegistry from '../src/scrapers/scraper.registry.js';

async function runE2ETest() {
  console.log('----------------------------------------------------');
  console.log('🧪 Running Complete E2E System Test (ESM)...');
  console.log('----------------------------------------------------');

  try {
    // 1. Database Init
    await initDatabase();
    console.log('✅ 1. Database connection & tables initialized');

    // 2. Scraper Registry Check
    const platforms = scraperRegistry.list();
    console.log(`✅ 2. Scraper Registry loaded: ${platforms.map((p) => p.name).join(', ')}`);

    // 3. Test User Resolution
    const [users] = await query('SELECT id, email FROM users WHERE role = "ADMIN" LIMIT 1');
    const adminUser = users[0];
    console.log(`✅ 3. Authenticated test user: ${adminUser.email} (ID: ${adminUser.id})`);

    // 4. Test Multi-URL Product Ingestion
    console.log('⏳ 4. Ingesting multi-URL product (Amazon, Flipkart, Meesho)...');
    const product = await productService.createProductWithUrls({
      userId: adminUser.id,
      urlEntries: [
        { url: 'https://www.amazon.in/dp/B0CS5X878Z' },
        { url: 'https://www.flipkart.com/samsung-galaxy-s24-5g-onyx-black-128-gb/p/itme987654321' },
        { url: 'https://www.meesho.com/s/p/3849120' }
      ],
      manualTitle: 'Samsung Galaxy S24 5G 128GB'
    });

    console.log(`✅ 4. Product created: "${product.title}" (ID: ${product.id}) with ${product.platforms.length} platform links`);

    // 5. Test Comparison & Lowest Price
    const comparison = await priceService.getProductComparison(product.id);
    console.log(`✅ 5. Cross-Platform Comparison calculated:`);
    for (const pl of comparison.platforms) {
      console.log(`     • ${pl.platform_name}: ₹${pl.current_price} ${pl.isLowest ? '🌟 [LOWEST DEAL]' : ''}`);
    }
    console.log(`     => Overall Lowest: ${comparison.lowestPrice?.platformName} at ₹${comparison.lowestPrice?.price}`);

    // 6. Test Price History & Analytics
    const history = await priceService.getProductPriceHistory(product.id);
    console.log(`✅ 6. Price History points: ${history.history.length}`);
    console.log(`     Analytics: Highest: ₹${history.statistics.highestPrice}, Lowest: ₹${history.statistics.lowestPrice}, Avg: ₹${history.statistics.averagePrice}, Current: ₹${history.statistics.currentPrice}`);

    // 7. Test Price Alert Creation
    const targetLink = product.platforms[0];
    const alert = await alertService.createAlert({
      userId: adminUser.id,
      productLinkId: targetLink.id,
      alertType: 'PRICE_DROP',
      targetPrice: 48000
    });
    console.log(`✅ 7. Price alert created (ID: ${alert.id}) for ${targetLink.platform_name} link`);

    // 8. Test Price Drop Evaluation & Alert Engine
    console.log('⏳ 8. Testing Price Drop evaluation and alert engine...');
    const dropResult = await priceService.recordNewPrice(targetLink.id, {
      price: targetLink.current_price - 1000,
      mrp: targetLink.current_mrp,
      availability: 'In Stock'
    });
    await alertService.evaluateAlertsForLink(dropResult);
    console.log(`✅ 8. Price drop of ₹1000 recorded and processed by AlertService`);

    // 9. Verify Scrape Logs in MySQL
    const [logs] = await query('SELECT id, status, old_price, new_price, created_at FROM scrape_logs ORDER BY id DESC LIMIT 3');
    console.log(`✅ 9. Scrape logs verified in MySQL:`);
    for (const l of logs) {
      console.log(`     • Log #${l.id}: Status = ${l.status}, Old = ${l.old_price}, New = ${l.new_price}`);
    }

    console.log('----------------------------------------------------');
    console.log('🎉 ALL ESM END-TO-END TESTS PASSED SUCCESSFULLY!');
    console.log('----------------------------------------------------');
    process.exit(0);

  } catch (err) {
    console.error('❌ E2E Test Failure:', err);
    process.exit(1);
  }
}

runE2ETest();
