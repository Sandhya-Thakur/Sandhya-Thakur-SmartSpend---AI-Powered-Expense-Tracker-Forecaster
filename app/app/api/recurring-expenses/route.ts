// app/api/recurring-expenses/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { recurringExpenses, categories } from '@/lib/db/schema';
import { and, eq } from 'drizzle-orm';
import { getAuth } from '@clerk/nextjs/server';
import { v4 as uuidv4 } from 'uuid';

// GET: Fetch all recurring expenses for the current user
export async function GET(request: NextRequest) {
  try {
    const { userId } = getAuth(request);
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Check for query params if we want to filter by category
    const { searchParams } = new URL(request.url);
    const categoryId = searchParams.get('categoryId');
    const id = searchParams.get('id');
    
    // Build the where conditions
    let whereConditions = categoryId 
      ? and(eq(recurringExpenses.userId, userId), eq(recurringExpenses.categoryId, categoryId))
      : eq(recurringExpenses.userId, userId);
    
    // If we're looking for a specific ID, add that to the conditions
    if (id) {
      whereConditions = and(whereConditions, eq(recurringExpenses.id, id));
    }
    
    const recurringExpensesData = await db
      .select({
        id: recurringExpenses.id,
        amount: recurringExpenses.amount,
        description: recurringExpenses.description,
        frequency: recurringExpenses.frequency,
        startDate: recurringExpenses.startDate,
        endDate: recurringExpenses.endDate,
        categoryId: recurringExpenses.categoryId,
        categoryName: categories.name,
        categoryColor: categories.color,
        categoryIcon: categories.icon,
        createdAt: recurringExpenses.createdAt,
        updatedAt: recurringExpenses.updatedAt,
      })
      .from(recurringExpenses)
      .innerJoin(categories, eq(recurringExpenses.categoryId, categories.id))
      .where(whereConditions);
    
    return NextResponse.json({ recurringExpenses: recurringExpensesData });
  } catch (error) {
    console.error('Error fetching recurring expenses:', error);
    return NextResponse.json({ error: 'Failed to fetch recurring expenses' }, { status: 500 });
  }
}

// POST: Create a new recurring expense
export async function POST(request: NextRequest) {
  try {
    const { userId } = getAuth(request);
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const body = await request.json();
    
    // Validate required fields
    if (!body.amount || !body.description || !body.frequency || !body.startDate || !body.categoryId) {
      return NextResponse.json(
        { error: 'Missing required fields: amount, description, frequency, startDate, and categoryId are required' },
        { status: 400 }
      );
    }
    
    // Handle date formatting
    const startDate = new Date(body.startDate);
    const endDate = body.endDate ? new Date(body.endDate) : null;
    
    // Insert the new recurring expense
    const id = uuidv4();
    const now = new Date();
    
    await db.insert(recurringExpenses).values({
      id,
      amount: body.amount,
      description: body.description,
      frequency: body.frequency,
      startDate,
      endDate,
      categoryId: body.categoryId,
      userId,
      createdAt: now,
      updatedAt: now,
    });
    
    // Get the created recurring expense with category details
    const [createdRecurringExpense] = await db
      .select({
        id: recurringExpenses.id,
        amount: recurringExpenses.amount,
        description: recurringExpenses.description,
        frequency: recurringExpenses.frequency,
        startDate: recurringExpenses.startDate,
        endDate: recurringExpenses.endDate,
        categoryId: recurringExpenses.categoryId,
        categoryName: categories.name,
        categoryColor: categories.color,
        categoryIcon: categories.icon,
        createdAt: recurringExpenses.createdAt,
        updatedAt: recurringExpenses.updatedAt,
      })
      .from(recurringExpenses)
      .innerJoin(categories, eq(recurringExpenses.categoryId, categories.id))
      .where(and(eq(recurringExpenses.id, id), eq(recurringExpenses.userId, userId)));
    
    return NextResponse.json({
      message: 'Recurring expense created successfully',
      recurringExpense: createdRecurringExpense,
    });
  } catch (error) {
    console.error('Error creating recurring expense:', error);
    return NextResponse.json({ error: 'Failed to create recurring expense' }, { status: 500 });
  }
}

