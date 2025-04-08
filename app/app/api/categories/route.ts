import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db'; // Adjust path as needed
import { expenses } from '@/lib/db/schema';
import { eq, and, gte, lte, desc } from 'drizzle-orm';
import { auth } from '@clerk/nextjs/server';

// GET handler to fetch all expenses
export async function GET(request: NextRequest) {
  try {
    // Use Clerk's auth() helper to get the userId
    const { userId } = await auth();
    
    // Protect the route
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const { searchParams } = new URL(request.url);
    
    // Parse query parameters
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const categoryId = searchParams.get('categoryId');
    const minAmount = searchParams.get('minAmount');
    const maxAmount = searchParams.get('maxAmount');
    
    // Build filters array
    const filters = [];
    
    // Add user filter - always filter by the authenticated user
    filters.push(eq(expenses.userId, userId));
    
    // Add optional filters
    if (startDate) {
      filters.push(gte(expenses.date, new Date(startDate)));
    }
    
    if (endDate) {
      filters.push(lte(expenses.date, new Date(endDate)));
    }
    
    if (categoryId) {
      filters.push(eq(expenses.categoryId, categoryId));
    }
    
    if (minAmount) {
      filters.push(gte(expenses.amount, parseFloat(minAmount)));
    }
    
    if (maxAmount) {
      filters.push(lte(expenses.amount, parseFloat(maxAmount)));
    }
    
    // Execute query with prepared filters
    const expensesList = await db
      .select()
      .from(expenses)
      .where(and(...filters))
      .orderBy(desc(expenses.date));
    
    return NextResponse.json({ expenses: expensesList });
  } catch (error) {
    console.error('Error fetching expenses:', error);
    return NextResponse.json({ error: 'Failed to fetch expenses' }, { status: 500 });
  }
}

// POST handler to create a new expense
export async function POST(request: NextRequest) {
  try {
    // Use Clerk's auth() helper to get the userId
    const { userId } = await auth();
    
    // Protect the route
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const body = await request.json();
    
    // Log the incoming data for debugging
    console.log('Received expense data:', JSON.stringify(body, null, 2));
    
    // Validate required fields
    const { amount, description, date, categoryId, paymentMethod, location } = body;
    
    console.log('Category ID type:', typeof categoryId);
    console.log('Category ID value:', categoryId);
    console.log('User ID value:', userId);
    
    if (!amount || !description || !date || !categoryId) {
      return NextResponse.json(
        { error: 'Missing required fields: amount, description, date, and categoryId are required' }, 
        { status: 400 }
      );
    }
    
    // TEMPORARY FIX: Use one static UUID for all categories
    // This will let us test if other parts of the form are working
    const staticCategoryId = '00000000-0000-0000-0000-000000000000';
    
    try {
      // Create new expense using the raw SQL approach
      const newExpense = await db
        .insert(expenses)
        .values({
          amount: parseFloat(amount),
          description,
          date: new Date(date),
          categoryId: staticCategoryId, // Use static UUID for now
          userId, // Use the Clerk userId
          paymentMethod: paymentMethod || null,
          location: location || null,
          isRecurring: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .returning();
      
      return NextResponse.json({ expense: newExpense[0] }, { status: 201 });
    } catch (dbError) {
      console.error('Database error details:', dbError);
      return NextResponse.json({ 
        error: 'Database error occurred', 
      }, { status: 500 });
    }
  } catch (error) {
    console.error('Error creating expense:', error);
    return NextResponse.json({ 
      error: 'Failed to create expense',
    }, { status: 500 });
  }
}