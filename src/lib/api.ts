import { FundParams, Investment } from '@/types';

const API_BASE = '/api';

// Fund API
export async function fetchFund() {
  const res = await fetch(`${API_BASE}/fund`);
  if (!res.ok) throw new Error('Failed to fetch fund');
  return res.json();
}

export async function saveFundParams(id: string, params: FundParams) {
  const res = await fetch(`${API_BASE}/fund`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id, params }),
  });
  if (!res.ok) throw new Error('Failed to save fund params');
  return res.json();
}

// Investments API
export async function fetchInvestments(fundId: string): Promise<Investment[]> {
  const res = await fetch(`${API_BASE}/investments?fundId=${fundId}`);
  if (!res.ok) throw new Error('Failed to fetch investments');
  return res.json();
}

export async function createInvestmentApi(
  fundId: string,
  investment: Omit<Investment, 'id' | 'createdAt' | 'updatedAt' | 'totalInvested' | 'exitMultiple'>
): Promise<Investment> {
  const res = await fetch(`${API_BASE}/investments`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ fundId, ...investment }),
  });
  if (!res.ok) throw new Error('Failed to create investment');
  return res.json();
}

export async function updateInvestmentApi(
  id: string,
  updates: Partial<Investment>
): Promise<Investment> {
  const res = await fetch(`${API_BASE}/investments`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id, ...updates }),
  });
  if (!res.ok) throw new Error('Failed to update investment');
  return res.json();
}

export async function deleteInvestmentApi(id: string): Promise<void> {
  const res = await fetch(`${API_BASE}/investments?id=${id}`, {
    method: 'DELETE',
  });
  if (!res.ok) throw new Error('Failed to delete investment');
}

// Valuations API
export async function addValuationApi(
  investmentId: string,
  valuation: number,
  date: string,
  notes?: string
) {
  const res = await fetch(`${API_BASE}/valuations`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ investmentId, valuation, date, notes }),
  });
  if (!res.ok) throw new Error('Failed to add valuation');
  return res.json();
}
