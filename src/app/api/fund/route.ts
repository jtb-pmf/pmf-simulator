import { NextResponse } from 'next/server';
import { getOrCreateDefaultFund, updateFundParams } from '@/lib/db';
import { FundParams } from '@/types';

export async function GET() {
  try {
    const fund = await getOrCreateDefaultFund();
    return NextResponse.json(fund);
  } catch (error) {
    console.error('Error fetching fund:', error);
    return NextResponse.json({ error: 'Failed to fetch fund' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const { id, params } = await request.json() as { id: string; params: FundParams };
    const fund = await updateFundParams(id, params);
    return NextResponse.json(fund);
  } catch (error) {
    console.error('Error updating fund:', error);
    return NextResponse.json({ error: 'Failed to update fund' }, { status: 500 });
  }
}
