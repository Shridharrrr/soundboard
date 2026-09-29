import { getDbClient, initDbSchema } from '../apps/server/src/db.js';

export function createRng(seed = 42) {
  let s = seed;
  return function () {
    let t = (s += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const REGIONS = ['West', 'Northeast', 'Southeast', 'Southwest', 'Midwest'] as const;
const REGION_WEIGHTS = [0.30, 0.22, 0.20, 0.16, 0.12];

const CATEGORIES = [
  'Electronics',
  'Apparel',
  'Home',
  'Beauty',
  'Sports',
  'Grocery',
  'Toys',
  'Books',
] as const;
const CATEGORY_WEIGHTS = [0.26, 0.18, 0.14, 0.11, 0.10, 0.08, 0.07, 0.06];

const CHANNELS = ['Web', 'Mobile App', 'Retail Store', 'Marketplace'] as const;
const CHANNEL_WEIGHTS = [0.35, 0.30, 0.20, 0.15];

function pickWeighted<T>(items: readonly T[], weights: number[], rand: () => number): T {
  const r = rand();
  let sum = 0;
  for (let i = 0; i < items.length; i++) {
    sum += weights[i];
    if (r <= sum) return items[i];
  }
  return items[items.length - 1];
}

export interface OrderRow {
  order_id: number;
  order_date: string;
  customer_id: number;
  region: string;
  category: string;
  channel: string;
  units: number;
  amount: number;
}

export function generateOrders(): OrderRow[] {
  const rand = createRng(42);
  const startDate = new Date('2025-01-01T00:00:00Z');
  const endDate = new Date('2026-09-28T00:00:00Z');

  const totalDays = Math.round((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
  const orders: OrderRow[] = [];
  let orderId = 1;

  for (let dayOffset = 0; dayOffset < totalDays; dayOffset++) {
    const currentDate = new Date(startDate.getTime() + dayOffset * 24 * 60 * 60 * 1000);
    const dateStr = currentDate.toISOString().slice(0, 10);
    const dayOfWeek = currentDate.getUTCDay(); // 0 is Sun, 6 is Sat
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
    const year = currentDate.getUTCFullYear();
    const month = currentDate.getUTCMonth() + 1; // 1-12

    // Base orders per day around ~235 (total ~150k across 637 days)
    const baseDailyOrders = 220 + Math.floor(rand() * 32);

    for (let i = 0; i < baseDailyOrders; i++) {
      let region = pickWeighted(REGIONS, REGION_WEIGHTS, rand);
      let category = pickWeighted(CATEGORIES, CATEGORY_WEIGHTS, rand);
      let channel = pickWeighted(CHANNELS, CHANNEL_WEIGHTS, rand);

      // Weekend adjustment for Retail Store and Apparel
      if (isWeekend) {
        if (rand() < 0.35) channel = 'Retail Store';
        if (rand() < 0.30) category = 'Apparel';
      }

      const customerId = 1 + Math.floor(rand() * 5000);
      const units = 1 + Math.floor(rand() * 4);

      // Base price per category
      let basePrice = 25;
      if (category === 'Electronics') basePrice = 140;
      else if (category === 'Home') basePrice = 65;
      else if (category === 'Sports') basePrice = 50;
      else if (category === 'Apparel') basePrice = 45;
      else if (category === 'Beauty') basePrice = 30;
      else if (category === 'Toys') basePrice = 25;
      else if (category === 'Books') basePrice = 18;
      else if (category === 'Grocery') basePrice = 15;

      let amount = (basePrice * units) * (0.85 + rand() * 0.3);

      // Story 1: Southeast revenue Q3 2026 is +10% to +14% vs Q3 2025, with a visible spike in August 2026.
      if (region === 'Southeast') {
        if (year === 2025 && month >= 7 && month <= 9) {
          amount *= 1.0;
        } else if (year === 2026) {
          if (month === 7) {
            amount *= 0.90;
          } else if (month === 8) {
            // August 2026 visible spike
            amount *= 1.20;
          } else if (month === 9) {
            amount *= 0.99;
          }
        }
      }

      // Story 2: Midwest has a clear revenue dip in June 2026 (about -20% vs May)
      if (region === 'Midwest' && year === 2026) {
        if (month === 5) {
          amount *= 1.10;
        } else if (month === 6) {
          amount *= 0.82; // ~-25% relative to May
        }
      }

      // Story 3: Electronics revenue grows steadily month over month through 2026
      if (category === 'Electronics' && year === 2026) {
        // Month 1 -> 9: gradual compounding increase
        const monthlyFactor = 1.0 + (month - 1) * 0.025;
        amount *= monthlyFactor;
      }

      orders.push({
        order_id: orderId++,
        order_date: dateStr,
        customer_id: customerId,
        region,
        category,
        channel,
        units,
        amount: Math.round(amount * 100) / 100,
      });
    }
  }

  return orders;
}

export async function seedDatabase(): Promise<void> {
  console.log('[Seed] Connecting to database...');
  const client = await getDbClient(true);
  await initDbSchema(client);

  console.log('[Seed] Truncating analytics.orders_raw...');
  await client.query('TRUNCATE TABLE analytics.orders_raw CASCADE');

  console.log('[Seed] Generating ~150k orders...');
  const orders = generateOrders();
  console.log(`[Seed] Generated ${orders.length} orders. Inserting in batches...`);

  const batchSize = 1000;
  for (let i = 0; i < orders.length; i += batchSize) {
    const batch = orders.slice(i, i + batchSize);
    const valueClauses: string[] = [];
    const params: unknown[] = [];

    batch.forEach((row, idx) => {
      const offset = idx * 8;
      valueClauses.push(
        `($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4}, $${offset + 5}, $${offset + 6}, $${offset + 7}, $${offset + 8})`
      );
      params.push(
        row.order_id,
        row.order_date,
        row.customer_id,
        row.region,
        row.category,
        row.channel,
        row.units,
        row.amount
      );
    });

    const query = `
      INSERT INTO analytics.orders_raw (order_id, order_date, customer_id, region, category, channel, units, amount)
      VALUES ${valueClauses.join(', ')}
    `;
    await client.query(query, params);

    if ((i + batchSize) % 20000 === 0 || i + batchSize >= orders.length) {
      console.log(`[Seed] Inserted ${Math.min(i + batchSize, orders.length)} / ${orders.length} orders`);
    }
  }

  console.log('[Seed] Database seeded successfully!');
}

// Direct execution
if (process.argv[1]?.endsWith('seed.ts') || process.argv[1]?.endsWith('seed.js')) {
  seedDatabase()
    .then(() => process.exit(0))
    .catch(err => {
      console.error('[Seed Error]', err);
      process.exit(1);
    });
}
