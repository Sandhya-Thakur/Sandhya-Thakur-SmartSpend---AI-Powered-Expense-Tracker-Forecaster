// app/api/expenses/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { expenses } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { getAuth } from '@clerk/nextjs/server';

// GET handler to fetch a specific expense by ID
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { userId } = getAuth(request);
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const { id } = params;
    
    const expense = await db
      .select()
      .from(expenses)
      .where(and(eq(expenses.id, id), eq(expenses.userId, userId)))
      .then(res => res[0] || null);
    
    if (!expense) {
      return NextResponse.json({ error: 'Expense not found' }, { status: 404 });
    }
    
    return NextResponse.json({ expense });
  } catch (error) {
    console.error('Error fetching expense:', error);
    return NextResponse.json({ error: 'Failed to fetch expense' }, { status: 500 });
  }
}

// PUT handler to update a specific expense
// Allows updating one or more fields
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { userId } = getAuth(request);
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const { id } = params;
    const body = await request.json();
    
    // Check if expense exists and belongs to the user
    const existingExpense = await db
      .select()
      .from(expenses)
      .where(and(eq(expenses.id, id), eq(expenses.userId, userId)))
      .then(res => res[0] || null);
    
    if (!existingExpense) {
      return NextResponse.json({ error: 'Expense not found' }, { status: 404 });
    }
    
    // Update fields that are provided - allowing partial updates
    const updates: any = {
      updatedAt: new Date(),
    };
    
    if (body.amount !== undefined) updates.amount = parseFloat(body.amount);
    if (body.description !== undefined) updates.description = body.description;
    if (body.date !== undefined) updates.date = new Date(body.date);
    if (body.categoryId !== undefined) updates.categoryId = body.categoryId; // Accept any categoryId without validation
    if (body.paymentMethod !== undefined) updates.paymentMethod = body.paymentMethod;
    if (body.location !== undefined) updates.location = body.location;
    if (body.isRecurring !== undefined) updates.isRecurring = body.isRecurring;
    
    const updatedExpense = await db
      .update(expenses)
      .set(updates)
      .where(and(eq(expenses.id, id), eq(expenses.userId, userId)))
      .returning();
    
    return NextResponse.json({ expense: updatedExpense[0] });
  } catch (error) {
    console.error('Error updating expense:', error);
    return NextResponse.json({ error: 'Failed to update expense' }, { status: 500 });
  }
}

// DELETE handler to delete a specific expense
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { userId } = getAuth(request);
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const { id } = params;
    
    // Check if expense exists and belongs to the user
    const existingExpense = await db
      .select()
      .from(expenses)
      .where(and(eq(expenses.id, id), eq(expenses.userId, userId)))
      .then(res => res[0] || null);
    
    if (!existingExpense) {
      return NextResponse.json({ error: 'Expense not found' }, { status: 404 });
    }
    
    // Delete the expense
    await db
      .delete(expenses)
      .where(and(eq(expenses.id, id), eq(expenses.userId, userId)));
    
    return NextResponse.json({ message: 'Expense deleted successfully' });
  } catch (error) {
    console.error('Error deleting expense:', error);
    return NextResponse.json({ error: 'Failed to delete expense' }, { status: 500 });
  }
}