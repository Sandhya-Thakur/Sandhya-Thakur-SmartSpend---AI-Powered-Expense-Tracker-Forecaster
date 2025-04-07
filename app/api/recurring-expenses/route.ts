// app/api/recurring-expenses/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { recurringExpenses } from '@/lib/db/schema';
import { eq, desc, and, gte, or, sql } from 'drizzle-orm';
import { auth } from '@clerk/nextjs/server';

// GET handler to fetch all recurring expenses
export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const { searchParams } = new URL(request.url);
    
    // Parse query parameters
    const categoryId = searchParams.get('categoryId');
    const frequency = searchParams.get('frequency');
    const active = searchParams.get('active');
    
    // Build filters array
    const filters = [];
    
    // Add user filter - always filter by the authenticated user
    filters.push(eq(recurringExpenses.userId, userId));
    
    // Add optional filters
    if (categoryId) {
      filters.push(eq(recurringExpenses.categoryId, categoryId));
    }
    
    if (frequency) {
      filters.push(eq(recurringExpenses.frequency, frequency));
    }
    
    // Filter for active recurring expenses (those that haven't ended or have no end date)
    if (active === 'true') {
      const now = new Date();
      filters.push(
        // Either endDate is null or endDate is in the future
        or(
          sql`${recurringExpenses.endDate} IS NULL`,
          gte(recurringExpenses.endDate, now)
        )
      );
    }
    
    // Execute query with prepared filters
    const recurringExpensesList = await db
      .select()
      .from(recurringExpenses)
      .where(and(...filters))
      .orderBy(desc(recurringExpenses.startDate));
    
    return NextResponse.json({ recurringExpenses: recurringExpensesList });
  } catch (error) {
    console.error('Error fetching recurring expenses:', error);
    return NextResponse.json({ error: 'Failed to fetch recurring expenses' }, { status: 500 });
  }
}

// POST handler to create a new recurring expense
export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const body = await request.json();
    
    // Validate required fields
    const { amount, description, frequency, startDate, categoryId, endDate } = body;
    
    if (!amount || !description || !frequency || !startDate || !categoryId) {
      return NextResponse.json(
        { error: 'Missing required fields: amount, description, frequency, startDate, and categoryId are required' }, 
        { status: 400 }
      );
    }
    
    // Validate frequency value
    if (!['weekly', 'monthly', 'yearly'].includes(frequency)) {
      return NextResponse.json(
        { error: 'Invalid frequency value. Must be one of: weekly, monthly, yearly' }, 
        { status: 400 }
      );
    }
    
    // Create new recurring expense
    const newRecurringExpense = await db
      .insert(recurringExpenses)
      .values({
        amount: parseFloat(amount),
        description,
        frequency,
        startDate: new Date(startDate),
        endDate: endDate ? new Date(endDate) : null,
        categoryId,
        userId,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();
    
    return NextResponse.json({ recurringExpense: newRecurringExpense[0] }, { status: 201 });
  } catch (error) {
    console.error('Error creating recurring expense:', error);
    return NextResponse.json({ error: 'Failed to create recurring expense' }, { status: 500 });
  }
}