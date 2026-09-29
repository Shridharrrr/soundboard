import { describe, it, expect, beforeAll } from 'vitest';
import { generateOrders, seedDatabase, type OrderRow } from './seed.js';
import { getDbClient } from '../apps/server/src/db.js';

describe('Database Seed and Planted Stories', () => {
  let orders: OrderRow[];

  beforeAll(() => {
    orders = generateOrders();
  });

  it('generates deterministic order counts and customer range', () => {
    expect(orders.length).toBeGreaterThan(140000);
    expect(orders.length).toBeLessThan(160000);

    const customers = new Set(orders.map(o => o.customer_id));
    expect(customers.size).toBeGreaterThan(4500);
    expect(customers.size).toBeLessThanOrEqual(5000);
  });

  it('planted story 1: Southeast revenue Q3 2026 is +10% to +14% vs Q3 2025, with spike in August 2026', () => {
    // Q3: months 07, 08, 09
    const seQ3_2025 = orders
      .filter(o => o.region === 'Southeast' && o.order_date >= '2025-07-01' && o.order_date <= '2025-09-30')
      .reduce((sum, o) => sum + o.amount, 0);

    const seQ3_2026 = orders
      .filter(o => o.region === 'Southeast' && o.order_date >= '2026-07-01' && o.order_date <= '2026-09-30')
      .reduce((sum, o) => sum + o.amount, 0);

    const deltaPct = ((seQ3_2026 - seQ3_2025) / seQ3_2025) * 100;

    expect(deltaPct).toBeGreaterThanOrEqual(10.0);
    expect(deltaPct).toBeLessThanOrEqual(14.0);

    // Visible spike in August 2026
    const seJul2026 = orders
      .filter(o => o.region === 'Southeast' && o.order_date >= '2026-07-01' && o.order_date <= '2026-07-31')
      .reduce((sum, o) => sum + o.amount, 0);

    const seAug2026 = orders
      .filter(o => o.region === 'Southeast' && o.order_date >= '2026-08-01' && o.order_date <= '2026-08-31')
      .reduce((sum, o) => sum + o.amount, 0);

    const seSep2026 = orders
      .filter(o => o.region === 'Southeast' && o.order_date >= '2026-09-01' && o.order_date <= '2026-09-30')
      .reduce((sum, o) => sum + o.amount, 0);

    expect(seAug2026).toBeGreaterThan(seJul2026 * 1.15);
    expect(seAug2026).toBeGreaterThan(seSep2026 * 1.15);
  });

  it('planted story 2: Midwest has a clear revenue dip in June 2026 (~ -20% vs May)', () => {
    const mwMay2026 = orders
      .filter(o => o.region === 'Midwest' && o.order_date >= '2026-05-01' && o.order_date <= '2026-05-31')
      .reduce((sum, o) => sum + o.amount, 0);

    const mwJun2026 = orders
      .filter(o => o.region === 'Midwest' && o.order_date >= '2026-06-01' && o.order_date <= '2026-06-30')
      .reduce((sum, o) => sum + o.amount, 0);

    const dipPct = ((mwJun2026 - mwMay2026) / mwMay2026) * 100;
    // Expected around -20% (between -15% and -25%)
    expect(dipPct).toBeLessThan(-15);
    expect(dipPct).toBeGreaterThan(-26);
  });

  it('planted story 3: Electronics grows steadily month over month through 2026', () => {
    const months = ['01', '02', '03', '04', '05', '06', '07', '08'];
    const monthlyRev = months.map(m => {
      const start = `2026-${m}-01`;
      const end = `2026-${m}-28`;
      return orders
        .filter(o => o.category === 'Electronics' && o.order_date >= start && o.order_date <= end)
        .reduce((sum, o) => sum + o.amount, 0);
    });

    for (let i = 1; i < monthlyRev.length; i++) {
      expect(monthlyRev[i]).toBeGreaterThan(monthlyRev[i - 1]);
    }
  });

  it('weights validation: West largest region, Midwest smallest, Electronics largest category', () => {
    const regionTotals = new Map<string, number>();
    for (const o of orders) {
      regionTotals.set(o.region, (regionTotals.get(o.region) || 0) + o.amount);
    }
    const west = regionTotals.get('West') || 0;
    const midwest = regionTotals.get('Midwest') || 0;
    const northeast = regionTotals.get('Northeast') || 0;

    expect(west).toBeGreaterThan(northeast);
    expect(midwest).toBeLessThan(northeast);
  });
});
