// app/api/budgets/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { budgets } from '@/lib/db/schema';
import { eq, desc, and } from 'drizzle-orm';
import { auth } from '@clerk/nextjs/server';

// GET handler to fetch all budgets
export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const { searchParams } = new URL(request.url);
    
    // Parse optional query parameters
    const categoryId = searchParams.get('categoryId');
    const period = searchParams.get('period');
    
    // Build filters array
    const filters = [];
    
    // Add user filter - always filter by the authenticated user
    filters.push(eq(budgets.userId, userId));
    
    // Add optional filters
    if (categoryId) {
      filters.push(eq(budgets.categoryId, categoryId));
    }
    
    if (period) {
      filters.push(eq(budgets.period, period));
    }
    
    // Execute query with prepared filters
    const budgetsList = await db
      .select()
      .from(budgets)
      .where(and(...filters))
      .orderBy(desc(budgets.startDate));
    
    return NextResponse.json({ budgets: budgetsList });
  } catch (error) {
    console.error('Error fetching budgets:', error);
    return NextResponse.json({ error: 'Failed to fetch budgets' }, { status: 500 });
  }
}

// POST handler to create a new budget
export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const body = await request.json();
    
    // Validate required fields
    const { amount, period, startDate, categoryId } = body;
    
    if (!amount || !period || !startDate) {
      return NextResponse.json(
        { error: 'Missing required fields: amount, period, and startDate are required' }, 
        { status: 400 }
      );
    }
    
    // Validate period value
    if (!['weekly', 'monthly', 'yearly'].includes(period)) {
      return NextResponse.json(
        { error: 'Invalid period value. Must be one of: weekly, monthly, yearly' }, 
        { status: 400 }
      );
    }
    
    // Create new budget
    const newBudget = await db
      .insert(budgets)
      .values({
        amount: parseFloat(amount),
        period,
        startDate: new Date(startDate),
        categoryId: categoryId || null, // Allow null for overall budget
        userId,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();
    
    return NextResponse.json({ budget: newBudget[0] }, { status: 201 });
  } catch (error) {
    console.error('Error creating budget:', error);
    return NextResponse.json({ error: 'Failed to create budget' }, { status: 500 });
  }
}