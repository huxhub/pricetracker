import { initDatabase } from '../src/config/database.js';

async function main() {
  console.log('Bootstrapping Price Comparison database...');
  try {
    await initDatabase();
    console.log('Database initialization and seeding completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Fatal DB init error:', error);
    process.exit(1);
  }
}

main();
