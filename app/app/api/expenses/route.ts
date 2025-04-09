//app/api/expenses
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { expenses, categories } from '@/lib/db/schema';
import { eq, and, gte, lte, desc } from 'drizzle-orm';
import { getAuth } from '@clerk/nextjs/server';
import { nanoid } from 'nanoid';

// Helper function to find or create a default category
async function getDefaultCategoryId(userId: string) {
  try {
    // Try to find an existing default category for this user
    const existingCategories = await db
      .select()
      .from(categories)
      .where(eq(categories.userId, userId))
      .limit(1);
    
    if (existingCategories.length > 0) {
      return existingCategories[0].id;
    }
    
    // If no category exists, create a default one
    const newCategoryId = nanoid();
    const defaultCategory = await db
      .insert(categories)
      .values({
        id: newCategoryId,
        name: 'General',
        color: '#607D8B',
        icon: 'category',
        isDefault: true,
        userId: userId,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();
    
    return defaultCategory[0].id;
  } catch (error) {
    console.error('Error getting default category:', error);
    throw error;
  }
}

// GET handler to fetch all expenses
export async function GET(request: NextRequest) {
  try {
    // Use Clerk's getAuth() helper to get the userId
    const { userId } = getAuth(request);
    
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
    // Use Clerk's getAuth() helper to get the userId
    const { userId } = getAuth(request);
    
    // Protect the route
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const body = await request.json();
    
    // Validate required fields
    const { amount, description, date, categoryId, paymentMethod, location } = body;
    
    if (!amount || !description || !date) {
      return NextResponse.json(
        { error: 'Missing required fields: amount, description, and date are required' }, 
        { status: 400 }
      );
    }
    
    // Check if the provided category exists, if not create it
    let finalCategoryId: string;
    
    if (categoryId) {
      // Try to find the category
      const existingCategory = await db
        .select()
        .from(categories)
        .where(and(
          eq(categories.id, categoryId),
          eq(categories.userId, userId)
        ))
        .limit(1);
      
      if (existingCategory.length > 0) {
        // Category exists, use it
        finalCategoryId = categoryId;
      } else {
        // Category doesn't exist, create it using static category data
        type CategoryKey = 'food-dining' | 'transportation' | 'housing' | 'utilities' | 
                          'entertainment' | 'shopping' | 'healthcare' | 'personal' | 
                          'education' | 'other';
                          
        type CategoryDetails = {
          name: string;
          color: string;
          icon: string;
        };
        
        const staticCategoryMap: Record<CategoryKey, CategoryDetails> = {
          'food-dining': { name: 'Food & Dining', color: '#FF5722', icon: 'restaurant' },
          'transportation': { name: 'Transportation', color: '#2196F3', icon: 'car' },
          'housing': { name: 'Housing', color: '#4CAF50', icon: 'home' },
          'utilities': { name: 'Utilities', color: '#FFC107', icon: 'bolt' },
          'entertainment': { name: 'Entertainment', color: '#9C27B0', icon: 'movie' },
          'shopping': { name: 'Shopping', color: '#E91E63', icon: 'shopping-bag' },
          'healthcare': { name: 'Healthcare', color: '#00BCD4', icon: 'medical-services' },
          'personal': { name: 'Personal', color: '#795548', icon: 'person' },
          'education': { name: 'Education', color: '#3F51B5', icon: 'school' },
          'other': { name: 'Other', color: '#607D8B', icon: 'more-horiz' }
        };
        
        // Get category details or default to "Other" if category not in map
        const categoryDetails = staticCategoryMap[categoryId as CategoryKey] || 
          { name: 'Other', color: '#607D8B', icon: 'more-horiz' };
        
        // Create the category
        const newCategory = await db
          .insert(categories)
          .values({
            id: categoryId,
            name: categoryDetails.name,
            color: categoryDetails.color,
            icon: categoryDetails.icon,
            isDefault: false,
            userId: userId,
            createdAt: new Date(),
            updatedAt: new Date(),
          })
          .returning();
        
        finalCategoryId = newCategory[0].id;
      }
    } else {
      // No category provided, use default
      finalCategoryId = await getDefaultCategoryId(userId);
    }
    
    // Create new expense
    const newExpenseId = nanoid();
    const newExpense = await db
      .insert(expenses)
      .values({
        id: newExpenseId,
        amount: parseFloat(amount),
        description,
        date: new Date(date),
        categoryId: finalCategoryId,
        userId: userId,
        paymentMethod: paymentMethod || null,
        location: location || null,
        isRecurring: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();
    
    return NextResponse.json({ expense: newExpense[0] }, { status: 201 });
  } catch (error) {
    console.error('Error creating expense:', error);
    return NextResponse.json({ 
      error: 'Failed to create expense',
    }, { status: 500 });
  }
}
// PUT handler to update an expense
export async function PUT(request: NextRequest) {
  try {
    // Use Clerk's getAuth() helper to get the userId
    const { userId } = getAuth(request);
    
    // Protect the route
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const body = await request.json();
    
    // Validate required fields
    const { id, amount, description, date, categoryId } = body;
    
    if (!id || !amount || !description || !date) {
      return NextResponse.json(
        { error: 'Missing required fields: id, amount, description, and date are required' }, 
        { status: 400 }
      );
    }
    
    // Check if expense exists and belongs to user
    const existingExpense = await db
      .select()
      .from(expenses)
      .where(and(
        eq(expenses.id, id),
        eq(expenses.userId, userId)
      ))
      .limit(1);
    
    if (existingExpense.length === 0) {
      return NextResponse.json({ error: 'Expense not found or not authorized' }, { status: 404 });
    }
    
    // Update expense
    const updatedExpense = await db
      .update(expenses)
      .set({
        amount: parseFloat(amount),
        description,
        date: new Date(date),
        categoryId: categoryId || existingExpense[0].categoryId,
        paymentMethod: body.paymentMethod || existingExpense[0].paymentMethod,
        location: body.location || existingExpense[0].location,
        updatedAt: new Date(),
      })
      .where(eq(expenses.id, id))
      .returning();
    
    return NextResponse.json({ expense: updatedExpense[0] });
  } catch (error) {
    console.error('Error updating expense:', error);
    return NextResponse.json({ error: 'Failed to update expense' }, { status: 500 });
  }
}

// DELETE handler to delete an expense
export async function DELETE(request: NextRequest) {
  try {
    // Use Clerk's getAuth() helper to get the userId
    const { userId } = getAuth(request);
    
    // Protect the route
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    
    if (!id) {
      return NextResponse.json({ error: 'Missing expense ID' }, { status: 400 });
    }
    
    // Check if expense exists and belongs to user
    const existingExpense = await db
      .select()
      .from(expenses)
      .where(and(
        eq(expenses.id, id),
        eq(expenses.userId, userId)
      ))
      .limit(1);
    
    if (existingExpense.length === 0) {
      return NextResponse.json({ error: 'Expense not found or not authorized' }, { status: 404 });
    }
    
    // Delete expense
    await db
      .delete(expenses)
      .where(eq(expenses.id, id));
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting expense:', error);
    return NextResponse.json({ error: 'Failed to delete expense' }, { status: 500 });
  }
}