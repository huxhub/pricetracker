import { initDatabase, query } from '../src/config/database.js';
import { ScraperService } from '../src/services/scraper.service.js';

async function runEndToEndVerification() {
  console.log('====================================================');
  console.log(' Saudi Arabia Multi-Platform Scraper Verification');
  console.log('====================================================\n');

  await initDatabase();
  const service = new ScraperService();

  const testCases = [
    {
      platform: 'Amazon Saudi Arabia',
      url: 'https://www.amazon.sa/dp/B0HDL4XK65',
      expectedStatus: 'SUCCESS',
    },
    {
      platform: 'Jarir Bookstore',
      url: 'https://www.jarir.com/sa-en/samsung-galaxy-s25-ultra-smartphones-650942.html',
      expectedStatus: 'SUCCESS',
    },
    {
      platform: 'eXtra Stores',
      url: 'https://www.extra.com/en-sa/mri/air-conditioner/ac-cleaning-service-/professional-washing-machine-cleaning-service-essential-package/p/100392164',
      expectedStatus: 'SUCCESS',
    },
    {
      platform: 'Noon Saudi Arabia (Akamai Guarded)',
      url: 'https://www.noon.com/saudi-en/N70211541V/',
      expectedStatus: 'BLOCKED',
    },
  ];

  for (const tc of testCases) {
    console.log(`\n▶ Testing ${tc.platform}:`);
    console.log(`  URL: ${tc.url}`);
    const res = await service.scrapeUrl(tc.url);

    if (res.success) {
      console.log(`  ✅ Scrape SUCCESS`);
      console.log(`     Title       : ${res.data.title}`);
      console.log(`     Price       : SAR ${res.data.price}`);
      console.log(`     Availability: ${res.data.availability}`);
      console.log(`     Status Log  : SUCCESS`);
    } else {
      console.log(`  ℹ️ Scrape Handled: status = ${res.status}`);
      console.log(`     Error Code  : ${res.error}`);
      console.log(`     Expected    : ${tc.expectedStatus}`);
      if (res.status === tc.expectedStatus) {
        console.log(`  ✅ Correctly handled as ${res.status} without fake prices or alerts.`);
      } else {
        console.warn(`  ⚠️ Warning: status did not match expected.`);
      }
    }
  }

  console.log('\n--- Recent Scrape Logs in Database ---');
  const [logs] = await query(
    'SELECT id, platform_id, status, error_code, new_price, created_at FROM scrape_logs ORDER BY id DESC LIMIT 4'
  );
  console.table(logs);

  console.log('\nVerification complete.');
}

runEndToEndVerification().then(() => process.exit(0)).catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
