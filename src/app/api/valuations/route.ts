import { NextResponse } from 'next/server';
import { getValuationHistory, addValuationUpdate } from '@/lib/db';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const investmentId = searchParams.get('investmentId');

    if (!investmentId) {
      return NextResponse.json({ error: 'investmentId is required' }, { status: 400 });
    }

    const valuations = await getValuationHistory(investmentId);
    return NextResponse.json(valuations);
  } catch (error) {
    console.error('Error fetching valuations:', error);
    return NextResponse.json({ error: 'Failed to fetch valuations' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { investmentId, valuation, date, notes } = await request.json();

    if (!investmentId || valuation === undefined || !date) {
      return NextResponse.json({ error: 'investmentId, valuation, and date are required' }, { status: 400 });
    }

    const result = await addValuationUpdate(investmentId, valuation, date, notes);
    return NextResponse.json(result);
  } catch (error) {
    console.error('Error adding valuation:', error);
    return NextResponse.json({ error: 'Failed to add valuation' }, { status: 500 });
  }
}
