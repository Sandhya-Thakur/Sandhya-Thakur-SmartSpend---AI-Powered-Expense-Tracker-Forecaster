// app/api/recurring-expenses/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { recurringExpenses } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { auth } from '@clerk/nextjs/server';

// GET handler to fetch a specific recurring expense by ID
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const { id } = params;
    
    const recurringExpense = await db
      .select()
      .from(recurringExpenses)
      .where(and(eq(recurringExpenses.id, id), eq(recurringExpenses.userId, userId)))
      .then(res => res[0] || null);
    
    if (!recurringExpense) {
      return NextResponse.json({ error: 'Recurring expense not found' }, { status: 404 });
    }
    
    return NextResponse.json({ recurringExpense });
  } catch (error) {
    console.error('Error fetching recurring expense:', error);
    return NextResponse.json({ error: 'Failed to fetch recurring expense' }, { status: 500 });
  }
}

// PUT handler to update a specific recurring expense
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const { id } = params;
    const body = await request.json();
    
    // Check if recurring expense exists and belongs to the user
    const existingRecurringExpense = await db
      .select()
      .from(recurringExpenses)
      .where(and(eq(recurringExpenses.id, id), eq(recurringExpenses.userId, userId)))
      .then(res => res[0] || null);
    
    if (!existingRecurringExpense) {
      return NextResponse.json({ error: 'Recurring expense not found' }, { status: 404 });
    }
    
    // Update fields that are provided
    const updates: any = {
      updatedAt: new Date(),
    };
    
    if (body.amount !== undefined) updates.amount = parseFloat(body.amount);
    if (body.description !== undefined) updates.description = body.description;
    if (body.frequency !== undefined) {
      // Validate frequency value
      if (!['weekly', 'monthly', 'yearly'].includes(body.frequency)) {
        return NextResponse.json(
          { error: 'Invalid frequency value. Must be one of: weekly, monthly, yearly' }, 
          { status: 400 }
        );
      }
      updates.frequency = body.frequency;
    }
    if (body.startDate !== undefined) updates.startDate = new Date(body.startDate);
    if (body.endDate !== undefined) updates.endDate = body.endDate ? new Date(body.endDate) : null;
    if (body.categoryId !== undefined) updates.categoryId = body.categoryId;
    
    const updatedRecurringExpense = await db
      .update(recurringExpenses)
      .set(updates)
      .where(and(eq(recurringExpenses.id, id), eq(recurringExpenses.userId, userId)))
      .returning();
    
    return NextResponse.json({ recurringExpense: updatedRecurringExpense[0] });
  } catch (error) {
    console.error('Error updating recurring expense:', error);
    return NextResponse.json({ error: 'Failed to update recurring expense' }, { status: 500 });
  }
}

// DELETE handler to delete a specific recurring expense
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const { id } = params;
    
    // Check if recurring expense exists and belongs to the user
    const existingRecurringExpense = await db
      .select()
      .from(recurringExpenses)
      .where(and(eq(recurringExpenses.id, id), eq(recurringExpenses.userId, userId)))
      .then(res => res[0] || null);
    
    if (!existingRecurringExpense) {
      return NextResponse.json({ error: 'Recurring expense not found' }, { status: 404 });
    }
    
    // Delete the recurring expense
    await db
      .delete(recurringExpenses)
      .where(and(eq(recurringExpenses.id, id), eq(recurringExpenses.userId, userId)));
    
    return NextResponse.json({ message: 'Recurring expense deleted successfully' });
  } catch (error) {
    console.error('Error deleting recurring expense:', error);
    return NextResponse.json({ error: 'Failed to delete recurring expense' }, { status: 500 });
  }
}