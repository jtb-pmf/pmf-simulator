import { NextResponse } from 'next/server';
import { getInvestments, createInvestment, updateInvestment, deleteInvestment, dbInvestmentToInvestment } from '@/lib/db';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const fundId = searchParams.get('fundId');

    if (!fundId) {
      return NextResponse.json({ error: 'fundId is required' }, { status: 400 });
    }

    const investments = await getInvestments(fundId);
    return NextResponse.json(investments.map(dbInvestmentToInvestment));
  } catch (error) {
    console.error('Error fetching investments:', error);
    return NextResponse.json({ error: 'Failed to fetch investments' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { fundId, ...investment } = await request.json();

    if (!fundId) {
      return NextResponse.json({ error: 'fundId is required' }, { status: 400 });
    }

    const result = await createInvestment(fundId, investment);
    return NextResponse.json(dbInvestmentToInvestment(result));
  } catch (error) {
    console.error('Error creating investment:', error);
    return NextResponse.json({ error: 'Failed to create investment' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const { id, ...updates } = await request.json();

    if (!id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 });
    }

    const result = await updateInvestment(id, updates);
    if (!result) {
      return NextResponse.json({ error: 'Investment not found' }, { status: 404 });
    }

    return NextResponse.json(dbInvestmentToInvestment(result));
  } catch (error) {
    console.error('Error updating investment:', error);
    return NextResponse.json({ error: 'Failed to update investment' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 });
    }

    await deleteInvestment(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting investment:', error);
    return NextResponse.json({ error: 'Failed to delete investment' }, { status: 500 });
  }
}
