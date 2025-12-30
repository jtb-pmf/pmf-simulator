import { createClient } from '@supabase/supabase-js';
import { DbFund, DbInvestment, DbValuationUpdate, FundParams, Investment, ValuationUpdate } from '@/types';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Fund operations
export async function getFund(id: string): Promise<DbFund | null> {
  const { data, error } = await supabase
    .from('funds')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    console.error('Error fetching fund:', error);
    return null;
  }

  return data;
}

export async function getOrCreateDefaultFund(): Promise<DbFund> {
  const { data: existing } = await supabase
    .from('funds')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (existing) {
    return existing;
  }

  // Create default fund
  const { data: newFund, error } = await supabase
    .from('funds')
    .insert({
      name: 'PMF Fund I',
      params: {
        fundSize: 25_000_000,
        fundLife: 10,
        mgmtFeeRate: 0.02,
        mgmtFeeFullYears: 4,
        mgmtFeeStepdown: 0.7,
        carry: 0.20,
        discoveryCheckSize: 100_000,
        maxDiscoveryChecks: 75,
        convictionCheckSize: 400_000,
        convictionCheckMin: 250_000,
        convictionCheckMax: 750_000,
        graduationRate: 0.25,
        followOnReservePercent: 0.20,
      } as FundParams,
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create fund: ${error.message}`);
  }

  return newFund;
}

export async function updateFundParams(id: string, params: FundParams): Promise<DbFund | null> {
  const { data, error } = await supabase
    .from('funds')
    .update({ params, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Error updating fund:', error);
    return null;
  }

  return data;
}

// Investment operations
export async function getInvestments(fundId: string): Promise<DbInvestment[]> {
  const { data, error } = await supabase
    .from('investments')
    .select('*')
    .eq('fund_id', fundId)
    .order('investment_date', { ascending: false });

  if (error) {
    console.error('Error fetching investments:', error);
    return [];
  }

  return data || [];
}

export async function createInvestment(
  fundId: string,
  investment: Omit<Investment, 'id' | 'createdAt' | 'updatedAt' | 'totalInvested'>
): Promise<DbInvestment | null> {
  const { data, error } = await supabase
    .from('investments')
    .insert({
      fund_id: fundId,
      company_name: investment.companyName,
      stage: investment.stage,
      status: investment.status,
      discovery_amount: investment.discoveryAmount,
      conviction_amount: investment.convictionAmount,
      follow_on_amount: investment.followOnAmount,
      entry_valuation: investment.entryValuation,
      current_valuation: investment.currentValuation,
      last_valuation_date: investment.lastValuationDate,
      investment_date: investment.investmentDate,
      graduation_date: investment.graduationDate || null,
      exit_date: investment.exitDate || null,
      exit_value: investment.exitValue || null,
      notes: investment.notes || null,
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating investment:', error);
    return null;
  }

  return data;
}

export async function updateInvestment(
  id: string,
  updates: Partial<DbInvestment>
): Promise<DbInvestment | null> {
  const { data, error } = await supabase
    .from('investments')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Error updating investment:', error);
    return null;
  }

  return data;
}

export async function deleteInvestment(id: string): Promise<boolean> {
  const { error } = await supabase
    .from('investments')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error deleting investment:', error);
    return false;
  }

  return true;
}

// Valuation update operations
export async function getValuationHistory(investmentId: string): Promise<DbValuationUpdate[]> {
  const { data, error } = await supabase
    .from('valuation_updates')
    .select('*')
    .eq('investment_id', investmentId)
    .order('date', { ascending: false });

  if (error) {
    console.error('Error fetching valuation history:', error);
    return [];
  }

  return data || [];
}

export async function addValuationUpdate(
  investmentId: string,
  valuation: number,
  date: string,
  notes?: string
): Promise<DbValuationUpdate | null> {
  // Insert valuation update
  const { data: valuationData, error: valuationError } = await supabase
    .from('valuation_updates')
    .insert({
      investment_id: investmentId,
      valuation,
      date,
      notes: notes || null,
    })
    .select()
    .single();

  if (valuationError) {
    console.error('Error adding valuation update:', valuationError);
    return null;
  }

  // Update investment's current valuation
  await supabase
    .from('investments')
    .update({
      current_valuation: valuation,
      last_valuation_date: date,
      updated_at: new Date().toISOString(),
    })
    .eq('id', investmentId);

  return valuationData;
}

// Helper to convert DB investment to frontend type
export function dbInvestmentToInvestment(db: DbInvestment): Investment {
  return {
    id: db.id,
    companyName: db.company_name,
    stage: db.stage,
    status: db.status,
    discoveryAmount: db.discovery_amount,
    convictionAmount: db.conviction_amount,
    followOnAmount: db.follow_on_amount,
    totalInvested: db.discovery_amount + db.conviction_amount + db.follow_on_amount,
    entryValuation: db.entry_valuation,
    currentValuation: db.current_valuation,
    lastValuationDate: db.last_valuation_date,
    investmentDate: db.investment_date,
    graduationDate: db.graduation_date || undefined,
    exitDate: db.exit_date || undefined,
    exitValue: db.exit_value || undefined,
    exitMultiple: db.exit_value
      ? db.exit_value / (db.discovery_amount + db.conviction_amount + db.follow_on_amount)
      : undefined,
    notes: db.notes || undefined,
    createdAt: db.created_at,
    updatedAt: db.updated_at,
  };
}

// Portfolio summary
export interface PortfolioSummary {
  totalInvested: number;
  discoveryCount: number;
  convictionCount: number;
  activeCount: number;
  exitedCount: number;
  writtenOffCount: number;
  totalCurrentValue: number;
  unrealizedGain: number;
  realizedGain: number;
  moic: number;
}

export function calculatePortfolioSummary(investments: Investment[]): PortfolioSummary {
  let totalInvested = 0;
  let discoveryCount = 0;
  let convictionCount = 0;
  let activeCount = 0;
  let exitedCount = 0;
  let writtenOffCount = 0;
  let totalCurrentValue = 0;
  let realizedGain = 0;

  for (const inv of investments) {
    totalInvested += inv.totalInvested;

    if (inv.stage === 'discovery') discoveryCount++;
    if (inv.stage === 'conviction') convictionCount++;

    if (inv.status === 'active') {
      activeCount++;
      totalCurrentValue += inv.currentValuation;
    } else if (inv.status === 'exited') {
      exitedCount++;
      realizedGain += (inv.exitValue || 0) - inv.totalInvested;
    } else if (inv.status === 'written_off') {
      writtenOffCount++;
    }
  }

  const unrealizedGain = totalCurrentValue - investments
    .filter(i => i.status === 'active')
    .reduce((sum, i) => sum + i.totalInvested, 0);

  const moic = totalInvested > 0
    ? (totalCurrentValue + realizedGain + totalInvested) / totalInvested
    : 0;

  return {
    totalInvested,
    discoveryCount,
    convictionCount,
    activeCount,
    exitedCount,
    writtenOffCount,
    totalCurrentValue,
    unrealizedGain,
    realizedGain,
    moic,
  };
}
