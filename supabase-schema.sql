-- PMF Simulator Database Schema
-- Run this in your Supabase SQL editor to create the required tables

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Funds table
CREATE TABLE IF NOT EXISTS funds (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  params JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Investments table
CREATE TABLE IF NOT EXISTS investments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  fund_id UUID NOT NULL REFERENCES funds(id) ON DELETE CASCADE,
  company_name TEXT NOT NULL,
  stage TEXT NOT NULL CHECK (stage IN ('discovery', 'conviction')),
  status TEXT NOT NULL CHECK (status IN ('active', 'exited', 'written_off')),

  -- Capital amounts
  discovery_amount NUMERIC NOT NULL DEFAULT 0,
  conviction_amount NUMERIC NOT NULL DEFAULT 0,
  follow_on_amount NUMERIC NOT NULL DEFAULT 0,

  -- Valuation
  entry_valuation NUMERIC NOT NULL,
  current_valuation NUMERIC NOT NULL,
  last_valuation_date DATE NOT NULL,

  -- Dates
  investment_date DATE NOT NULL,
  graduation_date DATE,
  exit_date DATE,

  -- Exit details
  exit_value NUMERIC,

  -- Notes
  notes TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Valuation updates table (history of valuation changes)
CREATE TABLE IF NOT EXISTS valuation_updates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  investment_id UUID NOT NULL REFERENCES investments(id) ON DELETE CASCADE,
  valuation NUMERIC NOT NULL,
  date DATE NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_investments_fund_id ON investments(fund_id);
CREATE INDEX IF NOT EXISTS idx_investments_status ON investments(status);
CREATE INDEX IF NOT EXISTS idx_investments_stage ON investments(stage);
CREATE INDEX IF NOT EXISTS idx_valuation_updates_investment_id ON valuation_updates(investment_id);
CREATE INDEX IF NOT EXISTS idx_valuation_updates_date ON valuation_updates(date);

-- Row Level Security (RLS) - Disabled for public access
-- Enable these if you want to add authentication later

-- ALTER TABLE funds ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE investments ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE valuation_updates ENABLE ROW LEVEL SECURITY;

-- Public access policies (for unauthenticated access)
-- DROP POLICY IF EXISTS "Allow public read access on funds" ON funds;
-- CREATE POLICY "Allow public read access on funds" ON funds FOR SELECT USING (true);
-- CREATE POLICY "Allow public insert on funds" ON funds FOR INSERT WITH CHECK (true);
-- CREATE POLICY "Allow public update on funds" ON funds FOR UPDATE USING (true);

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_funds_updated_at ON funds;
CREATE TRIGGER update_funds_updated_at
  BEFORE UPDATE ON funds
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_investments_updated_at ON investments;
CREATE TRIGGER update_investments_updated_at
  BEFORE UPDATE ON investments
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
