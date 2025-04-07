// app/api/statistics/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { expenses, categories, budgets, recurringExpenses } from '@/lib/db/schema';
import { eq, and, gte, lte, sql, sum, count, desc, or } from 'drizzle-orm';
import { auth } from '@clerk/nextjs/server';

// GET handler to fetch expense statistics and analytics
export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const { searchParams } = new URL(request.url);
    
    // Parse query parameters for date range
    const startDate = searchParams.get('startDate') || new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();
    const endDate = searchParams.get('endDate') || new Date().toISOString();
    
    // Calculate total expenses in the period
    const totalExpensesResult = await db
      .select({ total: sum(expenses.amount) })
      .from(expenses)
      .where(
        and(
          eq(expenses.userId, userId),
          gte(expenses.date, new Date(startDate)),
          lte(expenses.date, new Date(endDate))
        )
      );
    
    const totalExpenses = totalExpensesResult[0]?.total || 0;
    
    // Calculate expenses by category
    const expensesByCategory = await db
      .select({
        categoryId: expenses.categoryId,
        categoryName: categories.name,
        categoryColor: categories.color,
        categoryIcon: categories.icon,
        total: sum(expenses.amount),
        count: count(expenses.id),
        percentage: sql`ROUND((SUM(${expenses.amount}) * 100.0 / NULLIF(${totalExpenses}, 0))::numeric, 2)`,
      })
      .from(expenses)
      .leftJoin(categories, eq(expenses.categoryId, categories.id))
      .where(
        and(
          eq(expenses.userId, userId),
          gte(expenses.date, new Date(startDate)),
          lte(expenses.date, new Date(endDate))
        )
      )
      .groupBy(expenses.categoryId, categories.name, categories.color, categories.icon)
      .orderBy(desc(sum(expenses.amount)));
    
    // Calculate expenses over time (monthly)
    const expensesOverTime = await db
      .select({
        month: sql`to_char(date_trunc('month', ${expenses.date}), 'YYYY-MM-DD')`,
        total: sum(expenses.amount),
        count: count(expenses.id),
      })
      .from(expenses)
      .where(
        and(
          eq(expenses.userId, userId),
          gte(expenses.date, new Date(new Date(startDate).getFullYear() - 1, new Date(startDate).getMonth(), 1)),
          lte(expenses.date, new Date(endDate))
        )
      )
      .groupBy(sql`date_trunc('month', ${expenses.date})`)
      .orderBy(sql`date_trunc('month', ${expenses.date})`);
    
    // Get categories that have no expenses in the period
    const allCategories = await db
      .select()
      .from(categories)
      .where(eq(categories.userId, userId));
    
    const categoriesWithoutExpenses = allCategories.filter(
      category => !expensesByCategory.some(expCat => expCat.categoryId === category.id)
    ).map(category => ({
      categoryId: category.id,
      categoryName: category.name,
      categoryColor: category.color,
      categoryIcon: category.icon,
      total: 0,
      count: 0,
      percentage: 0,
    }));
    
    // Combine categories with and without expenses
    const allExpensesByCategory = [...expensesByCategory, ...categoriesWithoutExpenses];
    
    // Get top expenses for the period
    const topExpenses = await db
      .select({
        id: expenses.id,
        amount: expenses.amount,
        description: expenses.description,
        date: expenses.date,
        categoryId: expenses.categoryId,
        categoryName: categories.name,
        categoryColor: categories.color,
        categoryIcon: categories.icon,
      })
      .from(expenses)
      .leftJoin(categories, eq(expenses.categoryId, categories.id))
      .where(
        and(
          eq(expenses.userId, userId),
          gte(expenses.date, new Date(startDate)),
          lte(expenses.date, new Date(endDate))
        )
      )
      .orderBy(desc(expenses.amount))
      .limit(10);
    
    // Get budget information for comparison
    const budgetsData = await db
      .select({
        id: budgets.id,
        amount: budgets.amount,
        period: budgets.period,
        startDate: budgets.startDate,
        categoryId: budgets.categoryId,
        categoryName: categories.name,
        categoryColor: categories.color,
        categoryIcon: categories.icon,
      })
      .from(budgets)
      .leftJoin(categories, eq(budgets.categoryId, categories.id))
      .where(
        and(
          eq(budgets.userId, userId),
          lte(budgets.startDate, new Date(endDate))
        )
      );
    
    // Calculate budget utilization
    const budgetUtilization = await Promise.all(budgetsData.map(async budget => {
      let relevantExpenses;
      const budgetAmountNum = Number(budget.amount);
      
      if (budget.categoryId) {
        // Category-specific budget
        relevantExpenses = expensesByCategory.find(exp => exp.categoryId === budget.categoryId);
        const totalSpent = relevantExpenses ? Number(relevantExpenses.total) : 0;
        
        // Calculate monthly recurring expenses for this category
        const recurringTotal = await calculateRecurringExpenseTotal(userId, budget.categoryId);
        const recurringTotalNum = Number(recurringTotal);
        
        const percentage = budgetAmountNum > 0 ? (totalSpent / budgetAmountNum) * 100 : 0;
        
        return {
          budgetId: budget.id,
          categoryId: budget.categoryId,
          categoryName: budget.categoryName,
          categoryColor: budget.categoryColor,
          categoryIcon: budget.categoryIcon,
          budgetAmount: budgetAmountNum,
          period: budget.period,
          spentAmount: totalSpent,
          recurringTotal: recurringTotalNum,
          remainingAmount: budgetAmountNum - totalSpent,
          utilizationPercentage: percentage,
          overBudget: percentage > 100,
        };
      } else {
        // Overall budget
        const totalSpent = expensesByCategory.reduce((sum, exp) => sum + Number(exp.total), 0);
        
        // Calculate total monthly recurring expenses
        const recurringTotal = await calculateRecurringExpenseTotal(userId);
        const recurringTotalNum = Number(recurringTotal);
        
        const percentage = budgetAmountNum > 0 ? (totalSpent / budgetAmountNum) * 100 : 0;
        
        return {
          budgetId: budget.id,
          categoryId: null,
          categoryName: 'Overall',
          categoryColor: null,
          categoryIcon: null,
          budgetAmount: budgetAmountNum,
          period: budget.period,
          spentAmount: totalSpent,
          recurringTotal: recurringTotalNum,
          remainingAmount: budgetAmountNum - totalSpent,
          utilizationPercentage: percentage,
          overBudget: percentage > 100,
        };
      }
    }));
    
    // Calculate average expense amount
    const expenseCount = expensesByCategory.reduce((sum, category) => sum + Number(category.count), 0) || 1;
    const totalExpensesNum = Number(totalExpenses);
    const averageExpense = totalExpensesNum / expenseCount;
    
    // Get expense trends (month-over-month comparison)
    const currentMonthExpenses = totalExpenses;
    
    // Get previous month expenses
    const previousMonthStart = new Date(new Date(startDate).getFullYear(), new Date(startDate).getMonth() - 1, 1);
    const previousMonthEnd = new Date(new Date(startDate).getFullYear(), new Date(startDate).getMonth(), 0);
    
    const previousMonthExpensesResult = await db
      .select({ total: sum(expenses.amount) })
      .from(expenses)
      .where(
        and(
          eq(expenses.userId, userId),
          gte(expenses.date, previousMonthStart),
          lte(expenses.date, previousMonthEnd)
        )
      );
    
    const previousMonthExpenses = previousMonthExpensesResult[0]?.total || 0;
    
    // Calculate month-over-month change
    const currentMonthExpensesNum = Number(currentMonthExpenses);
    const previousMonthExpensesNum = Number(previousMonthExpenses);
    const monthlyChange = previousMonthExpensesNum > 0
      ? ((currentMonthExpensesNum - previousMonthExpensesNum) / previousMonthExpensesNum) * 100 
      : 100; // If previous month is 0, consider it 100% increase
    
    // Compile statistics
    const statistics = {
      totalExpenses,
      expensesByCategory: allExpensesByCategory,
      expensesOverTime,
      topExpenses,
      budgetUtilization,
      averageExpense,
      monthlyChange,
      periodStart: new Date(startDate),
      periodEnd: new Date(endDate),
    };
    
    return NextResponse.json({ statistics });
  } catch (error) {
    console.error('Error generating statistics:', error);
    return NextResponse.json({ error: 'Failed to generate statistics' }, { status: 500 });
  }
}

// Helper function to calculate recurring expense totals
async function calculateRecurringExpenseTotal(userId: string, categoryId?: string) {
  const filters = [eq(recurringExpenses.userId, userId)];
  
  if (categoryId) {
    filters.push(eq(recurringExpenses.categoryId, categoryId));
  }
  
  const recurringResult = await db
    .select({ total: sum(recurringExpenses.amount) })
    .from(recurringExpenses)
    .where(
      and(
        ...filters,
        // Only include active recurring expenses
        or(
          sql`${recurringExpenses.endDate} IS NULL`,
          gte(recurringExpenses.endDate, new Date())
        )
      )
    );
  
  return recurringResult[0]?.total || 0;
}