// PUT: Update an existing recurring expense
export async function PUT(request: NextRequest) {
  try {
    const { userId } = getAuth(request);
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const body = await request.json();
    
    // Ensure we have an ID to update
    if (!body.id) {
      return NextResponse.json({ error: 'Recurring expense ID is required' }, { status: 400 });
    }
    
    // Validate required fields
    if (!body.amount || !body.description || !body.frequency || !body.startDate || !body.categoryId) {
      return NextResponse.json(
        { error: 'Missing required fields: amount, description, frequency, startDate, and categoryId are required' },
        { status: 400 }
      );
    }
    
    // Handle date formatting
    const startDate = new Date(body.startDate);
    const endDate = body.endDate ? new Date(body.endDate) : null;
    
    // First check if the recurring expense exists and belongs to this user
    const existingRecurringExpense = await db
      .select({ id: recurringExpenses.id })
      .from(recurringExpenses)
      .where(and(eq(recurringExpenses.id, body.id), eq(recurringExpenses.userId, userId)));
    
    if (existingRecurringExpense.length === 0) {
      return NextResponse.json(
        { error: 'Recurring expense not found or you do not have permission to update it' },
        { status: 404 }
      );
    }
    
    // Update the recurring expense
    await db
      .update(recurringExpenses)
      .set({
        amount: body.amount,
        description: body.description,
        frequency: body.frequency,
        startDate,
        endDate,
        categoryId: body.categoryId,
        updatedAt: new Date(),
      })
      .where(and(eq(recurringExpenses.id, body.id), eq(recurringExpenses.userId, userId)));
    
    // Get the updated recurring expense with category details
    const [updatedRecurringExpense] = await db
      .select({
        id: recurringExpenses.id,
        amount: recurringExpenses.amount,
        description: recurringExpenses.description,
        frequency: recurringExpenses.frequency,
        startDate: recurringExpenses.startDate,
        endDate: recurringExpenses.endDate,
        categoryId: recurringExpenses.categoryId,
        categoryName: categories.name,
        categoryColor: categories.color,
        categoryIcon: categories.icon,
        createdAt: recurringExpenses.createdAt,
        updatedAt: recurringExpenses.updatedAt,
      })
      .from(recurringExpenses)
      .innerJoin(categories, eq(recurringExpenses.categoryId, categories.id))
      .where(and(eq(recurringExpenses.id, body.id), eq(recurringExpenses.userId, userId)));
    
    return NextResponse.json({
      message: 'Recurring expense updated successfully',
      recurringExpense: updatedRecurringExpense,
    });
  } catch (error) {
    console.error('Error updating recurring expense:', error);
    return NextResponse.json({ error: 'Failed to update recurring expense' }, { status: 500 });
  }
}

// DELETE: Remove a recurring expense
export async function DELETE(request: NextRequest) {
  try {
    const { userId } = getAuth(request);
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    
    if (!id) {
      return NextResponse.json({ error: 'Recurring expense ID is required' }, { status: 400 });
    }
    
    // First check if the recurring expense exists and belongs to this user
    const existingRecurringExpense = await db
      .select({ id: recurringExpenses.id })
      .from(recurringExpenses)
      .where(and(eq(recurringExpenses.id, id), eq(recurringExpenses.userId, userId)));
    
    if (existingRecurringExpense.length === 0) {
      return NextResponse.json(
        { error: 'Recurring expense not found or you do not have permission to delete it' },
        { status: 404 }
      );
    }
    
    // Delete the recurring expense
    await db
      .delete(recurringExpenses)
      .where(and(eq(recurringExpenses.id, id), eq(recurringExpenses.userId, userId)));
    
    return NextResponse.json({
      message: 'Recurring expense deleted successfully',
      id,
    });
  } catch (error) {
    console.error('Error deleting recurring expense:', error);
    return NextResponse.json({ error: 'Failed to delete recurring expense' }, { status: 500 });
  }
}