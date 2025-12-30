import { pgTable, uuid, text, numeric, date, timestamp, jsonb } from 'drizzle-orm/pg-core';

export const funds = pgTable('funds', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  params: jsonb('params').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const investments = pgTable('investments', {
  id: uuid('id').primaryKey().defaultRandom(),
  fundId: uuid('fund_id').notNull().references(() => funds.id, { onDelete: 'cascade' }),
  companyName: text('company_name').notNull(),
  stage: text('stage').notNull(), // 'discovery' | 'conviction'
  status: text('status').notNull(), // 'active' | 'exited' | 'written_off'

  // Capital amounts
  discoveryAmount: numeric('discovery_amount').notNull().default('0'),
  convictionAmount: numeric('conviction_amount').notNull().default('0'),
  followOnAmount: numeric('follow_on_amount').notNull().default('0'),

  // Valuation
  entryValuation: numeric('entry_valuation').notNull(),
  currentValuation: numeric('current_valuation').notNull(),
  lastValuationDate: date('last_valuation_date').notNull(),

  // Dates
  investmentDate: date('investment_date').notNull(),
  graduationDate: date('graduation_date'),
  exitDate: date('exit_date'),

  // Exit details
  exitValue: numeric('exit_value'),

  // Notes
  notes: text('notes'),

  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const valuationUpdates = pgTable('valuation_updates', {
  id: uuid('id').primaryKey().defaultRandom(),
  investmentId: uuid('investment_id').notNull().references(() => investments.id, { onDelete: 'cascade' }),
  valuation: numeric('valuation').notNull(),
  date: date('date').notNull(),
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow(),
});

// Type exports
export type Fund = typeof funds.$inferSelect;
export type NewFund = typeof funds.$inferInsert;
export type Investment = typeof investments.$inferSelect;
export type NewInvestment = typeof investments.$inferInsert;
export type ValuationUpdate = typeof valuationUpdates.$inferSelect;
export type NewValuationUpdate = typeof valuationUpdates.$inferInsert;
