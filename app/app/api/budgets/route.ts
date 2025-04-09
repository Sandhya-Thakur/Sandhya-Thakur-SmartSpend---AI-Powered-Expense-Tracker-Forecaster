// app/api/budgets/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { budgets, categories } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { getAuth } from '@clerk/nextjs/server';
import { nanoid } from 'nanoid';

// GET handler to fetch all budgets
export async function GET(request: NextRequest) {
  try {
    const { userId } = getAuth(request);
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Fetch all budgets for the user
    const userBudgets = await db
      .select()
      .from(budgets)
      .where(eq(budgets.userId, userId));
    
    // For each budget, get the category details if it exists
    const budgetsWithCategories = await Promise.all(
      userBudgets.map(async (budget) => {
        if (budget.categoryId) {
          const categoryDetails = await db
            .select()
            .from(categories)
            .where(eq(categories.id, budget.categoryId))
            .limit(1);
          
          if (categoryDetails.length > 0) {
            return {
              ...budget,
              category: categoryDetails[0]
            };
          }
        }
        
        return {
          ...budget,
          category: null
        };
      })
    );
    
    return NextResponse.json({ budgets: budgetsWithCategories });
  } catch (error) {
    console.error('Error fetching budgets:', error);
    return NextResponse.json({ error: 'Failed to fetch budgets' }, { status: 500 });
  }
}

// POST handler to create a new budget
export async function POST(request: NextRequest) {
  try {
    const { userId } = getAuth(request);
    
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
    
    // If categoryId is provided, check if it exists
    if (categoryId) {
      const categoryExists = await db
        .select()
        .from(categories)
        .where(and(
          eq(categories.id, categoryId),
          eq(categories.userId, userId)
        ))
        .limit(1);
      
      if (categoryExists.length === 0) {
        return NextResponse.json({ error: 'Category not found' }, { status: 404 });
      }
    }
    
    // Create new budget
    const newBudgetId = nanoid();
    const newBudget = await db
      .insert(budgets)
      .values({
        id: newBudgetId,
        amount: parseFloat(amount),
        period,
        startDate: new Date(startDate),
        categoryId: categoryId || null, // If categoryId is not provided, this will be an overall budget
        userId,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();
    
    return NextResponse.json({ budget: newBudget[0] }, { status: 201 });
  } catch (error) {
    console.error('Error creating budget:', error);
    return NextResponse.json({ 
      error: 'Failed to create budget',
    }, { status: 500 });
  }
}

// PUT handler to update a budget
export async function PUT(request: NextRequest) {
  try {
    const { userId } = getAuth(request);
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const body = await request.json();
    
    // Validate required fields
    const { id, amount, period, startDate, categoryId } = body;
    
    if (!id || !amount || !period || !startDate) {
      return NextResponse.json(
        { error: 'Missing required fields: id, amount, period, and startDate are required' }, 
        { status: 400 }
      );
    }
    
    // Check if budget exists and belongs to user
    const existingBudget = await db
      .select()
      .from(budgets)
      .where(and(
        eq(budgets.id, id),
        eq(budgets.userId, userId)
      ))
      .limit(1);
    
    if (existingBudget.length === 0) {
      return NextResponse.json({ error: 'Budget not found or not authorized' }, { status: 404 });
    }
    
    // If categoryId is provided, check if it exists
    if (categoryId) {
      const categoryExists = await db
        .select()
        .from(categories)
        .where(and(
          eq(categories.id, categoryId),
          eq(categories.userId, userId)
        ))
        .limit(1);
      
      if (categoryExists.length === 0) {
        return NextResponse.json({ error: 'Category not found' }, { status: 404 });
      }
    }
    
    // Update budget
    const updatedBudget = await db
      .update(budgets)
      .set({
        amount: parseFloat(amount),
        period,
        startDate: new Date(startDate),
        categoryId: categoryId || null,
        updatedAt: new Date(),
      })
      .where(eq(budgets.id, id))
      .returning();
    
    return NextResponse.json({ budget: updatedBudget[0] });
  } catch (error) {
    console.error('Error updating budget:', error);
    return NextResponse.json({ error: 'Failed to update budget' }, { status: 500 });
  }
}

// DELETE handler to delete a budget
export async function DELETE(request: NextRequest) {
  try {
    const { userId } = getAuth(request);
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    
    if (!id) {
      return NextResponse.json({ error: 'Missing budget ID' }, { status: 400 });
    }
    
    // Check if budget exists and belongs to user
    const existingBudget = await db
      .select()
      .from(budgets)
      .where(and(
        eq(budgets.id, id),
        eq(budgets.userId, userId)
      ))
      .limit(1);
    
    if (existingBudget.length === 0) {
      return NextResponse.json({ error: 'Budget not found or not authorized' }, { status: 404 });
    }
    
    // Delete budget
    await db
      .delete(budgets)
      .where(eq(budgets.id, id));
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting budget:', error);
    return NextResponse.json({ error: 'Failed to delete budget' }, { status: 500 });
  }
}