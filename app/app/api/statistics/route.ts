// app/api/statistics/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { expenses, categories, budgets, recurringExpenses } from '@/lib/db/schema';
import { eq, and, gte, lte, sql, count, desc, lt, or, isNull } from 'drizzle-orm';
import { getAuth } from '@clerk/nextjs/server';
import { format, startOfMonth, subMonths } from 'date-fns';

export async function GET(request: NextRequest) {
  try {
    const { userId } = getAuth(request);
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const { searchParams } = new URL(request.url);
    
    // Parse query parameters for date range
    const startDate = searchParams.get('startDate') || new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();
    const endDate = searchParams.get('endDate') || new Date().toISOString();
    
    // Calculate total expenses in the period
    const totalExpensesResult = await db
      .select({ total: sql<number>`sum(${expenses.amount})` })
      .from(expenses)
      .where(
        and(
          eq(expenses.userId, userId),
          gte(expenses.date, new Date(startDate)),
          lte(expenses.date, new Date(endDate))
        )
      );
    
    const totalExpenses = totalExpensesResult[0]?.total || 0;
    
    // Count total number of transactions for average calculation
    const transactionCountResult = await db
      .select({ count: count() })
      .from(expenses)
      .where(
        and(
          eq(expenses.userId, userId),
          gte(expenses.date, new Date(startDate)),
          lte(expenses.date, new Date(endDate))
        )
      );
    
    const transactionCount = transactionCountResult[0]?.count || 0;
    
    // Calculate average expense (handle division by zero)
    const averageExpense = transactionCount > 0 ? totalExpenses / transactionCount : 0;
    
    // Get expenses by category
    const expensesByCategory = await db
      .select({
        categoryId: categories.id,
        categoryName: categories.name,
        categoryColor: categories.color,
        categoryIcon: categories.icon,
        total: sql<number>`sum(${expenses.amount})`,
        count: count(expenses.id),
      })
      .from(expenses)
      .innerJoin(categories, eq(expenses.categoryId, categories.id))
      .where(
        and(
          eq(expenses.userId, userId),
          gte(expenses.date, new Date(startDate)),
          lte(expenses.date, new Date(endDate))
        )
      )
      .groupBy(categories.id, categories.name, categories.color, categories.icon);
    
    // Calculate percentages for each category
    const categoriesWithPercentage = expensesByCategory.map(cat => ({
      ...cat,
      percentage: totalExpenses > 0 ? (cat.total / totalExpenses) * 100 : 0,
    }));
    
    // Monthly data for time series
    const currentMonthStart = startOfMonth(new Date());
    const previousMonthStart = startOfMonth(subMonths(new Date(), 1));
    
    // Get current month expenses
    const currentMonthResult = await db
      .select({ total: sql<number>`sum(${expenses.amount})` })
      .from(expenses)
      .where(
        and(
          eq(expenses.userId, userId),
          gte(expenses.date, currentMonthStart),
          lte(expenses.date, new Date())
        )
      );
    
    // Get previous month expenses
    const previousMonthResult = await db
      .select({ total: sql<number>`sum(${expenses.amount})` })
      .from(expenses)
      .where(
        and(
          eq(expenses.userId, userId),
          gte(expenses.date, previousMonthStart),
          lt(expenses.date, currentMonthStart) // Changed to < (lt) to avoid overlap
        )
      );
    
    const currentMonthTotal = currentMonthResult[0]?.total || 0;
    const previousMonthTotal = previousMonthResult[0]?.total || 0;
    
    // Calculate monthly change percentage
    let monthlyChange = 0;
    if (previousMonthTotal > 0) {
      monthlyChange = ((currentMonthTotal - previousMonthTotal) / previousMonthTotal) * 100;
    }
    
    // Create time series data
    const months = [];
    let currentDate = startOfMonth(new Date(startDate));
    const end = new Date(endDate);
    
    while (currentDate <= end) {
      months.push(format(currentDate, 'yyyy-MM-01'));
      currentDate.setMonth(currentDate.getMonth() + 1);
    }
    
    const expensesOverTime = await Promise.all(
      months.map(async (monthStr) => {
        const monthStart = new Date(monthStr);
        const nextMonth = new Date(monthStart);
        nextMonth.setMonth(nextMonth.getMonth() + 1);
        
        const result = await db
          .select({
            total: sql<number>`sum(${expenses.amount})`,
            count: count(expenses.id),
          })
          .from(expenses)
          .where(
            and(
              eq(expenses.userId, userId),
              gte(expenses.date, monthStart),
              lte(expenses.date, new Date(nextMonth.getTime() - 1)) // end of month
            )
          );
        
        return {
          month: monthStr,
          total: result[0]?.total || 0,
          count: result[0]?.count || 0,
        };
      })
    );
    
    // Get top expenses
    const topExpenses = await db
      .select({
        id: expenses.id,
        amount: expenses.amount,
        description: expenses.description,
        date: expenses.date,
        categoryId: categories.id,
        categoryName: categories.name,
        categoryColor: categories.color,
        categoryIcon: categories.icon,
      })
      .from(expenses)
      .innerJoin(categories, eq(expenses.categoryId, categories.id))
      .where(
        and(
          eq(expenses.userId, userId),
          gte(expenses.date, new Date(startDate)),
          lte(expenses.date, new Date(endDate))
        )
      )
      .orderBy(desc(expenses.amount))
      .limit(5);
    
    // Get all budgets for the user
    const userBudgets = await db
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
        eq(budgets.userId, userId)
      );

    // Calculate budget utilization
    const budgetUtilization = await Promise.all(
      userBudgets.map(async (budget) => {
        // Determine date range for this budget based on period
        let budgetStartDate = new Date(budget.startDate);
        let budgetEndDate = new Date();
        
        // Adjust current period based on budget.period
        if (budget.period === 'monthly') {
          budgetStartDate = new Date(budgetEndDate.getFullYear(), budgetEndDate.getMonth(), 1);
        } else if (budget.period === 'yearly') {
          budgetStartDate = new Date(budgetEndDate.getFullYear(), 0, 1);
        } else if (budget.period === 'weekly') {
          const day = budgetEndDate.getDay();
          budgetStartDate = new Date(budgetEndDate);
          budgetStartDate.setDate(budgetStartDate.getDate() - day);
        }
        
        // Get expenses for this budget with or without category filter
        let spentAmount = 0;
        if (budget.categoryId) {
          // With category filter
          const expensesResult = await db
            .select({
              total: sql<number>`sum(${expenses.amount})`,
              count: count(),
            })
            .from(expenses)
            .where(
              and(
                eq(expenses.userId, userId),
                eq(expenses.categoryId, budget.categoryId),
                gte(expenses.date, budgetStartDate),
                lte(expenses.date, budgetEndDate)
              )
            );
          spentAmount = expensesResult[0]?.total || 0;
        } else {
          // Without category filter (overall budget)
          const expensesResult = await db
            .select({
              total: sql<number>`sum(${expenses.amount})`,
              count: count(),
            })
            .from(expenses)
            .where(
              and(
                eq(expenses.userId, userId),
                gte(expenses.date, budgetStartDate),
                lte(expenses.date, budgetEndDate)
              )
            );
          spentAmount = expensesResult[0]?.total || 0;
        }
        
        // Get recurring expenses that apply to this budget with or without category filter
        let recurringTotal = 0;
        if (budget.categoryId) {
          // With category filter
          const recurringResult = await db
            .select({
              total: sql<number>`sum(${recurringExpenses.amount})`,
            })
            .from(recurringExpenses)
            .where(
              and(
                eq(recurringExpenses.userId, userId),
                eq(recurringExpenses.categoryId, budget.categoryId),
                lte(recurringExpenses.startDate, budgetEndDate),
                or(
                  isNull(recurringExpenses.endDate),
                  gte(recurringExpenses.endDate, budgetStartDate)
                )
              )
            );
          recurringTotal = recurringResult[0]?.total || 0;
        } else {
          // Without category filter (overall budget)
          const recurringResult = await db
            .select({
              total: sql<number>`sum(${recurringExpenses.amount})`,
            })
            .from(recurringExpenses)
            .where(
              and(
                eq(recurringExpenses.userId, userId),
                lte(recurringExpenses.startDate, budgetEndDate),
                or(
                  isNull(recurringExpenses.endDate),
                  gte(recurringExpenses.endDate, budgetStartDate)
                )
              )
            );
          recurringTotal = recurringResult[0]?.total || 0;
        }
        
        // Calculate remaining amount and utilization percentage
        const remainingAmount = budget.amount - spentAmount;
        const utilizationPercentage = (spentAmount / budget.amount) * 100;
        
        return {
          budgetId: budget.id,
          categoryId: budget.categoryId,
          categoryName: budget.categoryId ? budget.categoryName : 'Overall Budget',
          categoryColor: budget.categoryColor,
          categoryIcon: budget.categoryIcon,
          budgetAmount: budget.amount,
          period: budget.period,
          spentAmount,
          recurringTotal,
          remainingAmount,
          utilizationPercentage,
          overBudget: utilizationPercentage > 100,
        };
      })
    );
    
    const statistics = {
      totalExpenses,
      expensesByCategory: categoriesWithPercentage,
      expensesOverTime,
      budgetUtilization,
      topExpenses: topExpenses.map(expense => ({
        ...expense,
        date: expense.date.toISOString(),
      })),
      averageExpense,
      monthlyChange,
      periodStart: startDate,
      periodEnd: endDate,
    };
    
    return NextResponse.json({ statistics });
  } catch (error) {
    console.error('Error generating statistics:', error);
    return NextResponse.json({ error: 'Failed to generate statistics' }, { status: 500 });
  }
}