// lib/utils.ts

/**
 * Format a number as currency
 */
export function formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  }
  
  /**
   * Format a date to a readable string
   */
  export function formatDate(date: Date): string {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: 'numeric'
    }).format(date);
  }
  
  /**
   * Calculate whether a percentage change is considered good or bad
   * For expenses, lower is better (green)
   */
  export function getTrendColor(percentChange: number, isExpense = true): 'green' | 'yellow' | 'red' {
    if (isExpense) {
      // For expenses: negative change (reduction) is good
      if (percentChange <= -10) return 'green';
      if (percentChange >= 10) return 'red';
      return 'yellow';
    } else {
      // For income/savings: positive change is good
      if (percentChange >= 10) return 'green';
      if (percentChange <= -10) return 'red';
      return 'yellow';
    }
  }