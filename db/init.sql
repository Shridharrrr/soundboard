CREATE SCHEMA IF NOT EXISTS analytics;

DROP TABLE IF EXISTS analytics.orders_raw CASCADE;

CREATE TABLE analytics.orders_raw (
  order_id     bigint PRIMARY KEY,
  order_date   date NOT NULL,
  customer_id  int  NOT NULL,
  region       text NOT NULL,   -- Northeast, Southeast, Southwest, Midwest, West
  category     text NOT NULL,   -- Electronics, Apparel, Home, Beauty, Sports, Grocery, Toys, Books
  channel      text NOT NULL,   -- Web, Mobile App, Retail Store, Marketplace
  units        int  NOT NULL,
  amount       numeric(12,2) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_orders_order_date ON analytics.orders_raw (order_date);

CREATE OR REPLACE VIEW analytics.fact_orders AS SELECT * FROM analytics.orders_raw;

DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'voice_ro') THEN
    CREATE ROLE voice_ro LOGIN PASSWORD 'voice_ro';
  END IF;
END
$$;

GRANT USAGE ON SCHEMA analytics TO voice_ro;
GRANT SELECT ON analytics.fact_orders TO voice_ro;   -- view only, not the raw table
ALTER ROLE voice_ro SET statement_timeout = '5s';
